import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

type FaqLink = { label: string; to: string };

type Faq = { question: string; answer: string; links: FaqLink[] };

const FAQS: Faq[] = [
  {
    question: "How do I show solar and battery power flow in Home Assistant?",
    answer:
      "Install Power Flow Card Plus from Home Assistant's Marketplace (or HACS before 2026.11), edit a dashboard, add the card and pick your grid, solar and battery power sensors in its editor. It draws live power moving between them and your home. Home Flow Card reads the same sensors and draws them as a little isometric house.",
    links: [
      { label: "Install Power Flow Card Plus", to: "/power-flow-card-plus/installation" },
      { label: "Install Home Flow Card", to: "/home-flow-card/installation" },
    ],
  },
  {
    question: "How is Power Flow Card Plus different from the built-in energy distribution card?",
    answer:
      "The built-in card shows energy totals from the Energy dashboard for the selected period. Power Flow Card Plus shows live power from any sensors you choose, and adds up to four individual devices, secondary info on every circle, clickable entities, your own colors and a full visual editor. For period totals with the same extras, use Energy Flow Card Plus.",
    links: [
      { label: "Power Flow Card Plus", to: "/power-flow-card-plus" },
      { label: "Energy Flow Card Plus", to: "/energy-flow-card-plus" },
    ],
  },
  {
    question: "Which card should I use?",
    answer:
      "For live watts, Power Flow Card Plus draws the classic circles and Home Flow Card draws a house, which can also show energy over the dashboard's period with `mode: energy`. For kilowatt-hours over a day, week or year, Energy Flow Card Plus draws the flow, Energy Breakdown Card shows which devices used it, and Energy Period Selector Plus picks the period for both.",
    links: [
      { label: "Home Flow Card", to: "/home-flow-card" },
      { label: "Energy Breakdown Card", to: "/energy-breakdown-card" },
      { label: "Energy Period Selector Plus", to: "/energy-period-selector-plus" },
    ],
  },
  {
    question: "Do I need the Energy dashboard set up?",
    answer:
      "Not for live power: Power Flow Card Plus and Home Flow Card read your power sensors directly. Anything that shows energy over a period (Energy Flow Card Plus, Energy Breakdown Card and Home Flow Card's energy mode) adds up energy sensors, the same way the built-in energy distribution card does, so those sensors need long-term statistics.",
    links: [{ label: "Energy Flow Card Plus setup", to: "/energy-flow-card-plus/configuration" }],
  },
  {
    question: "My battery or grid flows the wrong way. How do I fix it?",
    answer:
      "Sensors disagree on which direction is positive. Set `invert_state: true` on that entity, or give the card separate entities for import and export, or for charging and discharging.",
    links: [{ label: "Grid and battery options", to: "/power-flow-card-plus/configuration" }],
  },
  {
    question: "Do I have to write YAML?",
    answer:
      "No. Every card has a visual editor in the dashboard, and YAML is there when you want it. The cards are free and MIT licensed, with the source on GitHub.",
    links: [{ label: "Examples to copy", to: "/power-flow-card-plus/examples" }],
  },
];

const plainText = (answer: string) => answer.replace(/`/g, "");

export const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: plainText(answer) },
  })),
};

function AnswerText({ answer }: { answer: string }) {
  return (
    <>
      {answer.split("`").map((part, index) =>
        index % 2 === 1 ? (
          <code key={part} className="bg-muted rounded px-1.5 py-0.5 text-[13px]">
            {part}
          </code>
        ) : (
          part
        )
      )}
    </>
  );
}

export function HomeFaq() {
  return (
    <section
      id="faq"
      className="grid scroll-mt-20 grid-cols-1 gap-x-12 gap-y-6 border-t pt-12 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
    >
      <h2 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] lg:sticky lg:top-24 lg:self-start">
        Common questions
      </h2>
      <div className="divide-y border-b">
        {FAQS.map(({ question, answer, links }) => (
          <details key={question} className="group">
            <summary className="press flex cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
              <h3 className="text-[17px] leading-snug font-medium text-pretty">{question}</h3>
              <Plus
                aria-hidden
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 ease-(--ease-out-strong) group-open:rotate-45 motion-reduce:transition-none"
              />
            </summary>
            <div className="max-w-[62ch] pr-10 pb-6">
              <p className="text-foreground/80 text-[15px] leading-relaxed text-pretty">
                <AnswerText answer={answer} />
              </p>
              <nav aria-label={`More on: ${question}`} className="mt-4 flex flex-wrap gap-1.5">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="press bg-card hover:bg-accent rounded-full border px-3 py-1 text-[13px] font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
