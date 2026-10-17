import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SUPPORT_WHATSAPP_URL } from "@/lib/siteConfig";

const FAQS: Record<string, { q: string; a: string }[]> = {
  General: [
    {
      q: "What is Eban?",
      a: "Eban is a marketplace that connects people who need something sent with ID-verified travelers who have spare luggage space on a flight they're already taking. Eban doesn't carry anything itself. You agree the details with the traveler.",
    },
    {
      q: "How does it work?",
      a: "Browse trips or post a request. Once you and a traveler agree on a price, the traveler accepts and you pay. The traveler collects your item, flies, and hands it over. When you confirm you've received it, the payment is released to them.",
    },
    {
      q: "Who can be a traveler?",
      a: "Anyone with an upcoming flight who signs up as a traveler and passes our ID check. Travelers post their route, spare space and price, and can say what they won't carry.",
    },
    {
      q: "Which routes are available?",
      a: "Whatever travelers have posted. The Available routes section on this page shows where there is open space right now, and it changes as new trips are added.",
    },
  ],
  "Safety & Security": [
    {
      q: "How are travelers verified?",
      a: "Every traveler uploads an ID (passport, national ID, driver's licence or student ID). An Eban team member reviews it, and only approved travelers can be booked or claim requests.",
    },
    {
      q: "What can't I send?",
      a: "Nothing illegal, dangerous or restricted by the airline or by customs in either country. Travelers can also list items they won't carry, and they can decline any request.",
    },
    {
      q: "What if something goes wrong?",
      a: "Use Report an issue on your request. The payment stays held while the Eban team looks into what happened. Eban is a marketplace, so you and the traveler are responsible for the item and its handover. Check what you're sending and agree the handover clearly in the messages.",
    },
    {
      q: "Is my payment safe?",
      a: "Your payment is held by Eban and only released to the traveler after you confirm you received your item.",
    },
  ],
  "Pricing & Payments": [
    {
      q: "How much does it cost to send a package?",
      a: "Each traveler sets their own price per kg, and you see it before you book. We show travelers suggested rates as a guide, but they can charge what they like. Right now Eban doesn't add a fee on top.",
    },
    {
      q: "How do I pay?",
      a: "Once the traveler accepts, you'll see Eban's bank details and a reference code. Send the amount with that reference and tap \"I've sent the payment\". Eban confirms it arrived and then your request moves forward. More payment options are planned.",
    },
    {
      q: "How does the traveler get paid?",
      a: "After you confirm delivery, Eban pays the traveler their share.",
    },
    {
      q: "Are there size or weight limits?",
      a: "Yes. Each traveler lists how many kg they have free, and your item has to fit that and follow airline rules. The limit is shown on each trip before you book.",
    },
  ],
};

export const FaqSection = () => {
  const tabs = Object.keys(FAQS);
  const [tab, setTab] = useState(tabs[0]);

  return (
    <section id="faq" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-14">
          <div className="flex flex-col">
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark mb-4">FAQ</p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight text-foreground">
              Questions, <em className="italic text-gold-dark">answered</em>
            </h2>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mt-5">
              The basics of sending with Eban, how travelers are checked, and how payments work.
            </p>
            {SUPPORT_WHATSAPP_URL && (
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 self-start inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-5 py-3 rounded-xl text-xs font-body font-bold tracking-wider uppercase hover:opacity-90 shadow-sm"
              >
                Contact support <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-6" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-full text-xs font-body font-semibold transition-colors border ${
                    tab === t ? "bg-charcoal text-gold-light border-charcoal" : "bg-card text-muted-foreground border-border hover:border-gold/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Accordion key={tab} type="single" collapsible className="space-y-3">
              {FAQS[tab].map((f, i) => (
                <AccordionItem key={f.q} value={`${tab}-${i}`} className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-gold/50 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="font-display text-base text-left text-foreground hover:no-underline py-5">{f.q}</AccordionTrigger>
                  <AccordionContent className="font-body text-sm text-muted-foreground leading-relaxed pb-5">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};
