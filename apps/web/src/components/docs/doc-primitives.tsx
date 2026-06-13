import { Check, Copy, Info, Lightbulb, TriangleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "@flixlix-cards/cn";
import { Badge } from "@flixlix-cards/ui/components/badge";
import { Button } from "@flixlix-cards/ui/components/button";

export function PageHeader({
  eyebrow,
  title,
  description,
  badges,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  badges?: { label: string; variant?: "default" | "secondary" | "outline" }[];
}) {
  return (
    <header className="mb-10">
      {eyebrow ? (
        <div className="text-primary mb-3 font-mono text-[11px] font-medium tracking-widest uppercase">
          {eyebrow}
        </div>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{title}</h1>
      {description ? (
        <p className="text-muted-foreground mt-3 max-w-3xl text-base leading-relaxed">
          {description}
        </p>
      ) : null}
      {badges && badges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((b) => (
            <Badge key={b.label} variant={b.variant ?? "secondary"}>
              {b.label}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="from-primary/70 via-primary/25 mt-6 h-px bg-linear-to-r via-40% to-transparent" />
    </header>
  );
}

export function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="mb-2 text-xl font-semibold tracking-tight">
        {id ? (
          <a href={`#${id}`} className="group/anchor">
            {title}
            <span
              aria-hidden
              className="text-primary/70 ml-1.5 text-base opacity-0 transition-opacity group-hover/anchor:opacity-100"
            >
              #
            </span>
          </a>
        ) : (
          title
        )}
      </h2>
      {description ? (
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{description}</p>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-foreground/90 max-w-prose [&>p]:my-3 [&>p]:text-sm [&>p]:leading-relaxed",
        "[&>ul]:my-3 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:text-sm",
        "[&>ol]:my-3 [&>ol]:list-decimal [&>ol]:space-y-1 [&>ol]:pl-5 [&>ol]:text-sm",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  function copy() {
    void navigator.clipboard.writeText(code.trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const copyButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-label="Copy code"
      className="h-6 px-2 text-stone-400 hover:bg-white/10 hover:text-stone-100"
    >
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
    </Button>
  );

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-stone-800 bg-stone-950 shadow-sm dark:border-white/10">
      {filename || language ? (
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 py-1.5 pr-1.5 pl-3.5 font-mono text-[11px] font-medium text-stone-400">
          <span className="inline-flex items-center gap-2">{filename ?? language}</span>
          {copyButton}
        </div>
      ) : (
        <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100">
          {copyButton}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-stone-200">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

export type OptionRow = {
  name: string;
  type: string;
  default?: string;
  description: React.ReactNode;
  required?: boolean;
};

export function OptionsTable({ rows }: { rows: OptionRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
          <tr>
            <th className="border-b px-3 py-2 text-left font-medium">Name</th>
            <th className="border-b px-3 py-2 text-left font-medium">Type</th>
            <th className="border-b px-3 py-2 text-left font-medium">Default</th>
            <th className="border-b px-3 py-2 text-left font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="even:bg-muted/30">
              <td className="border-b px-3 py-2 align-top font-mono text-[12.5px] font-semibold text-amber-700 dark:text-amber-400">
                {row.name}
                {row.required ? (
                  <span className="text-destructive ml-1 text-[10px]" title="required">
                    *
                  </span>
                ) : null}
              </td>
              <td className="text-muted-foreground border-b px-3 py-2 align-top font-mono text-[12px]">
                {row.type}
              </td>
              <td className="text-muted-foreground border-b px-3 py-2 align-top font-mono text-[12px]">
                {row.default ?? "-"}
              </td>
              <td className="border-b px-3 py-2 align-top text-[13px] leading-relaxed">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning" | "tip";
  title?: string;
  children: React.ReactNode;
}) {
  const styles: Record<
    "info" | "warning" | "tip",
    { classes: string; icon: React.ComponentType<{ className?: string }>; fallbackTitle: string }
  > = {
    info: {
      classes: "bg-sky-400/8 text-sky-700 dark:text-sky-300",
      icon: Info,
      fallbackTitle: "Note",
    },
    warning: {
      classes: "bg-amber-400/8 text-amber-700 dark:text-amber-300",
      icon: TriangleAlert,
      fallbackTitle: "Warning",
    },
    tip: {
      classes: "bg-emerald-400/8 text-emerald-700 dark:text-emerald-300",
      icon: Lightbulb,
      fallbackTitle: "Tip",
    },
  };
  const s = styles[variant];
  return (
    <div className={cn("my-4 flex gap-3 rounded-lg p-3.5 text-sm", s.classes)}>
      <s.icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <div className="mb-1 font-semibold">{title ?? s.fallbackTitle}</div>
        <div className="text-foreground/90">{children}</div>
      </div>
    </div>
  );
}

export function NextPageNav({
  prev,
  next,
}: {
  prev?: { label: string; to: string };
  next?: { label: string; to: string };
}) {
  return (
    <nav className="mt-12 grid grid-cols-2 gap-3 text-sm">
      {prev ? (
        <a
          href={prev.to}
          className="group hover:border-primary/50 hover:bg-accent/40 rounded-xl border p-4 transition-colors"
        >
          <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
            ← Previous
          </span>
          <span className="group-hover:text-primary mt-1 block font-medium transition-colors">
            {prev.label}
          </span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={next.to}
          className="group hover:border-primary/50 hover:bg-accent/40 rounded-xl border p-4 text-right transition-colors"
        >
          <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
            Next →
          </span>
          <span className="group-hover:text-primary mt-1 block font-medium transition-colors">
            {next.label}
          </span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}
