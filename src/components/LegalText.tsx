import { Fragment, ReactNode } from "react";

/** Inline: **bold**, *italic*, [text](url). Enough for the legal texts; no HTML is ever injected. */
const inline = (text: string): ReactNode[] => {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++} className="font-semibold text-ink">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(<a key={k++} href={href} className="text-brass-deep underline hover:text-ink">{label}</a>);
    } else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

type Block =
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: { text: string; children: string[] }[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const parse = (md: string): Block[] => {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ kind: "h3", text: line.slice(4) }); i++; continue; }
    if (line.trim().startsWith("|")) {
      const head = cells(line);
      i += 2; // skip the --- row
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      blocks.push({ kind: "table", head, rows });
      continue;
    }
    if (line.startsWith("- ")) {
      const items: { text: string; children: string[] }[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("  - "))) {
        if (lines[i].startsWith("- ")) items.push({ text: lines[i].slice(2), children: [] });
        else items[items.length - 1]?.children.push(lines[i].slice(4));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(### |- |\|)/.test(lines[i])) para.push(lines[i++]);
    blocks.push({ kind: "p", text: para.join(" ") });
  }
  return blocks;
};

/** Renders Eban's legal texts (a small, safe subset of Markdown) in the site's style. */
export const LegalText = ({ md }: { md: string }) => (
  <div className="font-body text-[15px] leading-relaxed text-slate">
    {parse(md).map((b, n) => {
      if (b.kind === "h3") return <h2 key={n} className="font-display text-xl text-ink mt-10 mb-3">{b.text}</h2>;
      if (b.kind === "p") return <p key={n} className="my-3">{inline(b.text)}</p>;
      if (b.kind === "ul")
        return (
          <ul key={n} className="my-3 pl-5 list-disc space-y-1.5 marker:text-brass">
            {b.items.map((it, j) => (
              <li key={j}>
                {inline(it.text)}
                {it.children.length > 0 && (
                  <ul className="mt-1.5 pl-5 list-[circle] space-y-1">
                    {it.children.map((c, x) => <li key={x}>{inline(c)}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        );
      return (
        <div key={n} className="my-5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2">
              <tr>{b.head.map((h, j) => <th key={j} className="text-left font-semibold text-ink px-3 py-2 align-top">{inline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j} className="border-t border-line">
                  {r.map((c, x) => <td key={x} className="px-3 py-2 align-top">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    })}
  </div>
);

export const LegalFragment = Fragment;
