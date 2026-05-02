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

const ACCENT_CLASSES: Record<AccentColor, { bg: string; text: string; ring: string; bar: string }> =
  {
    blue: {
      bg: "bg-sky-500/10",
      text: "text-sky-700 dark:text-sky-300",
      ring: "ring-sky-500/20",
      bar: "bg-sky-500",
    },
    orange: {
      bg: "bg-orange-500/10",
      text: "text-orange-700 dark:text-orange-300",
      ring: "ring-orange-500/20",
      bar: "bg-orange-500",
    },
    pink: {
      bg: "bg-pink-500/10",
      text: "text-pink-700 dark:text-pink-300",
      ring: "ring-pink-500/20",
      bar: "bg-pink-500",
    },
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      ring: "ring-primary/20",
      bar: "bg-primary",
    },
    green: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      ring: "ring-emerald-500/20",
      bar: "bg-emerald-500",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-700 dark:text-violet-300",
      ring: "ring-violet-500/20",
      bar: "bg-violet-500",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-300",
      ring: "ring-amber-500/20",
      bar: "bg-amber-500",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-300",
      ring: "ring-rose-500/20",
      bar: "bg-rose-500",
    },
    slate: {
      bg: "bg-slate-500/10",
      text: "text-slate-700 dark:text-slate-300",
      ring: "ring-slate-500/20",
      bar: "bg-slate-500",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-700 dark:text-cyan-300",
      ring: "ring-cyan-500/20",
      bar: "bg-cyan-500",
    },
  };

export type CategorySectionProps = {
  id: string;
  title: string;
  description?: React.ReactNode;
  intro?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
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
  icon: Icon,
  accent = "slate",
  example,
  jumpTo,
  children,
}: CategorySectionProps) {
  const a = ACCENT_CLASSES[accent];
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className={cn("mb-5 flex gap-3", description ? "items-start" : "items-center")}>
        {Icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
              a.bg,
              a.text,
              a.ring
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
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
