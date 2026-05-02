import { ChevronDown } from "lucide-react";

import { cn } from "@flixlix-cards/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@flixlix-cards/ui/components/collapsible";

import type { OptionRow } from "./doc-primitives";

/**
 * Splits the type cell into individual pills so unions read more naturally.
 * Falls back to a single pill if there's no obvious separator.
 */
function splitTypes(raw: string): string[] {
  return raw
    .split(/[|/]|\sor\s/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

const TYPE_TONE: Record<string, string> = {
  string: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  number: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  boolean: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  object: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  array: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  css: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
};

function tokenTone(token: string): string {
  const lower = token.toLowerCase();
  for (const [key, tone] of Object.entries(TYPE_TONE)) {
    if (lower.includes(key)) return tone;
  }
  return "bg-muted text-muted-foreground";
}

function TypePills({ types }: { types: string }) {
  const items = splitTypes(types);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {items.map((t) => (
        <span
          key={t}
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium",
            tokenTone(t)
          )}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

function OptionItem({ row }: { row: OptionRow }) {
  const anchor = `option-${row.name.replace(/[^a-z0-9_-]/gi, "-")}`;
  return (
    <div
      id={anchor}
      className="hover:border-l-primary/60 group relative scroll-mt-24 border-l-2 border-transparent py-3.5 pl-4 pr-2 transition-colors"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <a
          href={`#${anchor}`}
          aria-label={`Anchor for ${row.name}`}
          className="font-mono text-sm font-semibold tracking-tight"
        >
          {row.name}
          {row.required ? <span className="text-destructive ml-0.5">*</span> : null}
        </a>
        <TypePills types={row.type} />
        {row.default ? (
          <span className="text-muted-foreground text-[11px]">
            default{" "}
            <code className="bg-muted text-foreground/80 rounded px-1 py-0.5 font-mono text-[11px]">
              {row.default}
            </code>
          </span>
        ) : null}
        {row.required ? (
          <span className="border-destructive/30 bg-destructive/10 text-destructive ml-auto rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            required
          </span>
        ) : null}
      </div>
      <div className="text-foreground/80 mt-1.5 text-[13px] leading-relaxed">{row.description}</div>
    </div>
  );
}

export type OptionListAdvancedConfig = {
  rows: OptionRow[];
  /** Optional descriptive hint shown after the count, e.g. "flow rate, styling, …" */
  hint?: string;
};

export function OptionList({
  rows,
  advanced,
  className,
}: {
  rows: OptionRow[];
  advanced?: OptionListAdvancedConfig;
  className?: string;
}) {
  return (
    <div className={cn("bg-card overflow-hidden rounded-lg border shadow-sm", className)}>
      <div className="divide-border divide-y">
        {rows.map((row) => (
          <OptionItem key={row.name} row={row} />
        ))}

        {advanced && advanced.rows.length > 0 ? (
          <Collapsible className="group/advanced">
            <CollapsibleTrigger className="bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors">
              <span className="flex flex-wrap items-center gap-2">
                <span className="bg-background text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Advanced
                </span>
                <span className="text-foreground/80">
                  {advanced.rows.length} more option{advanced.rows.length === 1 ? "" : "s"}
                </span>
                {advanced.hint ? (
                  <span className="text-muted-foreground/80 hidden text-xs font-normal sm:inline">
                    · {advanced.hint}
                  </span>
                ) : null}
              </span>
              <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/advanced:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="divide-border border-border divide-y border-t">
                {advanced.rows.map((row) => (
                  <OptionItem key={row.name} row={row} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
