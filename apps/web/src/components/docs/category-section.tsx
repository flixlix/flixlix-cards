import { Link } from "@tanstack/react-router";
import * as React from "react";

import { cn } from "@flixlix-cards/cn";

import { CodeBlock } from "./doc-primitives";

export type AccentColor =
  | "blue"
  | "orange"
  | "pink"
  | "primary"
  | "green"
  | "violet"
  | "amber"
  | "rose"
  | "slate"
  | "cyan";

// Section accents mirror the entity colors used inside the cards themselves.
const ACCENT_DOT: Record<AccentColor, string> = {
  blue: "bg-sky-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  primary: "bg-primary",
  green: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  cyan: "bg-cyan-500",
};

export type CategorySectionProps = {
  id: string;
  title: string;
  description?: React.ReactNode;
  intro?: React.ReactNode;
  accent?: AccentColor;
  example?: { language: string; code: string; filename?: string };
  /** Quick-jump links rendered inline under the header. */
  jumpTo?: { label: string; to: string }[];
  children: React.ReactNode;
};

export function CategorySection({
  id,
  title,
  description,
  intro,
  accent = "slate",
  example,
  jumpTo,
  children,
}: CategorySectionProps) {
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className="mb-5">
        <h2 className="text-foreground flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span aria-hidden className={cn("size-2 shrink-0 rounded-full", ACCENT_DOT[accent])} />
          <a href={`#${id}`}>{title}</a>
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
        ) : null}
        {jumpTo && jumpTo.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {jumpTo.map((j) => (
              <Link
                key={j.to}
                to={j.to}
                className="bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors"
              >
                {j.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {intro ? <div className="mb-4 text-sm leading-relaxed">{intro}</div> : null}

      {example ? (
        <div className="mb-4">
          <CodeBlock
            language={example.language}
            filename={example.filename ?? "example.yaml"}
            code={example.code}
          />
        </div>
      ) : null}

      {children}
    </section>
  );
}
