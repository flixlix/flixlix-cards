import { Bug, Lightbulb } from "lucide-react";

import { trackEvent } from "#/lib/analytics";
import { type IssueCard, type IssueKind, newIssueUrl } from "#/lib/issues";
import { Button } from "@flixlix-cards/ui/components/button";

const LINKS: { kind: IssueKind; label: string; icon: typeof Bug }[] = [
  { kind: "bug", label: "Report a bug", icon: Bug },
  { kind: "feature", label: "Request a feature", icon: Lightbulb },
];

export function SupportLinks({ card }: { card: IssueCard }) {
  return (
    <aside
      data-llms-skip
      aria-label="Support"
      className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3.5"
    >
      <div className="text-sm">
        <p className="font-medium">Something broken or missing?</p>
        <p className="text-muted-foreground">Open an issue on GitHub for the {card}.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {LINKS.map(({ kind, label, icon: Icon }) => (
          <Button key={kind} asChild size="sm" variant="outline">
            <a
              href={newIssueUrl(kind, card)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("Open issue", { kind, card })}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </a>
          </Button>
        ))}
      </div>
    </aside>
  );
}
