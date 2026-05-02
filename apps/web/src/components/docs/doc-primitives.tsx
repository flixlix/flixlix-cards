import { Check, Copy } from "lucide-react";
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
    <header className="mb-8 border-b pb-6">
      {eyebrow ? (
        <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
          {eyebrow}
        </div>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
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
      <h2 className="border-border mb-2 text-xl font-semibold tracking-tight">{title}</h2>
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

  return (
    <div className="bg-muted/60 group relative my-3 overflow-hidden rounded-md border">
      {filename || language ? (
        <div className="text-muted-foreground flex items-center justify-between border-b bg-muted px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide">
          <span>{filename ?? language}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copy}
            aria-label="Copy code"
            className="h-6 px-2"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
      ) : (
        <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copy}
            aria-label="Copy code"
            className="h-6 px-2"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-muted-foreground">
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
              <td className="border-b px-3 py-2 align-top font-mono text-[12.5px] font-medium">
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
  const colors: Record<string, string> = {
    info: "bg-blue-400/7 text-blue-700 dark:text-blue-300",
    warning: "bg-amber-400/7 text-amber-700 dark:text-amber-300",
    tip: "bg-emerald-400/7 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className={cn("my-3 rounded-md p-3 text-sm", colors[variant])}>
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      <div className="text-foreground/90">{children}</div>
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
    <nav className="mt-12 flex items-center justify-between gap-3 border-t pt-6 text-sm">
      <div>
        {prev ? (
          <a
            href={prev.to}
            className="hover:text-primary text-muted-foreground inline-flex flex-col gap-0.5 transition"
          >
            <span className="text-[11px] uppercase tracking-wide">Previous</span>
            <span className="font-medium">← {prev.label}</span>
          </a>
        ) : null}
      </div>
      <div className="text-right">
        {next ? (
          <a
            href={next.to}
            className="hover:text-primary text-muted-foreground inline-flex flex-col gap-0.5 transition"
          >
            <span className="text-[11px] uppercase tracking-wide">Next</span>
            <span className="font-medium">{next.label} →</span>
          </a>
        ) : null}
      </div>
    </nav>
  );
}
