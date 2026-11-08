import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { EbanLogo } from "@/components/AppNav";

const NotFound = () => (
  <div className="min-h-screen bg-paper flex flex-col">
    <header>
      <div className="container mx-auto flex h-16 items-center"><EbanLogo to="/?view=site" /></div>
      <div className="kente-rail" />
    </header>
    <main className="flex-1 flex items-center justify-center px-6 py-20 text-center">
      <div>
        <img src={ebanSymbol} alt="" className="w-16 h-16 mx-auto" />
        <p className="font-body text-xs font-semibold tracking-[0.14em] text-brass-deep mt-4">404</p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mt-3">This route doesn't exist.</h1>
        <p className="font-body text-slate mt-4 max-w-sm mx-auto">The page may have moved, or the link is wrong. The open routes are still where you left them.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/" className="inline-flex h-11 items-center justify-center gap-2 px-5 rounded-lg bg-brass font-body text-sm font-semibold text-ink hover:bg-[#CB9A22]">Go home <ArrowRight className="w-4 h-4" /></Link>
          <Link to="/?view=site#routes" className="inline-flex h-11 items-center justify-center px-5 rounded-lg border border-line bg-white font-body text-sm font-semibold text-ink hover:bg-paper-2">Browse open routes</Link>
        </div>
      </div>
    </main>
  </div>
);

export default NotFound;
