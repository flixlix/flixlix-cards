import { Link } from "@tanstack/react-router";

import { Button } from "@flixlix-cards/ui/components/button";

import { trackEvent } from "#/lib/analytics";

import { Prose, Section } from "./doc-primitives";

/**
 * How to install a card that is in the default catalog, which Home Assistant's Marketplace
 * (2026.11 and newer) and HACS (2026.10 and older) share.
 */
export function InstallFromCatalog({
  title,
  redirect,
  examplesPath,
}: {
  title: string;
  /** The My Home Assistant link that opens the repository, in the Marketplace or HACS. */
  redirect: string;
  examplesPath: string;
}) {
  return (
    <Section title="Marketplace or HACS (recommended)" id="hacs">
      <Prose>
        <p>
          The card is in the default catalog, which Home Assistant&apos;s{" "}
          <strong>Marketplace</strong> (2026.11 and newer) and <strong>HACS</strong> (before
          2026.11) share.
        </p>
        <ol>
          <li>
            Go to <strong>Settings → Marketplace</strong>, or open <strong>HACS</strong> before
            2026.11, and search for <strong>{title}</strong>.
          </li>
          <li>
            Select <strong>Install</strong> (<strong>Download</strong> in HACS) and confirm.
          </li>
          <li>
            Reload your dashboard, then add the card via the UI or paste the YAML from the{" "}
            <Link to={examplesPath}>Examples</Link> page.
          </li>
        </ol>
      </Prose>
      <Button asChild variant="outline" size="sm">
        <a
          href={redirect}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("Open in Home Assistant", { card: title })}
        >
          Open in Home Assistant
        </a>
      </Button>
    </Section>
  );
}
