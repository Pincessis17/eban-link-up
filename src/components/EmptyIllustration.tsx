// Hand-drawn SVG illustrations for empty states. Colours come from the theme tokens
// (tailwind fill-*/stroke-* classes), so they follow any palette change.

const PlaneScene = () => (
  <svg viewBox="0 0 240 150" className="w-full h-full" role="img" aria-label="A plane flying over clouds">
    {/* clouds */}
    <g className="fill-secondary">
      <ellipse cx="52" cy="38" rx="26" ry="9" />
      <ellipse cx="68" cy="31" rx="15" ry="10" />
      <ellipse cx="184" cy="112" rx="30" ry="10" />
      <ellipse cx="202" cy="104" rx="16" ry="10" />
      <ellipse cx="196" cy="30" rx="18" ry="6" />
    </g>
    {/* flight path */}
    <path d="M22 124 C 62 122, 90 100, 112 76" fill="none" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" className="stroke-forest" />
    <circle cx="22" cy="124" r="5" className="fill-gold" />
    <circle cx="22" cy="124" r="9" fill="none" strokeWidth="1.5" className="stroke-gold" />
    {/* plane */}
    <g transform="translate(142 62) rotate(-14)">
      <path d="M-4 4 L-26 38 L-9 38 L24 6Z" className="fill-forest" />
      <path d="M-46 -2 L-58 -28 L-43 -28 L-26 -8Z" className="fill-forest" />
      <path d="M-50 0 C-50 -9 -32 -13 0 -13 L38 -13 C54 -13 62 -5 62 0 C62 5 54 9 38 9 L0 9 C-32 9 -50 7 -50 0Z" className="fill-charcoal" />
      <path d="M-42 0 H54" strokeWidth="2.5" strokeLinecap="round" className="stroke-gold" />
      <g className="fill-secondary">
        <circle cx="-12" cy="-4" r="2.2" /><circle cx="-2" cy="-4" r="2.2" /><circle cx="8" cy="-4" r="2.2" /><circle cx="18" cy="-4" r="2.2" />
      </g>
    </g>
  </svg>
);

const PackageScene = () => (
  <svg viewBox="0 0 240 150" className="w-full h-full" role="img" aria-label="A parcel tied with a woven band">
    <ellipse cx="120" cy="136" rx="62" ry="7" className="fill-muted" />
    {/* box body and lid */}
    <path d="M64 62 L92 38 H188 L168 62Z" className="fill-gold" />
    <rect x="64" y="62" width="104" height="68" className="fill-secondary stroke-charcoal" strokeWidth="2" />
    <path d="M168 62 L188 38 V104 L168 130Z" className="fill-muted stroke-charcoal" strokeWidth="2" strokeLinejoin="round" />
    <path d="M64 62 L92 38 H188 L168 62Z" fill="none" className="stroke-charcoal" strokeWidth="2" strokeLinejoin="round" />
    {/* woven band */}
    <rect x="104" y="62" width="24" height="68" className="fill-forest" />
    <g className="fill-gold">
      <rect x="104" y="72" width="12" height="8" /><rect x="116" y="88" width="12" height="8" /><rect x="104" y="104" width="12" height="8" /><rect x="116" y="120" width="12" height="8" />
    </g>
    <g className="fill-kente-red">
      <rect x="116" y="72" width="12" height="8" /><rect x="104" y="88" width="12" height="8" /><rect x="116" y="104" width="12" height="8" />
    </g>
    <path d="M104 62 L132 38 H156 L128 62Z" className="fill-forest" />
    {/* tag */}
    <path d="M160 76 C 176 84, 180 96, 176 110" fill="none" strokeWidth="1.5" className="stroke-charcoal" />
    <rect x="166" y="108" width="20" height="14" rx="2" className="fill-gold stroke-charcoal" strokeWidth="1.5" />
    <circle cx="171" cy="115" r="1.6" className="fill-charcoal" />
    {/* motion marks */}
    <g strokeWidth="2" strokeLinecap="round" className="stroke-gold">
      <path d="M30 70 H48" /><path d="M20 84 H44" /><path d="M32 98 H46" />
    </g>
  </svg>
);

export const EmptyIllustration = ({ kind, className = "" }: { kind: "plane" | "package"; className?: string }) => (
  <div className={`mx-auto mb-5 w-44 h-28 ${className}`}>
    {kind === "plane" ? <PlaneScene /> : <PackageScene />}
  </div>
);
