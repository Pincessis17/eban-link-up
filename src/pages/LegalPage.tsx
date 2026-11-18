import { Link } from "react-router-dom";
import { EbanLogo } from "@/components/AppNav";
import { LegalText } from "@/components/LegalText";
import { PRIVACY_MD, TERMS_MD } from "@/lib/legal";

/** /terms and /privacy: readable by anyone, signed in or not. */
const LegalPage = ({ doc }: { doc: "terms" | "privacy" }) => {
  const title = doc === "terms" ? "Terms of Service" : "Privacy Policy";
  return (
    <div className="min-h-screen bg-paper">
      <div className="kente-rail" />
      <header className="container mx-auto flex h-16 items-center justify-between">
        <EbanLogo />
        <nav className="flex gap-5 font-body text-sm">
          <Link to="/terms" className={doc === "terms" ? "text-ink font-semibold" : "text-slate hover:text-ink"}>Terms</Link>
          <Link to="/privacy" className={doc === "privacy" ? "text-ink font-semibold" : "text-slate hover:text-ink"}>Privacy</Link>
        </nav>
      </header>
      <main className="container mx-auto max-w-3xl py-10 md:py-14">
        <p className="eyebrow mb-3">Legal</p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight text-ink mb-4">{title}</h1>
        <LegalText md={doc === "terms" ? TERMS_MD : PRIVACY_MD} />
      </main>
    </div>
  );
};

export default LegalPage;
