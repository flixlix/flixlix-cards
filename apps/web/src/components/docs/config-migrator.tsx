import * as React from "react";

import { type Migration, migratePowerFlowCard } from "@/lib/migrate-power-flow-card";
import { Textarea } from "@flixlix-cards/ui/components/textarea";

import { CodeBlock } from "./doc-primitives";

const PLACEHOLDER = `type: custom:power-flow-card
entities:
  grid: sensor.grid_power
  ...`;

const WAITING: Partial<Record<Migration["status"], string>> = {
  empty: "Your Power Flow Card Plus config appears here.",
  invalid: "Fix the YAML on the left to see the Power Flow Card Plus config.",
};

const waitingText = (migration: Migration) => {
  if (migration.status === "no-card") {
    return migration.alreadyPlus
      ? "This is already a Power Flow Card Plus config. There is nothing to convert."
      : "No custom:power-flow-card found in what you pasted.";
  }
  return WAITING[migration.status];
};

/** Paste a `custom:power-flow-card` config and get the Power Flow Card Plus config for it. */
export function ConfigMigrator() {
  const [pasted, setPasted] = React.useState("");
  const migration = React.useMemo(() => migratePowerFlowCard(pasted), [pasted]);
  const error = migration.status === "invalid" ? migration.message : undefined;

  return (
    <div data-llms-skip className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
      <div className="min-w-0">
        <div className="focus-within:ring-ring/70 my-3 overflow-hidden rounded-xl border border-stone-800 bg-stone-950 shadow-sm focus-within:ring-2 dark:border-white/10">
          <label
            htmlFor="power-flow-card-config"
            className="block border-b border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-[11px] font-medium text-stone-400"
          >
            Your power-flow-card config
          </label>
          <Textarea
            id="power-flow-card-config"
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "power-flow-card-config-error" : undefined}
            className="min-h-56 resize-y rounded-none border-0 bg-transparent p-4 font-mono text-xs leading-relaxed text-stone-200 shadow-none outline-none placeholder:text-stone-600 md:text-xs dark:bg-transparent"
          />
        </div>
        {error ? (
          <p
            id="power-flow-card-config-error"
            className="text-destructive px-1 font-mono text-xs whitespace-pre-wrap"
          >
            {error}
          </p>
        ) : null}
      </div>
      <div className="min-w-0" aria-live="polite">
        {migration.status === "migrated" ? (
          <>
            <CodeBlock language="yaml" filename="power-flow-card-plus" code={migration.yaml} />
            {migration.leftOut.length > 0 ? (
              <div className="text-muted-foreground px-1 text-sm leading-relaxed">
                <p className="text-foreground font-medium">Not carried over</p>
                <ul className="[&_code]:bg-muted mt-1 space-y-1 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px]">
                  {migration.leftOut.map((entry) => (
                    <li key={entry.option}>
                      <code>{entry.option}</code> {entry.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground my-3 flex min-h-56 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-balance md:h-[calc(100%-1.5rem)]">
            {waitingText(migration)}
          </p>
        )}
      </div>
    </div>
  );
}
