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
  Sparkles,
  Globe,
  ArrowUpRight,
  Check,
  X,
  Clock,
  Award,
} from "lucide-react";
import { SUPPORT_WHATSAPP_URL } from "@/lib/siteConfig";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import BookingForm from "@/components/BookingForm";
import { AvailableTrips } from "@/components/AvailableTrips";
import { FeedbackWall } from "@/components/FeedbackWall";
import { FaqSection } from "@/components/FaqSection";
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
  <div className="flex items-center gap-3 mb-5">
    <span className="kente-band w-10 shrink-0" aria-hidden="true" />
    <span className="font-body text-sm font-semibold text-forest">{children}</span>
  </div>
);

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-charcoal/90 backdrop-blur-xl border-b border-gold/15 py-3 shadow-lg" : "bg-transparent py-5"}`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold transition-colors">
            <img src={ebanSymbol} alt="EBAN symbol" className="w-6 h-6 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl font-semibold tracking-[0.18em] text-white">EBAN</span>
            <span className="font-body text-[9px] font-medium text-gold-light">Global Logistics</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-body text-sm font-medium text-gray-300">
          <a href="#how-it-works" className="hover:text-gold-light transition-colors">How it works</a>
          <a href="#what-we-carry" className="hover:text-gold-light transition-colors">Item rules</a>
          <a href="#trust" className="hover:text-gold-light transition-colors">Trust &amp; Verification</a>
          <a href="#book" className="hover:text-gold-light transition-colors">Post a request</a>
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-light hover:text-gold flex items-center gap-1 transition-colors"
          >
            Support <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            {profile?.role === "Traveller" && (
              <Link to="/traveler" className="font-body text-sm font-semibold text-gold-light hover:text-white transition-colors">
                My Trips
              </Link>
            )}
            {profile?.role === "Sender" && (
              <Link to="/sender/requests" className="font-body text-sm font-semibold text-gold-light hover:text-white transition-colors">
                My Requests
              </Link>
            )}
            {profile?.role === "Admin" && (
              <Link to="/admin/bookings" className="font-body text-sm font-semibold text-gold-light hover:text-white transition-colors">
                Admin Suite
              </Link>
            )}
            <button
              onClick={signOut}
              className="border border-gold/30 hover:border-gold text-gold-light font-body text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="font-body text-sm font-semibold text-gray-300 hover:text-white transition-colors px-3 py-2">
              Log In
            </Link>
            <Link
              to="/signup"
              className="bg-gradient-gold text-charcoal font-body text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md glow-gold"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const heroAssurances = [
  { icon: ShieldCheck, text: "Every traveler is ID-checked by our team" },
  { icon: Lock, text: "Eban holds your payment until you confirm delivery" },
  { icon: Handshake, text: "You agree the handover with the traveler in Messages" },
];

const moneyJourney = [
  { title: "You pay Eban", note: "Send the amount with your reference code." },
  { title: "Eban confirms and holds it", note: "The traveler is told it is safe to carry." },
  { title: "The traveler delivers", note: "They mark the item delivered on arrival." },
  { title: "You confirm, they get paid", note: "Nothing is released before you say so." },
];

const Hero = () => (
  <section className="relative min-h-screen flex flex-col justify-center bg-gradient-hero overflow-hidden pt-28 pb-20">
    {/* Background photo: public/images/hero-bg.jpg. Falls back to the gradient if missing. */}
    <img
      src="/images/hero-bg.jpg"
      alt=""
      aria-hidden="true"
      onError={(e) => (e.currentTarget.style.display = "none")}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/65 to-charcoal/35 pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-charcoal/80 to-transparent pointer-events-none" />
    <div className="eban-weave absolute inset-0 opacity-[0.045] pointer-events-none" aria-hidden="true" />

    <div className="container mx-auto px-6 relative z-10 my-auto">
      <div className="grid lg:grid-cols-12 gap-14 items-center">
        <div className="lg:col-span-7 animate-fade-up">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white leading-[1.1] mb-6 max-w-2xl">
            Send a package with a traveler who is already flying your route.
          </h1>

          <p className="font-body text-base md:text-lg font-light text-gray-200 max-w-xl mb-10 leading-relaxed">
            Eban connects senders with ID-verified travelers who have spare luggage space. You pay Eban, we hold the money, and the traveler is paid only after you confirm the delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a
              href="#book"
              className="bg-gradient-gold text-charcoal font-body text-sm font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg glow-gold"
            >
              Post a request <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#routes"
              className="border border-white/30 text-white font-body text-sm font-semibold px-8 py-4 rounded-xl hover:border-gold hover:text-gold-light transition-all text-center backdrop-blur-sm"
            >
              See available routes
            </a>
          </div>

          <ul className="space-y-3 max-w-lg border-t border-white/15 pt-8">
            {heroAssurances.map((a) => (
              <li key={a.text} className="flex items-start gap-3 font-body text-sm text-gray-200">
                <a.icon className="w-5 h-5 text-gold-light shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How the money moves: an honest explainer, no made-up people or flights */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="bg-charcoal/80 backdrop-blur-xl border border-gold/25 rounded-2xl p-8 shadow-2xl">
            <h2 className="font-display text-2xl text-white mb-1">Where your money is</h2>
            <p className="font-body text-sm text-gray-300 mb-8">From the moment you pay to the moment you confirm.</p>
            <ol className="relative space-y-7">
              <span className="absolute left-[11px] top-2 bottom-2 w-px bg-gold/30" aria-hidden="true" />
              {moneyJourney.map((step, i) => (
                <li key={step.title} className="relative flex gap-4">
                  <span className="relative z-10 w-6 h-6 rounded-full bg-charcoal border border-gold flex items-center justify-center font-body text-xs font-semibold text-gold-light shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-body text-sm font-semibold text-white">{step.title}</p>
                    <p className="font-body text-sm text-gray-300 mt-0.5">{step.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
    <div className="kente-band absolute inset-x-0 bottom-0" aria-hidden="true" />
  </section>
);

type Role = "sender" | "traveller";

const senderSteps = [
  { icon: FileText, title: "1. Post Your Request", desc: "Describe your package: route, weight, item type and any special instructions. Or browse trips already listed." },
  { icon: Users, title: "2. Pick a Verified Traveler", desc: "Travelers on your route are ID-checked by the Eban team. Book one, or wait for a traveler to claim your request." },
  { icon: Handshake, title: "3. Pay Eban to Hold the Money", desc: "Once accepted, send the payment to Eban with your reference code and tap \"I've sent the payment\". Eban confirms it and holds it safely." },
  { icon: PackageCheck, title: "4. Hand Over the Item", desc: "Agree a meeting place in Messages. The traveler checks the item before taking it." },
  { icon: Plane, title: "5. Track the Delivery", desc: "Your traveler carries the item on their flight and marks it delivered when it arrives." },
  { icon: CheckCircle2, title: "6. Confirm & Rate", desc: "Confirm you received it. The traveler is then paid and you both leave a rating." },
];

const travellerSteps = [
  { icon: ShieldCheck, title: "1. Sign Up & Verify Your ID", desc: "Create a traveler account and upload your ID. An Eban admin reviews it and approves you before you can carry items." },
  { icon: Plane, title: "2. Post Your Trip", desc: "Add your route, flight date and spare luggage space, and set your price per kg. We show suggested rates, but the price is yours to choose." },
  { icon: Users, title: "3. Get Requests", desc: "Senders can book you directly, or you can browse open requests on your route and claim the ones you want." },
  { icon: Lock, title: "4. Wait for Payment Confirmation", desc: "Eban confirms the sender's payment and holds it. You only carry once the payment is secured." },
  { icon: PackageCheck, title: "5. Collect, Check & Fly", desc: "Meet the sender, inspect the item, carry it as agreed, then mark it delivered on arrival." },
  { icon: Award, title: "6. Get Paid & Rated", desc: "When the sender confirms receipt, your earnings are paid out by Eban and you both leave a rating." },
];

const HowItWorks = () => {
  const [role, setRole] = useState<Role>("sender");
  const steps = role === "sender" ? senderSteps : travellerSteps;
  const tabs: { id: Role; label: string }[] = [
    { id: "sender", label: "I am sending a package" },
    { id: "traveller", label: "I am a traveler" },
  ];
  return (
    <section id="how-it-works" className="py-24 bg-background relative border-t border-gold/10">
      <div className="container mx-auto px-6">
        <SectionLabel>How the Marketplace Works</SectionLabel>
        <h2 className="font-display text-3xl md:text-4xl leading-tight max-w-xl text-foreground">
          Six steps from request to delivery
        </h2>
        <p className="font-body text-sm text-muted-foreground max-w-lg mt-4 leading-relaxed">
          EBAN connects you directly with verified travelers on your route. No middlemen, no drop-off centres &mdash; just a structured peer-to-peer marketplace with secure escrow.
        </p>

        <div role="tablist" aria-label="How it works" className="inline-flex mt-10 p-1 rounded-full bg-card border border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={role === t.id}
              onClick={() => setRole(t.id)}
              className={`px-6 py-2.5 rounded-full font-body text-sm transition-colors ${
                role === t.id ? "bg-forest text-white font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ol key={role} className="mt-10 grid md:grid-cols-2 md:gap-x-16 border-t border-border animate-fade-up">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-6 py-8 border-b border-border">
              <span className="font-display text-5xl leading-none text-gold w-12 shrink-0" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="font-display text-xl text-foreground mb-2 flex items-center gap-2.5">
                  <step.icon className="w-5 h-5 text-forest shrink-0" strokeWidth={1.5} />
                  {step.title.replace(/^\d+\.\s*/, "")}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-md">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const eligibleItems = [
  "Official documents, printed certificates, & legal papers",
  "Clothing, apparel, shoes, and luxury accessories",
  "Personal care, sealed cosmetics, and hygiene items",
  "Non-perishable, commercially packaged dried foodstuffs",
  "Small consumer electronics and gadgets",
  "Household gifts compliant with airport customs",
];

const prohibitedItems = [
  "Cash, bank notes, cheques, or bearer bonds",
  "Weapons, ammunition, explosives, or flammables",
  "Unprescribed medicine or controlled substances",
  "Fresh meat, produce, or unsealed perishable food",
  "Customs-restricted luxury items exceeding limits",
  "Any item prohibited by airline or customs regulations",
];

const WhatWeCarry = () => (
  <section id="what-we-carry" className="py-24 bg-background border-t border-gold/10">
    <div className="container mx-auto px-6">
      <SectionLabel>Safety &amp; Compliance</SectionLabel>
      <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight max-w-xl">
        Clear item rules, your responsibility
      </h2>
      <Reveal className="grid md:grid-cols-2 gap-8 mt-16">
        <div className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-3xl p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
              <Check className="w-4 h-4" />
            </div>
            <h3 className="font-display text-2xl font-medium text-foreground">Eligible Cargo</h3>
          </div>
          <ul className="space-y-4">
            {eligibleItems.map((item) => (
              <li key={item} className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="font-body text-sm text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-destructive/20 bg-destructive/[0.02] rounded-3xl p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold">
              <X className="w-4 h-4" />
            </div>
            <h3 className="font-display text-2xl font-medium text-foreground">Prohibited Cargo</h3>
          </div>
          <ul className="space-y-4">
            {prohibitedItems.map((item) => (
              <li key={item} className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="font-body text-sm text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  </section>
);

const trustPillars = [
  {
    icon: ShieldCheck,
    title: "100% ID Verified Travelers",
    desc: "Travelers upload a passport or government photo ID, and our team reviews it. Only approved travelers can be booked or claim requests.",
  },
  {
    icon: Lock,
    title: "Secure Escrow Payments",
    desc: "Your payment is held in escrow and only released to the traveler when you confirm you received the item. If something goes wrong, report an issue and the payment stays frozen while we review it.",
  },
  {
    icon: FileSignature,
    title: "Signed Handover & Ratings",
    desc: "The traveler signs when they take the item, and both sides rate each other after delivery, so reputation builds with every trip.",
  },
];

const TrustSafety = () => (
  <section id="trust" className="py-24 bg-background border-t border-gold/10">
    <div className="container mx-auto px-6">
      <SectionLabel>Trust &amp; Safety</SectionLabel>
      <h2 className="font-display text-3xl md:text-4xl leading-tight max-w-xl text-foreground">
        Trust built in at every step
      </h2>
      <Reveal className="grid sm:grid-cols-3 mt-12 border-t border-border">
        {trustPillars.map((pillar) => (
          <div key={pillar.title} className="py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0 border-b sm:border-b-0 sm:border-r last:border-r-0 border-border">
            <pillar.icon className="w-8 h-8 text-forest mb-5" strokeWidth={1.5} />
            <h3 className="font-display text-xl font-normal text-foreground mb-3">{pillar.title}</h3>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">{pillar.desc}</p>
          </div>
        ))}
      </Reveal>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-charcoal text-white pb-16">
    <div className="kente-band mb-16" aria-hidden="true" />
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
            <img src={ebanSymbol} alt="EBAN" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-display text-2xl font-semibold tracking-[0.18em]">EBAN</span>
            <p className="font-body text-xs text-gold-light">International peer logistics</p>
          </div>
        </div>
        <div className="flex gap-8 font-body text-sm text-gray-300">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#what-we-carry" className="hover:text-white transition-colors">Item rules</a>
          <a href="#trust" className="hover:text-white transition-colors">Trust and safety</a>
          <a href="#book" className="hover:text-white transition-colors">Post a request</a>
        </div>
      </div>
      <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-body text-gray-500 gap-4">
        <p>&copy; {new Date().getFullYear()} EBAN Logistics Network. All rights reserved.</p>
        <p className="text-gray-400">EBAN is a marketplace. Senders and travelers are responsible for what they send and carry.</p>
      </div>
    </div>
  </footer>
);

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground bg-charcoal text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span>Connecting to EBAN Network...</span>
        </div>
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
      <WhatWeCarry />
      <TrustSafety />
      <FeedbackWall />
      <FaqSection />
      <BookingForm />
      <Footer />
    </div>
  );
};

export default Index;

