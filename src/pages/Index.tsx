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
  <div className="flex items-center gap-3 mb-4">
    <span className="w-8 h-px bg-gold-dark" />
    <span className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark">{children}</span>
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
            <span className="font-body text-[9px] font-medium tracking-[0.2em] uppercase text-gold-light">Global Logistics</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-body text-xs font-medium tracking-[0.15em] uppercase text-gray-300">
          <a href="#how-it-works" className="hover:text-gold-light transition-colors">Process</a>
          <a href="#what-we-carry" className="hover:text-gold-light transition-colors">Guidelines</a>
          <a href="#trust" className="hover:text-gold-light transition-colors">Trust &amp; Verification</a>
          <a href="#book" className="hover:text-gold-light transition-colors">Post a Request</a>
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
              <Link to="/traveler" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-gold-light hover:text-white transition-colors">
                My Trips
              </Link>
            )}
            {profile?.role === "Sender" && (
              <Link to="/sender/requests" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-gold-light hover:text-white transition-colors">
                My Requests
              </Link>
            )}
            {profile?.role === "Admin" && (
              <Link to="/admin/bookings" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-gold-light hover:text-white transition-colors">
                Admin Suite
              </Link>
            )}
            <button
              onClick={signOut}
              className="border border-gold/30 hover:border-gold text-gold-light font-body text-xs font-semibold tracking-[0.1em] uppercase px-4 py-2 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="font-body text-xs font-semibold tracking-[0.1em] uppercase text-gray-300 hover:text-white transition-colors px-3 py-2">
              Log In
            </Link>
            <Link
              to="/signup"
              className="bg-gradient-gold text-charcoal font-body text-xs font-bold tracking-[0.15em] uppercase px-6 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md glow-gold"
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
  <section className="relative min-h-screen flex flex-col justify-center bg-gradient-hero overflow-hidden pt-28 pb-16">
    {/* Background photo (optional): public/images/hero-bg.jpg. Falls back to the gradient if missing. */}
    <img
      src="/images/hero-bg.jpg"
      alt=""
      aria-hidden="true"
      onError={(e) => (e.currentTarget.style.display = "none")}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/65 to-charcoal/35 pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-charcoal/80 to-transparent pointer-events-none" />
    {/* Ambient Glow Elements */}
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gold/10 rounded-full blur-[140px] pointer-events-none" />
    <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

    <img
      src={ebanSymbol}
      alt=""
      aria-hidden="true"
      className="absolute -right-20 top-1/2 -translate-y-1/2 w-[650px] h-[650px] object-contain opacity-[0.04] pointer-events-none select-none"
    />

    <div className="container mx-auto px-6 relative z-10 my-auto">
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 animate-fade-up">
          <div className="inline-flex items-center gap-2.5 bg-gold/10 border border-gold/30 backdrop-blur-md px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="font-body text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-light">
              P2P Air Cargo Network
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-light text-white leading-[1.08] mb-6">
            Send packages with travelers <em className="italic text-gold-light font-normal">already on your route.</em>
          </h1>

          <p className="font-body text-base md:text-lg font-light text-gray-300 max-w-xl mb-10 leading-relaxed">
            EBAN is a marketplace that connects senders with ID-verified travelers who have spare baggage allowance. You agree the details with the traveler, and your payment is held in escrow until you confirm delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-14">
            <a
              href="#book"
              className="bg-gradient-gold text-charcoal font-body text-xs font-bold tracking-[0.15em] uppercase px-8 py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg glow-gold"
            >
              Post a Request <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="border border-white/20 text-gray-200 font-body text-xs font-semibold tracking-[0.15em] uppercase px-8 py-4 rounded-xl hover:border-gold hover:text-gold-light transition-all text-center backdrop-blur-sm"
            >
              How it works
            </a>
          </div>

          {/* Stats Ticker Bar */}
          <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8 max-w-lg">
            <div>
              <span className="font-mono text-2xl md:text-3xl font-bold text-gold-light">100%</span>
              <p className="font-body text-xs text-gray-400 mt-1">ID-verified to be booked</p>
            </div>
            <div>
              <span className="font-mono text-2xl md:text-3xl font-bold text-white">Escrow</span>
              <p className="font-body text-xs text-gray-400 mt-1">Paid out on your OK</p>
            </div>
            <div>
              <span className="font-mono text-2xl md:text-3xl font-bold text-gold-light">P2P</span>
              <p className="font-body text-xs text-gray-400 mt-1">You agree the handover</p>
            </div>
          </div>
        </div>

        {/* Hero Interactive Flight Card Graphic */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="bg-charcoal/80 backdrop-blur-2xl border border-gold/20 rounded-3xl p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-body text-xs font-semibold uppercase tracking-widest text-gray-300">Live Trip Board</span>
              </div>
              <span className="font-mono text-xs text-gold-light font-bold">FLIGHT EBN-842</span>
            </div>

            <div className="py-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-3xl font-bold text-white">ACC</span>
                  <p className="font-body text-xs text-gray-400">Accra, Ghana</p>
                </div>

                <div className="flex-1 flex flex-col items-center px-4">
                  <div className="w-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gold" />
                    <div className="h-px bg-gold/40 flex-1 relative flex items-center justify-center">
                      <Plane className="w-5 h-5 text-gold absolute -top-2.5 animate-pulse" />
                    </div>
                    <span className="w-2 h-2 rounded-full bg-gold" />
                  </div>
                  <span className="font-body text-[10px] uppercase font-semibold text-gold-light tracking-widest mt-2">6.5 Hours Flight</span>
                </div>

                <div className="text-right">
                  <span className="font-mono text-3xl font-bold text-white">JFK</span>
                  <p className="font-body text-xs text-gray-400">New York, USA</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Luggage Allowance</span>
                  <span className="text-gold-light font-semibold">12 kg Available</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Traveler Verified</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> ID & Passport Confirmed
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-bold text-xs">
                  KA
                </div>
                <div>
                  <p className="font-body text-xs font-semibold text-white">Kwame A.</p>
                  <p className="font-body text-[10px] text-gray-400">Verified Traveler</p>
                </div>
              </div>
              <a href="#book" className="bg-gold/10 hover:bg-gold/20 text-gold-light border border-gold/30 font-body text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                Browse Trips
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    { id: "sender", label: "For senders" },
    { id: "traveller", label: "For travelers" },
  ];
  return (
    <section id="how-it-works" className="py-24 bg-background relative border-t border-gold/10">
      <div className="container mx-auto px-6">
        <SectionLabel>How the Marketplace Works</SectionLabel>
        <h2 className="font-display text-4xl md:text-5xl font-light leading-tight max-w-xl text-foreground">
          Six steps from <em className="italic text-gold-dark">request to delivery</em>
        </h2>
        <p className="font-body text-sm text-muted-foreground max-w-lg mt-4 leading-relaxed">
          EBAN connects you directly with verified travelers on your route. No middlemen, no drop-off centres &mdash; just a structured peer-to-peer marketplace with secure escrow.
        </p>

        <div role="tablist" aria-label="How it works" className="inline-flex mt-10 p-1 rounded-full bg-card border border-border shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={role === t.id}
              onClick={() => setRole(t.id)}
              className={`px-6 py-2.5 rounded-full font-body text-xs tracking-wider uppercase transition-colors ${
                role === t.id ? "bg-gold text-charcoal font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div key={role} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 animate-fade-up">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group bg-card border border-border hover:border-gold/50 shadow-sm hover:shadow-md p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-6 text-gold group-hover:bg-gold group-hover:text-accent-foreground transition-colors">
                <step.icon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl font-normal text-foreground mb-2">{step.title}</h3>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
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
      <h2 className="font-display text-4xl md:text-5xl font-light text-foreground leading-tight max-w-xl">
        Clear item rules, <em className="italic font-normal text-gold-dark">your responsibility</em>
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
      <h2 className="font-display text-4xl md:text-5xl font-light leading-tight max-w-xl text-foreground">
        Trust built in <em className="italic text-gold-dark">at every step</em>
      </h2>
      <Reveal className="grid sm:grid-cols-3 gap-8 mt-16">
        {trustPillars.map((pillar) => (
          <div key={pillar.title} className="bg-card border border-border shadow-sm rounded-2xl p-8 hover:border-gold/50 hover:shadow-md transition-all">
            <pillar.icon className="w-8 h-8 text-gold mb-6" strokeWidth={1.5} />
            <h3 className="font-display text-xl font-normal text-foreground mb-3">{pillar.title}</h3>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">{pillar.desc}</p>
          </div>
        ))}
      </Reveal>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-charcoal text-white py-16 border-t border-gold/15">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
            <img src={ebanSymbol} alt="EBAN" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-display text-2xl font-semibold tracking-[0.18em]">EBAN</span>
            <p className="font-body text-[10px] uppercase tracking-widest text-gold-light">International Peer Logistics</p>
          </div>
        </div>
        <div className="flex gap-8 font-body text-xs tracking-[0.1em] uppercase text-gray-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">Process</a>
          <a href="#what-we-carry" className="hover:text-white transition-colors">Guidelines</a>
          <a href="#trust" className="hover:text-white transition-colors">Security</a>
          <a href="#book" className="hover:text-white transition-colors">Post a Request</a>
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

