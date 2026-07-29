import { useEffect, useRef, useState } from "react";
import ebanSymbol from "@/assets/eban-symbol.png";
import {
  FileText,
  Users,
  PackageCheck,
  Handshake,
  Plane,
  CheckCircle2,
  ShieldCheck,
  Lock,
  FileSignature,
  ChevronRight,
} from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import BookingForm from "@/components/BookingForm";
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
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="w-7 h-px bg-gold" />
    <span className="font-body text-xs font-medium tracking-[0.2em] uppercase text-gold-dark">{children}</span>
  </div>
);

const Navbar = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={ebanSymbol} alt="EBAN symbol" className="w-9 h-9" />
          <span className="font-display text-2xl font-semibold tracking-[0.15em] text-foreground">EBAN</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-body text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#what-we-carry" className="hover:text-foreground transition-colors">What We Carry</a>
          <a href="#trust" className="hover:text-foreground transition-colors">Trust &amp; Safety</a>
          <a href="#book" className="hover:text-foreground transition-colors">Book a Delivery</a>
          <a
            href="https://wa.me/23058440472"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-dark hover:text-gold transition-colors"
          >
            WhatsApp Us
          </a>
        </div>
        {user ? (
          <div className="flex items-center gap-4">
            {profile?.role === "Traveller" && (
              <Link to="/traveler" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors">
                My trips
              </Link>
            )}
            {profile?.role === "Sender" && (
              <Link to="/sender/requests" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors">
                My requests
              </Link>
            )}
            {profile?.role === "Admin" && (
              <Link to="/admin/bookings" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            )}
            <span className="hidden sm:inline font-body text-sm text-muted-foreground">
              {profile?.full_name ?? "Account"}
            </span>
            <button onClick={signOut} className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link
              to="/signup"
              className="border border-gold text-gold-dark font-body text-xs font-semibold tracking-[0.15em] uppercase px-5 py-2.5 hover:bg-gold hover:text-accent-foreground transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const Hero = () => (
  <section className="relative min-h-screen flex items-center bg-gradient-hero overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 60% 70% at 75% 50%, hsl(var(--earth) / 0.5) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 15% 60%, hsl(var(--gold) / 0.06) 0%, transparent 60%)",
      }}
    />
    <img
      src={ebanSymbol}
      alt=""
      aria-hidden="true"
      className="absolute -right-20 top-1/2 -translate-y-1/2 w-[560px] h-[560px] object-contain opacity-[0.05] pointer-events-none select-none"
      style={{ filter: "brightness(10)" }}
    />
    <div className="container mx-auto px-6 relative z-10 pt-24 pb-16">
      <div className="max-w-2xl animate-fade-up">
        <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="font-body text-[11px] font-medium tracking-[0.2em] uppercase text-gold-light">
            Peer-to-Peer Delivery Network
          </span>
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-light text-primary-foreground leading-[1.05] mb-6">
          Send items with people <em className="italic text-gold-light">already headed</em> there.
        </h1>
        <p className="font-body text-base md:text-lg font-light text-primary-foreground/60 max-w-lg mb-10 leading-relaxed">
          EBAN connects senders with verified travelers on the same route — structured, accountable, and incentivised. You never deal with the other side directly; EBAN handles every handoff.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="#book"
            className="bg-gold text-accent-foreground font-body text-xs font-semibold tracking-[0.15em] uppercase px-8 py-4 hover:bg-gold-dark transition-colors flex items-center justify-center gap-2"
          >
            Book a Delivery <ChevronRight className="w-4 h-4" />
          </a>
          <a
            href="#how-it-works"
            className="border border-primary-foreground/25 text-primary-foreground/70 font-body text-xs font-medium tracking-[0.15em] uppercase px-8 py-4 hover:border-gold hover:text-gold-light transition-colors text-center"
          >
            How It Works
          </a>
        </div>
      </div>
    </div>
  </section>
);

const processSteps = [
  { icon: FileText, title: "Request" },
  { icon: Users, title: "Matching" },
  { icon: PackageCheck, title: "Drop-off & Verification" },
  { icon: Handshake, title: "Handoff" },
  { icon: Plane, title: "In Transit" },
  { icon: CheckCircle2, title: "Delivery" },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-24 bg-charcoal">
    <div className="container mx-auto px-6">
      <SectionLabel>The Process</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-light text-primary-foreground leading-tight max-w-xl">
        Six steps from <em className="italic text-gold-light">request to delivery</em>
      </h2>
      <p className="font-body text-sm text-primary-foreground/50 max-w-lg mt-4 leading-relaxed">
        Every delivery follows the same defined process. Both sides know exactly what to expect — and EBAN is the only party either of them ever deals with.
      </p>
      <Reveal className="relative mt-16">
        <div className="hidden lg:block absolute top-8 left-[8%] right-[8%] h-px bg-gold/20" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-12">
          {processSteps.map((step, i) => (
            <div key={step.title} className="group relative z-10 text-center px-2">
              <div className="w-16 h-16 bg-charcoal border border-gold/30 flex items-center justify-center mb-5 mx-auto font-display text-2xl font-light text-gold-light transition-colors duration-300 group-hover:bg-gold group-hover:border-gold group-hover:text-charcoal">
                {String(i + 1).padStart(2, "0")}
              </div>
              <step.icon className="w-6 h-6 text-gold mb-3 mx-auto" strokeWidth={1.5} />
              <h3 className="font-display text-base font-normal text-primary-foreground">{step.title}</h3>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

const eligibleItems = [
  "Documents and printed materials",
  "Clothing, shoes, and accessories",
  "Personal care and hygiene products",
  "Non-perishable, sealed food items",
  "Small electronics and accessories",
  "Gifts and small household goods within the weight limit",
];

const prohibitedItems = [
  "Cash, cheques, or other financial instruments",
  "Weapons, ammunition, or hazardous materials",
  "Controlled substances or unprescribed medication",
  "Perishable food requiring refrigeration",
  "Anything illegal to import at the destination",
  "Any item the traveler isn't comfortable carrying",
];

const WhatWeCarry = () => (
  <section id="what-we-carry" className="py-24 bg-background">
    <div className="container mx-auto px-6">
      <SectionLabel>What We Carry</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-light text-foreground leading-tight max-w-xl">
        Clear rules, <em className="italic">no surprises</em>
      </h2>
      <Reveal className="grid md:grid-cols-2 gap-10 mt-16">
        <div className="border border-border bg-card p-10 transition-transform duration-300 hover:-translate-y-1">
          <h3 className="font-display text-xl font-medium text-foreground mb-6">Eligible Items</h3>
          <ul className="space-y-3">
            {eligibleItems.map((item) => (
              <li key={item} className="flex gap-3 items-start border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-earth font-semibold text-sm mt-0.5">&#10003;</span>
                <span className="font-body text-sm text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-destructive/20 bg-destructive/[0.03] p-10 transition-transform duration-300 hover:-translate-y-1">
          <h3 className="font-display text-xl font-medium text-foreground mb-6">Prohibited Items</h3>
          <ul className="space-y-3">
            {prohibitedItems.map((item) => (
              <li key={item} className="flex gap-3 items-start border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-destructive font-semibold text-sm mt-0.5">&#10005;</span>
                <span className="font-body text-sm text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
      <p className="font-body text-xs text-muted-foreground max-w-2xl mt-8 leading-relaxed">
        Customs rules vary by destination — EBAN staff review every request before it's matched, and a traveler can decline any item without penalty.
      </p>
    </div>
  </section>
);

const trustPillars = [
  {
    icon: ShieldCheck,
    title: "Verified Identities",
    desc: "Every traveler completes ID verification with EBAN — passport, national ID, or driver's license — before being matched to a delivery.",
  },
  {
    icon: Lock,
    title: "No Direct Contact",
    desc: "Senders and travelers never exchange contact details. EBAN handles matching, drop-off, and handoff at every step.",
  },
  {
    icon: FileSignature,
    title: "Signed Handoff",
    desc: "Every handoff is confirmed with a digital signature, so there's a clear, timestamped record from drop-off to delivery.",
  },
];

const TrustSafety = () => (
  <section id="trust" className="py-24 bg-charcoal">
    <div className="container mx-auto px-6">
      <SectionLabel>Trust &amp; Safety</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-light text-primary-foreground leading-tight max-w-xl">
        Accountability <em className="italic text-gold-light">at every step</em>
      </h2>
      <Reveal className="grid sm:grid-cols-3 gap-px bg-gold/10 mt-16">
        {trustPillars.map((pillar) => (
          <div key={pillar.title} className="bg-charcoal p-10 hover:bg-earth transition-colors duration-300">
            <pillar.icon className="w-6 h-6 text-gold mb-5" strokeWidth={1.5} />
            <h3 className="font-display text-xl font-normal text-gold-light mb-3">{pillar.title}</h3>
            <p className="font-body text-sm text-primary-foreground/45 leading-relaxed">{pillar.desc}</p>
          </div>
        ))}
      </Reveal>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-charcoal text-primary-foreground py-12 border-t border-gold/10">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <img src={ebanSymbol} alt="EBAN" className="w-8 h-8" />
          <span className="font-display text-xl font-semibold tracking-[0.15em]">EBAN</span>
        </div>
        <div className="flex gap-8 font-body text-xs tracking-[0.1em] uppercase text-primary-foreground/50">
          <a href="#how-it-works" className="hover:text-primary-foreground transition-colors">How It Works</a>
          <a href="#what-we-carry" className="hover:text-primary-foreground transition-colors">What We Carry</a>
          <a href="#book" className="hover:text-primary-foreground transition-colors">Book</a>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 mt-8 pt-6 text-center">
        <p className="font-body text-xs text-primary-foreground/30">© {new Date().getFullYear()} EBAN. Trusted peer-to-peer delivery, powered by everyday travelers.</p>
      </div>
    </div>
  </footer>
);

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (user && profile?.role && searchParams.get("view") !== "site") {
    if (profile.role === "Admin") return <Navigate to="/admin/bookings" replace />;
    if (profile.role === "Traveller") return <Navigate to="/traveler" replace />;
    if (profile.role === "Sender") return <Navigate to="/sender/requests" replace />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhatWeCarry />
      <TrustSafety />
      <BookingForm />
      <Footer />
    </div>
  );
};

export default Index;
