import ebanSymbol from "@/assets/eban-symbol.png";
import heroImage from "@/assets/hero-students.jpg";
import { Shield, Users, MapPin, Package, Clock, Star, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import BookingForm from "@/components/BookingForm";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={ebanSymbol} alt="EBAN symbol" className="w-9 h-9" />
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">EBAN</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-body text-sm font-medium text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#why-eban" className="hover:text-foreground transition-colors">Why EBAN</a>
          <a href="#book" className="hover:text-foreground transition-colors">Book a Delivery</a>
        </div>
        {user ? (
          <div className="flex items-center gap-4">
            {profile?.role === "Traveller" && (
              <Link to="/traveler" className="font-display text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                My trips
              </Link>
            )}
            {profile?.role === "Admin" && (
              <Link to="/admin/bookings" className="font-display text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            )}
            <span className="hidden sm:inline font-body text-sm text-muted-foreground">
              {profile?.full_name ?? "Account"}
            </span>
            <button onClick={signOut} className="font-display text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="font-display text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="bg-gradient-gold text-accent-foreground font-display font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const Hero = () => (
  <section className="relative min-h-screen flex items-center bg-gradient-hero adinkra-pattern overflow-hidden">
    <div className="absolute inset-0 bg-charcoal/40" />
    <div className="absolute inset-0">
      <img src={heroImage} alt="Students on campus" className="w-full h-full object-cover opacity-30 mix-blend-overlay" />
    </div>
    <div className="container mx-auto px-6 relative z-10 pt-24 pb-16">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <img src={ebanSymbol} alt="EBAN" className="w-12 h-12" />
          <span className="bg-gold/20 text-gold font-display text-xs font-semibold px-3 py-1 rounded-full tracking-wider uppercase">Trusted Delivery Network</span>
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold text-primary-foreground leading-[1.1] mb-6">
          Turn Student Travel Into <span className="text-gradient-gold">Trusted Deliveries</span>
        </h1>
        <p className="font-body text-lg md:text-xl text-primary-foreground/70 max-w-xl mb-10 leading-relaxed">
          EBAN connects senders with student travelers heading the same way. A structured, incentivised peer-to-peer delivery network built on trust.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="#book" className="bg-gradient-gold text-accent-foreground font-display font-semibold px-8 py-4 rounded-lg text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            Book a Delivery <ChevronRight className="w-5 h-5" />
          </a>
          <a href="#how-it-works" className="border border-primary-foreground/30 text-primary-foreground font-display font-semibold px-8 py-4 rounded-lg text-base hover:bg-primary-foreground/10 transition-colors text-center">
            Learn More
          </a>
        </div>
      </div>
    </div>
  </section>
);

const steps = [
  { icon: Package, title: "List Your Package", desc: "Describe what you need delivered and where it's going." },
  { icon: Users, title: "Match with a Traveler", desc: "We connect you with a verified student heading your way." },
  { icon: MapPin, title: "Track & Receive", desc: "Stay updated in real-time until your package arrives safely." },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-24 bg-background">
    <div className="container mx-auto px-6">
      <div className="text-center mb-16">
        <span className="font-display text-sm font-semibold text-gold-dark tracking-wider uppercase">How It Works</span>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-3">Simple. Structured. Secure.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {steps.map((step, i) => (
          <div key={i} className="relative bg-card rounded-2xl p-8 text-center group hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300 border border-border">
            <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center mx-auto mb-6">
              <step.icon className="w-7 h-7 text-accent-foreground" />
            </div>
            <span className="font-display text-xs font-bold text-gold-dark tracking-widest uppercase">Step {i + 1}</span>
            <h3 className="font-display text-xl font-bold text-foreground mt-2 mb-3">{step.title}</h3>
            <p className="font-body text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const features = [
  { icon: Shield, title: "Verified Students", desc: "Every traveler is ID-verified through their institution for maximum trust." },
  { icon: Clock, title: "Incentivised Network", desc: "Travelers earn rewards for every successful delivery — turning travel into income." },
  { icon: Star, title: "Rated & Reviewed", desc: "Community-driven ratings ensure accountability and quality service." },
  { icon: MapPin, title: "Real-Time Tracking", desc: "Know where your package is at every step of the journey." },
];

const WhyEban = () => (
  <section id="why-eban" className="py-24 bg-secondary">
    <div className="container mx-auto px-6">
      <div className="text-center mb-16">
        <span className="font-display text-sm font-semibold text-gold-dark tracking-wider uppercase">Why EBAN</span>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-3">Built on the Symbol of Trust</h2>
        <p className="font-body text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
          The Eban Adinkra symbol represents safety, security, and love. Our platform embodies these values in every delivery.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {features.map((f, i) => (
          <div key={i} className="bg-card rounded-2xl p-7 border border-border hover:border-gold/50 transition-colors duration-300">
            <div className="w-12 h-12 rounded-lg bg-gold/15 flex items-center justify-center mb-5">
              <f.icon className="w-6 h-6 text-gold-dark" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{f.title}</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-charcoal text-primary-foreground py-16">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <img src={ebanSymbol} alt="EBAN" className="w-10 h-10" />
          <span className="font-display text-2xl font-bold">EBAN</span>
        </div>
        <div className="flex gap-8 font-body text-sm text-primary-foreground/60">
          <a href="#how-it-works" className="hover:text-primary-foreground transition-colors">How It Works</a>
          <a href="#why-eban" className="hover:text-primary-foreground transition-colors">Why EBAN</a>
          <a href="#book" className="hover:text-primary-foreground transition-colors">Book</a>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 mt-10 pt-8 text-center">
        <p className="font-body text-sm text-primary-foreground/40">© {new Date().getFullYear()} EBAN. Trusted peer-to-peer delivery for students.</p>
      </div>
    </div>
  </footer>
);

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <Hero />
    <HowItWorks />
    <WhyEban />
    <BookingForm />
    <Footer />
  </div>
);

export default Index;
