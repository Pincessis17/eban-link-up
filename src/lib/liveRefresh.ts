import { useEffect, useRef, useState } from "react";

/**
 * Live updates without a page refresh.
 *
 * Almost every change on Eban (a request accepted, a payment confirmed, an ID approved, a message) creates
 * a notification for the people involved, and the bell already listens for those live. When one arrives,
 * the bell calls emitLiveChange(), and every page using the hooks below quietly reloads its data.
 * Pages also reload when the person comes back to the tab or reconnects, in case they missed something.
 */
const EVENT = "eban:live-change";

export const emitLiveChange = () => {
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ }
};

const subscribe = (fire: () => void) => {
  let timer: number | undefined;
  // Several bells can hear the same notification; wait a moment so the page reloads once.
  const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(fire, 400); };
  const onVisible = () => { if (document.visibilityState === "visible") soon(); };
  window.addEventListener(EVENT, soon);
  window.addEventListener("focus", soon);
  window.addEventListener("online", soon);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener(EVENT, soon);
    window.removeEventListener("focus", soon);
    window.removeEventListener("online", soon);
    document.removeEventListener("visibilitychange", onVisible);
  };
};

/** Calls `reload` whenever something changes. Use with a page's load function. */
export function useLiveRefresh(reload: () => unknown) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => subscribe(() => { void ref.current(); }), []);
}

/** A number that goes up whenever something changes. Add it to a data-loading effect's dependencies. */
export function useLiveTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}
