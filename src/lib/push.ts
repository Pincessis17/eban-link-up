import { supabase } from "@/integrations/supabase/client";

/**
 * Phone and computer notifications (web push), like Instagram's.
 * The public key is meant to be public; its private partner lives only in Supabase secrets.
 */
const PUBLIC_KEY = "BO3xp6FW4n9vForFa7TRNytkcHw2MM0M9SfcoUUd7gA_FBs6A_jCQmsx6mDdsgRQhbbONanWBGCqsThO4vHomsc";

export type PushState = "unsupported" | "install-first" | "blocked" | "on" | "off";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const keyBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const registration = async () => {
  // In production the app registers /sw.js on load; this also covers the first visit.
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
};

export async function pushState(): Promise<PushState> {
  // iPhones only allow notifications for apps added to the Home Screen.
  if (isIos() && !isInstalled()) return "install-first";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export async function turnPushOn(): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "install-first" || state === "blocked") return state;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await (supabase as any).rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return "on";
}

export async function turnPushOff(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await (supabase as any).rpc("remove_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

/** Keeps this device's registration up to date after sign-in (browsers sometimes renew it). */
export async function refreshPushRegistration() {
  try {
    if ((await pushState()) !== "on") return;
    await turnPushOn();
  } catch { /* not important */ }
}

/** Removes this device before signing out, so the next person on it doesn't get your notifications. */
export async function forgetThisDevice() {
  try { await turnPushOff(); } catch { /* ignore */ }
}

export const PUSH_HELP: Record<PushState, string> = {
  on: "You'll get a notification on this device, even when Eban is closed.",
  off: "Get a notification on this device when something happens, like Instagram does.",
  blocked: "Notifications are blocked for Eban in this browser. Allow them in your browser's site settings, then try again.",
  "install-first": "On iPhone, add Eban to your Home Screen first: tap Share, then Add to Home Screen. Open Eban from there and turn this on.",
  unsupported: "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.",
};
