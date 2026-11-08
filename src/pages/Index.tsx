import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, X, ShieldCheck, Lock, FileSignature, Menu } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import journeyPhoto from "@/assets/eban-journey.jpg";
import { SUPPORT_WHATSAPP_URL } from "@/lib/siteConfig";
import BookingForm from "@/components/BookingForm";
import { AvailableTrips, RouteCodes, codeOf, shortDate, useOpenRoutes } from "@/components/AvailableTrips";
import { FeedbackWall } from "@/components/FeedbackWall";
import { FaqSection } from "@/components/FaqSection";
import { EbanLogo } from "@/components/AppNav";
import { useAuth } from "@/hooks/useAuth";

const Reveal = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out motion-reduce:transition-none ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}>
      {children}
    </div>
  );
};

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#routes", label: "Routes" },
  { href: "#safety", label: "Safety" },
  { href: "#pricing", label: "Pricing" },
];

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const home = profile?.role === "Admin" ? "/admin/bookings" : profile?.role === "Traveller" ? "/traveler" : "/sender/requests";

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur">
      <div className="kente-rail" />
      <div className="container mx-auto flex h-16 items-center justify-between gap-4">
        <EbanLogo to="/?view=site" sub="Peer delivery" />
        <nav className="hidden md:flex items-center gap-8" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-body text-[14px] text-ink/80 hover:text-ink transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to={home} className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg font-body text-sm font-semibold text-ink hover:bg-paper-2">
                {profile?.role === "Admin" ? "Admin" : "My account"}
              </Link>
              <button onClick={signOut} className="h-10 px-4 rounded-lg border border-line bg-white font-body text-sm font-semibold text-ink hover:bg-paper-2">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg font-body text-sm font-semibold text-ink hover:bg-paper-2">Log in</Link>
              <Link to="/signup" className="inline-flex h-10 items-center px-4 rounded-lg bg-brass font-body text-sm font-semibold text-ink hover:bg-[#CB9A22]">Post a request</Link>
            </>
          )}
          <button className="md:hidden p-2 text-ink" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden container mx-auto flex flex-col pb-3" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 font-body text-[15px] text-ink border-b border-line last:border-0">{l.label}</a>
          ))}
        </nav>
      )}
      <div className="kente-rail" />
    </header>
  );
};

const HeroCard = () => {
  const { routes, loading } = useOpenRoutes();
  const r = routes[0];
  return (
    <div className="absolute -bottom-10 left-4 right-4 sm:left-auto sm:right-6 sm:w-[330px] bg-white rounded-2xl border border-line p-5 shadow-[var(--shadow-elevated)]">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-2.5 py-1 font-body text-[12px] font-medium text-forest">
          <span className="w-1.5 h-1.5 rounded-full bg-forest" /> {r ? "Space open" : "How a trip looks"}
        </span>
        <span className="inline-flex items-center gap-1 font-body text-[12px] text-forest"><ShieldCheck className="w-3.5 h-3.5" /> ID checked</span>
      </div>
      {loading ? (
        <div className="h-20 rounded-lg bg-paper-2 animate-pulse" />
      ) : (
        <>
          <RouteCodes from={r ? codeOf(r.origin_city) : "ACC"} to={r ? codeOf(r.destination_city) : "LHR"} size="lg" />
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-line">
            <div><p className="text-[10px] font-body font-semibold uppercase tracking-[0.12em] text-slate">Departs</p><p className="font-body text-sm font-semibold text-ink mt-1">{r ? shortDate(r.next) : "Your date"}</p></div>
            <div><p className="text-[10px] font-body font-semibold uppercase tracking-[0.12em] text-slate">Space</p><p className="font-body text-sm font-semibold text-ink mt-1">{r ? `${r.kg} kg` : "Up to 23 kg"}</p></div>
            <div><p className="text-[10px] font-body font-semibold uppercase tracking-[0.12em] text-slate">Trips</p><p className="font-body text-sm font-semibold text-ink mt-1">{r ? r.trips : "Open"}</p></div>
          </div>
        </>
      )}
    </div>
  );
};

const Hero = () => (
  <section className="bg-paper">
    <div className="container mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center pt-12 pb-24 md:pt-20 md:pb-28">
      <div className="animate-fade-up">
        <p className="eyebrow mb-5">Send · Carry · Deliver</p>
        <h1 className="font-display text-[42px] leading-[1.05] sm:text-6xl lg:text-[68px] text-ink">
          Send it with someone already flying your way.
        </h1>
        <p className="font-body text-lg text-slate leading-relaxed mt-6 max-w-[520px]">
          Eban pairs you with ID-checked travellers who have spare luggage. You pay Eban, we hold the money, and the traveller is paid only after you confirm the parcel arrived.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link to="/signup" className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-lg bg-brass font-body text-[15px] font-semibold text-ink hover:bg-[#CB9A22]">
            Post a request <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#routes" className="inline-flex h-12 items-center justify-center px-6 rounded-lg border border-line bg-white font-body text-[15px] font-semibold text-ink hover:bg-paper-2">
            Browse open trips
          </a>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-8 font-body text-sm text-slate">
          {["ID-checked travellers", "Escrow until receipt", "Signed handover"].map((t) => (
            <li key={t} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-brass-deep" /> {t}</li>
          ))}
        </ul>
      </div>
      <div className="relative">
        <div className="rounded-3xl overflow-hidden aspect-[4/3.4] bg-ink-2">
          <img src="/images/hero-bg.jpg" alt="A plane at the gate at sunset" className="w-full h-full object-cover" />
        </div>
        <HeroCard />
      </div>
    </div>
  </section>
);

const senderSteps = [
  { title: "Post a request", desc: "Say what you're sending and where, or book a trip that's already listed." },
  { title: "Pay into escrow", desc: "You pay Eban. We hold the money until the parcel arrives." },
  { title: "Hand it over", desc: "Meet your traveller. The handover is signed in the app." },
  { title: "Confirm receipt", desc: "Tell us it arrived and the traveller is paid." },
];
const travellerSteps = [
  { title: "Get verified", desc: "Upload your ID and record a short face check. Our team reviews both." },
  { title: "Post your trip", desc: "Add your flight and spare kg, and set your own price per kg." },
  { title: "Carry and deliver", desc: "Take a request once Eban confirms the sender has paid." },
  { title: "Get paid", desc: "Your full price is released when the sender confirms receipt." },
];

const HowItWorks = () => {
  const [role, setRole] = useState<"sender" | "traveller">("sender");
  const steps = role === "sender" ? senderSteps : travellerSteps;
  return (
    <section id="how-it-works" className="py-20 md:py-24 bg-paper border-t border-line">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="font-display text-3xl md:text-[40px] leading-tight text-ink">Four steps, one handover.</h2>
          </div>
          <div role="tablist" aria-label="How it works for" className="inline-flex self-start p-1 rounded-lg bg-paper-2 border border-line">
            {([["sender", "I'm sending"], ["traveller", "I'm travelling"]] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={role === id}
                onClick={() => setRole(id)}
                className={`px-4 py-2 rounded-md font-body text-sm font-semibold transition-colors ${role === id ? "bg-ink text-paper" : "text-slate hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ol key={role} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 animate-fade-up">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t border-line pt-5">
              <span className="font-display text-[32px] leading-none text-brass">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-xl text-ink mt-4 mb-2">{s.title}</h3>
              <p className="font-body text-sm text-slate leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const Escrow = () => (
  <section id="pricing" className="bg-ink-2 text-paper">
    <div className="container mx-auto py-20 md:py-24">
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-brass mb-3">Escrow and pricing</p>
          <h2 className="font-display text-3xl md:text-[40px] leading-tight">Money moves only when the parcel does.</h2>
          <p className="font-body text-paper/70 mt-5 leading-relaxed max-w-md">
            The traveller sets their price per kg and keeps all of it. Eban adds a small service fee, shown before you pay. Nothing is charged until a traveller accepts.
          </p>
        </div>
        <Reveal className="grid sm:grid-cols-3 gap-8">
          {[
            { n: "01", t: "You pay Eban", d: "With your request reference, after the traveller accepts." },
            { n: "02", t: "We hold it", d: "The money sits in escrow while the parcel travels." },
            { n: "03", t: "Released on receipt", d: "You confirm it arrived. If not, report it and the payment stays frozen." },
          ].map((s) => (
            <div key={s.n} className="border-t border-white/15 pt-5">
              <span className="font-display text-2xl text-brass">{s.n}</span>
              <h3 className="font-display text-xl mt-3 mb-2">{s.t}</h3>
              <p className="font-body text-sm text-paper/65 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </div>
  </section>
);

const Fence = () => (
  <section id="safety" className="py-20 md:py-24 bg-paper-2">
    <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div className="relative mb-8 md:mb-0">
        <div className="rounded-3xl overflow-hidden aspect-[5/4] bg-ink-2">
          <img
            src={journeyPhoto}
            alt="A sender posts items, a traveller with spare luggage space carries them, and the receiver collects the parcel"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -bottom-6 left-4 sm:left-6 inline-flex items-center gap-3 bg-white rounded-2xl border border-line px-4 py-3 shadow-[var(--shadow-elevated)]">
          <img src={ebanSymbol} alt="" className="w-10 h-10 object-contain scale-150" />
          <div>
            <p className="font-display text-lg leading-none text-ink">Eban</p>
            <p className="font-body text-xs text-slate mt-1">A fence around your parcel</p>
          </div>
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3">Why “Eban”</p>
        <h2 className="font-display text-3xl md:text-[40px] leading-tight text-ink">A fence around your parcel.</h2>
        <p className="font-body text-slate leading-relaxed mt-5">
          Eban is the Akan Adinkra symbol for a fence: safety, security and home. That is the promise. Every step between you and the person carrying your parcel is checked.
        </p>
        <ul className="mt-8 space-y-5">
          {[
            { icon: ShieldCheck, t: "Everyone is verified", d: "Senders and travellers upload an ID and record a short face check. A person on our team reviews both." },
            { icon: Lock, t: "Payment held in escrow", d: "The traveller is paid only after you confirm the parcel arrived." },
            { icon: FileSignature, t: "Signed handover and ratings", d: "The traveller signs at pickup, and both sides rate each other after delivery." },
          ].map((p) => (
            <li key={p.t} className="flex gap-4">
              <span className="w-9 h-9 shrink-0 rounded-full bg-white border border-line flex items-center justify-center"><p.icon className="w-4 h-4 text-forest" /></span>
              <div>
                <h3 className="font-body text-[15px] font-semibold text-ink">{p.t}</h3>
                <p className="font-body text-sm text-slate leading-relaxed mt-1">{p.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

const eligibleItems = [
  "Documents, certificates and legal papers",
  "Clothing, shoes and accessories",
  "Sealed cosmetics and personal care",
  "Packaged, non-perishable foodstuffs",
  "Small electronics and gadgets",
  "Gifts that meet customs rules",
];
const prohibitedItems = [
  "Cash, cheques or bearer bonds",
  "Weapons, explosives or flammables",
  "Unprescribed medicine or controlled substances",
  "Fresh meat, produce or unsealed food",
  "Restricted goods over customs limits",
  "Anything the airline or customs prohibits",
];

const Rules = () => (
  <section id="what-we-carry" className="py-20 md:py-24 bg-paper">
    <div className="container mx-auto">
      <p className="eyebrow mb-3">Item rules</p>
      <h2 className="font-display text-3xl md:text-[40px] leading-tight text-ink max-w-xl">Clear rules, shared responsibility.</h2>
      <Reveal className="grid md:grid-cols-2 gap-6 mt-10">
        {[
          { title: "What travellers carry", items: eligibleItems, Icon: Check, tone: "text-forest", ring: "bg-forest/10" },
          { title: "What we never carry", items: prohibitedItems, Icon: X, tone: "text-kente", ring: "bg-kente/10" },
        ].map((col) => (
          <div key={col.title} className="rounded-xl border border-line bg-white p-6 md:p-8">
            <h3 className="font-display text-xl text-ink mb-5 flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full ${col.ring} flex items-center justify-center`}><col.Icon className={`w-4 h-4 ${col.tone}`} /></span>
              {col.title}
            </h3>
            <ul>
              {col.items.map((it) => (
                <li key={it} className="flex gap-3 py-3 border-t border-line font-body text-sm text-ink/85">
                  <col.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${col.tone}`} /> {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
      <p className="font-body text-sm text-slate mt-6">Eban is a marketplace. Senders and travellers are responsible for what they send and carry.</p>
    </div>
  </section>
);

const Cta = () => (
  <section className="bg-brass">
    <div className="container mx-auto py-16 md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
      <div>
        <h2 className="font-display text-3xl md:text-[40px] leading-tight text-ink">Someone is already flying your way.</h2>
        <p className="font-body text-ink/75 mt-3">Post a request in two minutes. Pay only when a traveller accepts.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/signup" className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-lg bg-ink font-body text-[15px] font-semibold text-paper hover:bg-ink-2">
          Post a request <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/signup" className="inline-flex h-12 items-center justify-center px-6 rounded-lg border border-ink/20 font-body text-[15px] font-semibold text-ink hover:bg-ink/5">
          Become a traveller
        </Link>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-ink text-paper">
    <div className="kente-rail" aria-hidden="true" />
    <div className="container mx-auto py-14">
      <div className="grid md:grid-cols-[1.4fr_1fr_1fr] gap-10 pb-10 border-b border-white/10">
        <div>
          <EbanLogo to="/?view=site" sub="Peer delivery" dark />
          <p className="font-body text-sm text-paper/60 mt-4 max-w-xs">Send it with someone already flying your way.</p>
        </div>
        <div className="font-body text-sm space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/40 mb-3">Eban</p>
          {NAV_LINKS.map((l) => <a key={l.href} href={l.href} className="block text-paper/75 hover:text-paper">{l.label}</a>)}
        </div>
        <div className="font-body text-sm space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/40 mb-3">Help</p>
          <a href="#faq" className="block text-paper/75 hover:text-paper">Questions</a>
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="block text-paper/75 hover:text-paper">WhatsApp support</a>
          <Link to="/login" className="block text-paper/75 hover:text-paper">Log in</Link>
        </div>
      </div>
      <p className="pt-6 font-body text-xs text-paper/45">© {new Date().getFullYear()} Eban. A marketplace: senders and travellers are responsible for what they send and carry.</p>
    </div>
  </footer>
);

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <img src={ebanSymbol} alt="Loading Eban" className="w-10 h-10 animate-pulse" />
      </div>
    );
  }

  if (user && profile?.role && searchParams.get("view") !== "site") {
    if (profile.role === "Admin") return <Navigate to="/admin/bookings" replace />;
    if (profile.role === "Traveller") return <Navigate to="/traveler" replace />;
    if (profile.role === "Sender") return <Navigate to="/sender/requests" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <AvailableTrips />
      <HowItWorks />
      <Escrow />
      <Fence />
      <Rules />
      <FeedbackWall />
      <FaqSection />
      {user && <BookingForm />}
      <Cta />
      <Footer />
    </div>
  );
};

export default Index;
