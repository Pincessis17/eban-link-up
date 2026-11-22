import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Play, Pause, StepForward, RotateCcw, LogIn, CheckCircle2, Circle, Loader2, XCircle, Package, Plane, ShieldCheck } from "lucide-react";
import { IS_TEST_SITE } from "@/lib/env";
import NotFound from "@/pages/NotFound";

/* ------------------------------------------------------------------ *
 * Eban simulator (test site only).
 * Three real app screens, each signed in as a different test person.
 * "Play" walks a parcel through the journey using the exact same
 * database actions the app's buttons use, and refreshes the screens
 * after every step so you can watch it happen.
 * ------------------------------------------------------------------ */

type Role = "sender" | "traveller" | "admin";

const PEOPLE: Record<Role, { email: string; name: string; label: string; home: string; Icon: typeof Package }> = {
  sender: { email: "sender@example.com", name: "Kwame", label: "Sender", home: "/sender/requests", Icon: Package },
  traveller: { email: "traveller@example.com", name: "Ama", label: "Traveller", home: "/traveler", Icon: Plane },
  admin: { email: "admin@example.com", name: "Efua", label: "Eban admin", home: "/admin/payments", Icon: ShieldCheck },
};
const ROLES: Role[] = ["sender", "traveller", "admin"];
const frameName = (r: Role) => `eban-sim-${r}`;

type Ctx = {
  db: Record<Role, SupabaseClient>;
  ids: Record<Role, string>;
  tripId?: string;
  requestId?: string;
  matchId?: string;
  bagId?: string;
};

type Step = {
  who: Role | "both";
  title: string;
  say: string;
  run: (c: Ctx) => Promise<void>;
  /** Pages each screen should show after this step. */
  show: (c: Ctx) => Partial<Record<Role, string>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const must = async (p: PromiseLike<any>): Promise<unknown> => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
};

/** Draws a small labelled picture and records it as a receipt/photo, the way the real upload does. */
const simEvidence = async (db: any, userId: string, requestId: string, kind: string, label: string, color: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 320;
  const g = canvas.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, 480, 320);
  g.fillStyle = "#FBF8F1";
  g.font = "bold 28px Georgia";
  g.fillText("EBAN SIMULATOR", 24, 60);
  g.font = "22px Arial";
  g.fillText(label, 24, 120);
  g.fillText(new Date().toLocaleString(), 24, 160);
  const blob = await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), "image/png"));
  const path = `${userId}/${requestId}/${kind}-${Date.now()}.png`;
  await must(db.storage.from("request-evidence").upload(path, blob, { contentType: "image/png" }));
  await must(db.rpc("add_request_evidence", { p_request: requestId, p_kind: kind, p_path: path, p_note: kind === "payment_proof" ? "SIM-MOMO-0001" : null }));
};


const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ---------- shared opening: trip → booking → accept → chat → pay → confirm ---------- */
const opening: Step[] = [
  {
    who: "traveller",
    title: "Ama posts a trip",
    say: "Ama is flying Accra → London next week with 10 kg spare. She sets her own price: $10 per kg.",
    run: async (c) => {
      const tp = await must(c.db.traveller.from("traveller_profiles").select("id").eq("user_id", c.ids.traveller).single());
      const trip = await must(
        c.db.traveller
          .from("trips")
          .insert({
            traveller_id: (tp as { id: string }).id,
            origin_country: "Ghana", origin_city: "Accra",
            destination_country: "United Kingdom", destination_city: "London",
            departure_date: inDays(7), arrival_date: inDays(8),
            capacity_kg: 10, available_kg: 10, price_per_kg: 10,
            restricted_item_preferences: "SIM: no liquids over 100 ml", status: "open",
          })
          .select("id")
          .single()
      );
      c.tripId = (trip as { id: string }).id;
    },
    show: () => ({ traveller: "/traveler", sender: "/sender/trips" }),
  },
  {
    who: "sender",
    title: "Kwame books space",
    say: "Kwame finds Ama's trip and books 2 kg for a parcel of clothes. The price is fixed: 2 kg × $10 = $20.",
    run: async (c) => {
      c.requestId = (await must(
        c.db.sender.rpc("book_trip", {
          p_trip_id: c.tripId, p_item_type: "Clothing",
          p_item_description: "SIM: Two kente dresses for a wedding", p_weight_kg: 2, p_item_value: 120, p_flags: ["fragile"],
        })
      )) as string;
      const m = await must(c.db.traveller.from("matches").select("id").eq("request_id", c.requestId).single());
      c.matchId = (m as { id: string }).id;
    },
    show: (c) => ({ sender: `/sender/requests/${c.requestId}`, traveller: "/traveler/requests" }),
  },
  {
    who: "traveller",
    title: "Ama accepts",
    say: "Ama opens the booking and accepts it. Kwame now has 48 hours to pay, and they can chat.",
    run: async (c) => {
      await must(c.db.traveller.from("matches").update({ status: "accepted" }).eq("id", c.matchId));
      await must(c.db.traveller.from("delivery_requests").update({ status: "accepted_by_traveller" }).eq("id", c.requestId));
    },
    show: (c) => ({ traveller: `/traveler/requests/${c.matchId}`, sender: `/sender/requests/${c.requestId}` }),
  },
  {
    who: "both",
    title: "They agree the handover in chat",
    say: "Ama suggests a meeting point at the airport and Kwame agrees. Open either chat bubble to read it.",
    run: async (c) => {
      await must(c.db.traveller.from("messages").insert({ request_id: c.requestId, author_id: c.ids.traveller, body: "Hi Kwame! I can collect the parcel at Kotoka departures, 2 hours before my flight. Okay?" }));
      await must(c.db.sender.from("messages").insert({ request_id: c.requestId, author_id: c.ids.sender, body: "Perfect, see you there. Paying into escrow now." }));
    },
    show: (c) => ({ traveller: `/traveler/requests/${c.matchId}`, sender: `/sender/requests/${c.requestId}` }),
  },
  {
    who: "sender",
    title: "Kwame pays Eban",
    say: "Kwame sends $23 to Eban ($20 for Ama + $3 Eban fee) with his EBAN reference, attaches the mobile money screenshot and confirms he's paid.",
    run: async (c) => {
      await simEvidence(c.db.sender, c.ids.sender, c.requestId, "payment_proof", "Mobile money receipt: $25", "#2F5D3A");
      await must(c.db.sender.rpc("report_payment_sent", { p_request_id: c.requestId }));
    },
    show: (c) => ({ sender: `/sender/requests/${c.requestId}`, admin: "/admin/payments" }),
  },
  {
    who: "admin",
    title: "Eban confirms the money arrived",
    say: "Efua checks Eban's account, sees the payment, and confirms it. The money is now held in escrow.",
    run: async (c) => {
      await must(c.db.admin.rpc("admin_confirm_payment", { p_request_id: c.requestId }));
    },
    show: (c) => ({ admin: "/admin/payments", sender: `/sender/requests/${c.requestId}`, traveller: `/traveler/requests/${c.matchId}` }),
  },
  {
    who: "traveller",
    title: "Ama collects the parcel",
    say: "At the airport Ama photographs the parcel, signs, and marks it collected. Kwame gets the photo.",
    run: async (c) => {
      await simEvidence(c.db.traveller, c.ids.traveller, c.requestId, "handover_photo", "Parcel at collection", "#B07D22");
      await must(c.db.traveller.from("delivery_requests").update({ status: "handed_to_traveller", handed_to_traveller_at: new Date().toISOString() }).eq("id", c.requestId));
    },
    show: (c) => ({ traveller: `/traveler/requests/${c.matchId}`, sender: `/sender/requests/${c.requestId}` }),
  },
  {
    who: "traveller",
    title: "Ama flies",
    say: "Ama boards her flight. The parcel is in transit.",
    run: async (c) => {
      await must(c.db.traveller.from("delivery_requests").update({ status: "in_transit" }).eq("id", c.requestId));
    },
    show: (c) => ({ traveller: `/traveler/requests/${c.matchId}`, sender: `/sender/requests/${c.requestId}` }),
  },
  {
    who: "traveller",
    title: "Ama delivers",
    say: "In London, Ama photographs the hand-over to Kwame's cousin and marks it delivered.",
    run: async (c) => {
      await simEvidence(c.db.traveller, c.ids.traveller, c.requestId, "delivery_photo", "Parcel at delivery", "#B5432F");
      await must(c.db.traveller.from("delivery_requests").update({ status: "delivered" }).eq("id", c.requestId));
    },
    show: (c) => ({ traveller: `/traveler/requests/${c.matchId}`, sender: `/sender/requests/${c.requestId}` }),
  },
];

const happyEnding: Step[] = [
  {
    who: "sender",
    title: "Kwame confirms receipt",
    say: "Kwame's cousin has the parcel, so Kwame confirms. Eban releases the payment and a payout to Ama is created.",
    run: async (c) => {
      await must(c.db.sender.rpc("confirm_receipt", { p_request_id: c.requestId }));
    },
    show: (c) => ({ sender: `/sender/requests/${c.requestId}`, admin: "/admin/payouts" }),
  },
  {
    who: "both",
    title: "They rate each other",
    say: "Kwame gives Ama 5 stars and Ama rates Kwame. The reviews appear on their profiles.",
    run: async (c) => {
      await must(c.db.sender.rpc("rate_request", { p_request_id: c.requestId, p_rating: 5, p_comment: "SIM: Arrived sealed and on time. Thank you Ama!" }));
      await must(c.db.traveller.rpc("rate_request", { p_request_id: c.requestId, p_rating: 5, p_comment: "SIM: Clear instructions, easy handover." }));
    },
    show: () => ({ sender: "/profile", traveller: "/profile" }),
  },
  {
    who: "admin",
    title: "Eban pays Ama",
    say: "Efua sends Ama her full $20 by mobile money and marks the payout paid. Eban keeps the $3 fee. Done!",
    run: async (c) => {
      await must(c.db.admin.from("payouts").update({ status: "paid" }).eq("request_id", c.requestId));
    },
    show: () => ({ admin: "/admin/payouts", traveller: "/traveler/earnings" }),
  },
];

const disputeEnding: Step[] = [
  {
    who: "sender",
    title: "Kwame says it never arrived",
    say: "Kwame's cousin never got the parcel, so Kwame taps \"I haven't received it\". The money stays frozen.",
    run: async (c) => {
      await must(c.db.sender.rpc("report_not_received", { p_request_id: c.requestId, p_details: "SIM: Nobody came to the meeting point." }));
    },
    show: (c) => ({ sender: `/sender/requests/${c.requestId}`, admin: "/admin/disputes" }),
  },
  {
    who: "admin",
    title: "Eban investigates and refunds",
    say: "Efua calls both of them. Ama can't show proof of delivery, so Efua refunds Kwame. The request is cancelled.",
    run: async (c) => {
      await must(c.db.admin.rpc("admin_resolve_dispute", { p_request_id: c.requestId, p_outcome: "refund", p_note: "SIM: No proof of delivery." }));
    },
    show: (c) => ({ admin: "/admin/disputes", sender: `/sender/requests/${c.requestId}` }),
  },
];

const extraBagMiddle: Step[] = [
  {
    who: "traveller",
    title: "Ama flags an extra bag",
    say: "Kwame wants to send more than fits. Ama asks for an extra bag: $60 bag cost + $20 for her trouble.",
    run: async (c) => {
      c.bagId = (await must(c.db.traveller.rpc("propose_extra_bag", { p_request_id: c.requestId, p_bag_cost: 60, p_compensation: 20, p_note: "SIM: A second suitcase of food" }))) as string;
    },
    show: (c) => ({ traveller: `/traveler/requests/${c.matchId}`, admin: "/admin/extra-bags" }),
  },
  {
    who: "admin",
    title: "Eban approves the extra bag",
    say: "Efua checks the airline's bag price and approves it. Kwame will pay $60 + $20 + Eban's 15% of the $20.",
    run: async (c) => {
      await must(c.db.admin.rpc("admin_review_extra_bag", { p_id: c.bagId, p_approve: true, p_note: "SIM: Price checked" }));
    },
    show: (c) => ({ admin: "/admin/extra-bags", sender: `/sender/requests/${c.requestId}` }),
  },
  {
    who: "sender",
    title: "Kwame pays for the extra bag",
    say: "Kwame pays the extra bag amount to Eban and taps that he has paid.",
    run: async (c) => {
      await must(c.db.sender.rpc("report_extra_bag_payment", { p_id: c.bagId }));
    },
    show: (c) => ({ sender: `/sender/requests/${c.requestId}`, admin: "/admin/extra-bags" }),
  },
  {
    who: "admin",
    title: "Eban holds it and sends half early",
    say: "Efua confirms the money arrived, then sends Ama half the bag cost ($30) so she can buy the bag.",
    run: async (c) => {
      await must(c.db.admin.rpc("admin_confirm_extra_bag_payment", { p_id: c.bagId }));
      await must(c.db.admin.rpc("admin_mark_extra_bag_advance", { p_id: c.bagId }));
    },
    show: (c) => ({ admin: "/admin/extra-bags", traveller: `/traveler/requests/${c.matchId}` }),
  },
];

const extraBagEnding: Step[] = [
  ...happyEnding.slice(0, 1),
  {
    who: "admin",
    title: "Eban settles the extra bag",
    say: "Delivery confirmed, so Efua sends Ama the rest: the other $30 of the bag plus her $20.",
    run: async (c) => {
      await must(c.db.admin.rpc("admin_settle_extra_bag", { p_id: c.bagId }));
    },
    show: () => ({ admin: "/admin/extra-bags", traveller: "/traveler/earnings" }),
  },
];

const SCENARIOS: Record<string, { name: string; steps: Step[] }> = {
  happy: { name: "A parcel delivered, start to finish", steps: [...opening, ...happyEnding] },
  dispute: { name: "Parcel never arrives (dispute and refund)", steps: [...opening, ...disputeEnding] },
  bag: { name: "Extra bag, then delivered", steps: [...opening.slice(0, 6), ...extraBagMiddle, ...opening.slice(6), ...extraBagEnding] },
};

type StepState = "todo" | "running" | "done" | "failed";
// look = how long the acting person's screen is spotlighted before the action happens;
// hold = how long the result stays on screen before the next step.
const SPEEDS = {
  slow: { look: 3500, hold: 10000 },
  normal: { look: 2500, hold: 6500 },
  fast: { look: 1000, hold: 3000 },
} as const;
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

const SimulatorInner = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const db = useMemo(
    () =>
      Object.fromEntries(
        ROLES.map((r) => [r, createClient(url, key, { auth: { storageKey: frameName(r), storage: localStorage, persistSession: true, autoRefreshToken: true } })])
      ) as Record<Role, SupabaseClient>,
    [url, key]
  );

  const frames = useRef<Record<Role, HTMLIFrameElement | null>>({ sender: null, traveller: null, admin: null });
  const ctx = useRef<Ctx | null>(null);
  const playing = useRef(false);

  const [password, setPassword] = useState(() => {
    try { return sessionStorage.getItem("eban-sim-pw") ?? ""; } catch { return ""; }
  });
  const [signedIn, setSignedIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [scenario, setScenario] = useState<keyof typeof SCENARIOS>("happy");
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>("normal");
  const speedRef = useRef<keyof typeof SPEEDS>("normal");
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const [states, setStates] = useState<StepState[]>([]);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [active, setActive] = useState<Role | "both" | null>(null);
  const [caption, setCaption] = useState<{ who: Role | "both"; title: string; say: string; phase: "about" | "done" } | null>(null);
  const [paths, setPaths] = useState<Record<Role, string>>({ sender: PEOPLE.sender.home, traveller: PEOPLE.traveller.home, admin: PEOPLE.admin.home });
  const [log, setLog] = useState<{ t: string; text: string; bad?: boolean }[]>([]);

  const steps = SCENARIOS[scenario].steps;

  const say = (text: string, bad = false) => setLog((l) => [{ t: new Date().toLocaleTimeString(), text, bad }, ...l].slice(0, 60));

  const go = useCallback((role: Role, path: string) => {
    const f = frames.current[role];
    if (!f) return;
    f.src = `${path}${path.includes("?") ? "&" : "?"}sim=${Date.now()}`;
    setPaths((p) => ({ ...p, [role]: path }));
  }, []);

  const reset = useCallback(() => {
    playing.current = false;
    setIsPlaying(false);
    setStates(steps.map(() => "todo"));
    setCursor(0);
    setActive(null);
    if (ctx.current) ctx.current = { db: ctx.current.db, ids: ctx.current.ids };
  }, [steps]);

  useEffect(() => { reset(); }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  // Already signed in from an earlier visit?
  useEffect(() => {
    (async () => {
      const sessions = await Promise.all(ROLES.map((r) => db[r].auth.getSession()));
      if (sessions.every((s) => s.data.session)) {
        ctx.current = { db, ids: Object.fromEntries(ROLES.map((r, i) => [r, sessions[i].data.session!.user.id])) as Record<Role, string> };
        setSignedIn(true);
      }
    })();
  }, [db]);

  const signIn = async () => {
    if (password.length < 8) return say("Type the test password you chose when you ran reset_and_seed.", true);
    setSigningIn(true);
    // Screens stay blank while signing in, and any old sign-ins are cleared first. Otherwise a screen still holding
    // a sign-in from before a reset can wipe the new one while it tries to refresh the old one.
    ROLES.forEach((r) => {
      const f = frames.current[r];
      if (f) f.src = "about:blank";
      try { localStorage.removeItem(frameName(r)); } catch { /* private mode */ }
    });
    try {
      const ids = {} as Record<Role, string>;
      for (const r of ROLES) {
        const { data, error } = await db[r].auth.signInWithPassword({ email: PEOPLE[r].email, password });
        if (error) throw new Error(`${PEOPLE[r].name}: ${error.message}`);
        ids[r] = data.user.id;
      }
      try { sessionStorage.setItem("eban-sim-pw", password); } catch { /* private mode */ }
      ctx.current = { db, ids };
      setSignedIn(true);
      ROLES.forEach((r) => go(r, PEOPLE[r].home));
      say("Kwame, Ama and Efua are signed in, each in their own screen.");
    } catch (e) {
      say(`Couldn't sign in: ${(e as Error).message}. Did you run reset_and_seed with this password?`, true);
    } finally {
      setSigningIn(false);
    }
  };

  const runStep = async (i: number): Promise<boolean> => {
    const step = steps[i];
    if (!step || !ctx.current) return false;
    setActive(step.who);
    setStates((s) => s.map((v, j) => (j === i ? "running" : v)));
    setCaption({ who: step.who, title: step.title, say: step.say, phase: "about" });
    say(`${step.title}: ${step.say}`);
    try {
      // Spotlight first, so you can see who is about to act before anything changes.
      await wait(SPEEDS[speedRef.current].look);
      await step.run(ctx.current);
      const show = step.show(ctx.current);
      (Object.keys(show) as Role[]).forEach((r) => go(r, show[r]!));
      setCaption({ who: step.who, title: step.title, say: step.say, phase: "done" });
      setStates((s) => s.map((v, j) => (j === i ? "done" : v)));
      setCursor(i + 1);
      return true;
    } catch (e) {
      setStates((s) => s.map((v, j) => (j === i ? "failed" : v)));
      say(`Step failed: ${(e as Error).message}`, true);
      playing.current = false;
      setIsPlaying(false);
      return false;
    }
  };

  const play = async () => {
    if (!signedIn) return;
    playing.current = true;
    setIsPlaying(true);
    let i = cursor;
    while (playing.current && i < steps.length) {
      const ok = await runStep(i);
      if (!ok) return;
      i += 1;
      // Leave the result on screen long enough to see it.
      await wait(SPEEDS[speedRef.current].hold);
    }
    if (i >= steps.length) say("Scenario finished. Pick another one or press Restart.");
    playing.current = false;
    setIsPlaying(false);
    setActive(null);
    setCaption(null);
  };

  const pause = () => { playing.current = false; setIsPlaying(false); };
  const step = async () => { if (!isPlaying && cursor < steps.length) { await runStep(cursor); } };
  const signOutAll = async () => {
    pause();
    await Promise.all(ROLES.map((r) => db[r].auth.signOut()));
    ctx.current = null;
    setSignedIn(false);
    ROLES.forEach((r) => {
      const f = frames.current[r];
      if (f) f.src = "about:blank";
      setPaths((p) => ({ ...p, [r]: "signed out" }));
    });
  };

  const done = states.filter((s) => s === "done").length;

  return (
    <div className="min-h-screen bg-ink text-paper font-body flex flex-col">
      <div className="kente-rail" />
      {/* Controls */}
      <header className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-white/10">
        <div className="mr-2">
          <p className="font-display text-xl leading-none">Eban simulator</p>
          <p className="text-[11px] text-paper/50 mt-1">Test site · fake people, fake money</p>
        </div>
        {!signedIn ? (
          <>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Test password"
              className="h-9 w-48 rounded-lg bg-ink-2 border border-white/10 px-3 text-sm text-paper placeholder:text-paper/40 focus:outline-none focus:border-brass"
              onKeyDown={(e) => e.key === "Enter" && signIn()}
            />
            <button onClick={signIn} disabled={signingIn} className="h-9 px-4 rounded-lg bg-brass text-ink text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
              {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Sign everyone in
            </button>
          </>
        ) : (
          <>
            <select value={scenario} onChange={(e) => setScenario(e.target.value as keyof typeof SCENARIOS)} disabled={isPlaying} className="h-9 rounded-lg bg-ink-2 border border-white/10 px-2 text-sm text-paper">
              {Object.entries(SCENARIOS).map(([k, s]) => <option key={k} value={k}>{s.name}</option>)}
            </select>
            {isPlaying ? (
              <button onClick={pause} className="h-9 px-4 rounded-lg bg-paper text-ink text-sm font-semibold inline-flex items-center gap-2"><Pause className="w-4 h-4" /> Pause</button>
            ) : (
              <button onClick={play} disabled={cursor >= steps.length} className="h-9 px-4 rounded-lg bg-brass text-ink text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                <Play className="w-4 h-4" /> {cursor === 0 ? "Play" : "Continue"}
              </button>
            )}
            <button onClick={step} disabled={isPlaying || cursor >= steps.length} className="h-9 px-3 rounded-lg border border-white/15 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40"><StepForward className="w-4 h-4" /> One step</button>
            <button onClick={reset} disabled={isPlaying} className="h-9 px-3 rounded-lg border border-white/15 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40"><RotateCcw className="w-4 h-4" /> Restart</button>
            <div className="flex items-center gap-1 text-xs text-paper/60">
              Speed
              {(Object.keys(SPEEDS) as (keyof typeof SPEEDS)[]).map((s) => (
                <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-1 rounded-md capitalize ${speed === s ? "bg-paper text-ink font-semibold" : "hover:text-paper"}`}>{s}</button>
              ))}
            </div>
            <span className="text-xs text-paper/50">{done}/{steps.length} steps</span>
            <button onClick={signOutAll} className="ml-auto text-xs text-paper/50 hover:text-paper">Sign everyone out</button>
          </>
        )}
      </header>

      <div className="flex-1 grid lg:grid-cols-[300px_1fr] min-h-0">
        {/* Steps and narration */}
        <aside className="border-r border-white/10 p-4 overflow-y-auto max-h-[40vh] lg:max-h-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass mb-3">{SCENARIOS[scenario].name}</p>
          <ol className="space-y-1.5">
            {steps.map((s, i) => {
              const st = states[i] ?? "todo";
              const Icon = st === "done" ? CheckCircle2 : st === "running" ? Loader2 : st === "failed" ? XCircle : Circle;
              return (
                <li key={i} className={`flex gap-2.5 rounded-lg px-2.5 py-2 text-sm ${i === cursor && st !== "done" ? "bg-ink-2" : ""}`}>
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${st === "done" ? "text-[#5FBF8F]" : st === "running" ? "text-brass animate-spin" : st === "failed" ? "text-[#E07A6E]" : "text-paper/30"}`} />
                  <div>
                    <p className={st === "todo" ? "text-paper/60" : "text-paper"}>{s.title}</p>
                    {(st === "running" || (i === cursor - 1 && st === "done")) && <p className="text-xs text-paper/60 mt-1 leading-relaxed">{s.say}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/40 mt-6 mb-2">What happened</p>
          <ul className="space-y-2">
            {log.map((l, i) => (
              <li key={i} className={`text-xs leading-relaxed ${l.bad ? "text-[#E07A6E]" : "text-paper/70"}`}><span className="text-paper/35">{l.t}</span> {l.text}</li>
            ))}
            {log.length === 0 && <li className="text-xs text-paper/40">Sign everyone in, pick a scenario and press Play.</li>}
          </ul>
        </aside>

        {/* Three live screens */}
        <main className="flex flex-col gap-3 p-3 min-h-0">
          {caption && (
            <div className={`rounded-xl px-4 py-3 border-2 transition-colors ${caption.phase === "about" ? "border-brass bg-brass/15" : "border-[#5FBF8F]/60 bg-[#5FBF8F]/10"}`} aria-live="polite">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
                {caption.phase === "about" ? "Now acting: " : "Done: "}
                {caption.who === "both" ? `${PEOPLE.sender.name} and ${PEOPLE.traveller.name}` : `${PEOPLE[caption.who].name} (${PEOPLE[caption.who].label})`}
              </p>
              <p className="font-display text-xl text-paper mt-1">{caption.title}</p>
              <p className="text-sm text-paper/75 mt-0.5">{caption.say}</p>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3 flex-1 min-h-0">
          {ROLES.map((r) => {
            const P = PEOPLE[r];
            const lit = active === r || (active === "both" && r !== "admin");
            const dim = active !== null && !lit;
            return (
              <section key={r} className={`flex flex-col rounded-xl overflow-hidden border-2 transition-all duration-500 ${lit ? "border-brass shadow-[0_0_0_4px_rgba(200,147,47,0.35)] scale-[1.01]" : "border-white/10"} ${dim ? "opacity-35" : "opacity-100"}`}>
                <div className={`flex items-center gap-2 px-3 py-2 text-xs ${lit ? "bg-brass text-ink" : "bg-ink-2 text-paper/80"}`}>
                  <P.Icon className="w-3.5 h-3.5" />
                  <span className="font-semibold">{P.name}</span>
                  <span className="opacity-70">· {P.label}</span>
                  {lit && <span className="ml-1 px-1.5 py-0.5 rounded bg-ink text-brass text-[10px] font-bold uppercase tracking-wider">Acting now</span>}
                  <span className="ml-auto truncate opacity-60 font-mono text-[10px]">{paths[r]}</span>
                </div>
                <iframe
                  ref={(el) => (frames.current[r] = el)}
                  name={frameName(r)}
                  title={`${P.name}'s screen`}
                  src={signedIn ? P.home : "about:blank"}
                  className="flex-1 w-full min-h-[70vh] bg-paper"
                />
              </section>
            );
          })}
          </div>
        </main>
      </div>
    </div>
  );
};

/** Only exists on the test website. On the real site this address is a normal 404. */
const Simulator = () => (IS_TEST_SITE ? <SimulatorInner /> : <NotFound />);

export default Simulator;
