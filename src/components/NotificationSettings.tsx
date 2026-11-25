import { useEffect, useState } from "react";
import { BellRing, Volume2, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";
import { PUSH_HELP, pushState, turnPushOff, turnPushOn, type PushState } from "@/lib/push";
import { playSound, setSoundsOn, soundsOn } from "@/lib/sounds";

const Row = ({ Icon, title, text, children }: { Icon: typeof Mail; title: string; text: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-4 border-t border-line first:border-t-0 first:pt-0">
    <span className="w-10 h-10 shrink-0 rounded-full bg-paper-2 border border-line flex items-center justify-center">
      <Icon className="w-4 h-4 text-brass-deep" />
    </span>
    <div className="flex-1 min-w-0">
      <p className="font-body text-[15px] font-semibold text-ink">{title}</p>
      <p className="font-body text-sm text-slate mt-0.5">{text}</p>
    </div>
    <div className="pt-1">{children}</div>
  </div>
);

/** Profile card: phone notifications, sounds, and email as a fallback. */
export const NotificationSettings = ({ emailOn, onEmail }: { emailOn: boolean | null; onEmail: (on: boolean) => void }) => {
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [sounds, setSounds] = useState(soundsOn);

  useEffect(() => {
    pushState().then(setPush).catch(() => setPush("unsupported"));
  }, []);

  const togglePush = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await turnPushOn() : await turnPushOff();
      setPush(next);
      if (on && next === "on") toast({ title: "Notifications on", description: "You'll get a notification on this device when something happens." });
      else if (on && next !== "on") toast({ title: "Notifications not turned on", description: PUSH_HELP[next], variant: "destructive" });
    } catch (e) {
      toast({ title: "Couldn't turn on notifications", description: errMsg(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleSounds = (on: boolean) => {
    setSoundsOn(on);
    setSounds(on);
    if (on) playSound("notify");
  };

  return (
    <div className="bg-card rounded-2xl border border-line p-6 md:p-8 mt-6">
      <h2 className="font-display text-xl text-ink">Notifications</h2>
      <p className="font-body text-sm text-slate mt-1 mb-5">How Eban lets you know about bookings, payments, hand-overs and messages.</p>
      <Row Icon={BellRing} title="Notifications on this device" text={push ? PUSH_HELP[push] : "Checking..."}>
        <Switch
          checked={push === "on"}
          disabled={busy || push === null || push === "unsupported" || push === "install-first"}
          onCheckedChange={togglePush}
          aria-label="Notifications on this device"
        />
      </Row>
      <Row Icon={Volume2} title="Sounds" text="A soft chime for new notifications and when something you do goes through.">
        <Switch checked={sounds} onCheckedChange={toggleSounds} aria-label="Sounds" />
      </Row>
      <Row Icon={Mail} title="Important emails" text="Only for important things: your ID and face check results, refunds, payouts and reported problems.">
        <Switch checked={emailOn ?? true} disabled={emailOn === null} onCheckedChange={onEmail} aria-label="Important emails" />
      </Row>
    </div>
  );
};
