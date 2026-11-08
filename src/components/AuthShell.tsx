import { EbanLogo } from "@/components/AppNav";

export const authInput =
  "w-full h-11 bg-white border border-line rounded-lg px-3.5 font-body text-sm text-ink placeholder:text-slate/60 focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/25 transition-colors";
export const authLabel = "font-body text-[13px] font-semibold text-ink mb-1.5 block";

/** Split sign-in layout: form on paper, airport photo on the right, kente along the top. */
export const AuthShell = ({ headline, children }: { headline: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-paper flex flex-col">
    <div className="kente-rail" />
    <div className="flex-1 grid lg:grid-cols-[minmax(420px,0.8fr)_1.2fr]">
      <div className="flex flex-col px-6 sm:px-12 lg:px-16 py-10">
        <EbanLogo to="/?view=site" sub="Peer delivery" />
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[380px] py-10">{children}</div>
        </div>
      </div>
      <div className="relative hidden lg:block overflow-hidden bg-ink-2">
        <img src="/images/hero-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/10" />
        <div className="absolute left-12 right-12 bottom-14 text-paper">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-brass mb-3">Send · Carry · Deliver</p>
          <h2 className="font-display text-4xl leading-tight max-w-md">{headline}</h2>
          <p className="font-body text-paper/75 mt-3 max-w-md">Every traveller is ID-checked. Every payment is held until the parcel arrives.</p>
          <div className="flex gap-10 mt-8">
            {[["100%", "ID checked"], ["48h", "to pay after a match"], ["Escrow", "until receipt"]].map(([n, l]) => (
              <div key={l}>
                <p className="font-display text-2xl text-brass">{n}</p>
                <p className="font-body text-xs text-paper/65 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
