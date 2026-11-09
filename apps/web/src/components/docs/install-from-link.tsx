import { Button } from "@flixlix-cards/ui/components/button";

import { trackEvent } from "#/lib/analytics";

import { Callout, Prose, Section } from "./doc-primitives";

/**
 * How to install a card that is not in the default catalog: from its link, in Home Assistant's
 * Marketplace (2026.11 and newer) or as a custom repository in HACS (2026.10 and older).
 */
export function InstallFromLink({
  title,
  repoUrl,
  redirect,
}: {
  title: string;
  repoUrl: string;
  /** The My Home Assistant link that opens the repository, in the Marketplace or HACS. */
  redirect: string;
}) {
  return (
    <>
      <Callout variant="info" title="Not in the default catalog yet">
        <strong>{title}</strong> is installed from its link: the button below opens it in your Home
        Assistant, in the Marketplace on 2026.11 and newer or in HACS before that.
      </Callout>

      <Button asChild className="mb-10">
        <a
          href={redirect}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("Open in Home Assistant", { card: title })}
        >
          Open in Home Assistant
        </a>
      </Button>

      <Section title="Marketplace (Home Assistant 2026.11 and newer)" id="marketplace">
        <Prose>
          <ol>
            <li>
              Go to <strong>Settings → Marketplace</strong>.
            </li>
            <li>
              In the upper-right corner, select <strong>Add from link</strong>, enter{" "}
              <code>{repoUrl}</code> and select <strong>Add</strong>. The Marketplace asks you to
              connect GitHub first if you haven&apos;t yet.
            </li>
            <li>
              Open <strong>{title}</strong> in the list and select <strong>Install</strong>. The
              Marketplace adds it as a dashboard resource.
            </li>
            <li>Reload your browser.</li>
          </ol>
        </Prose>
      </Section>

      <Section title="HACS (Home Assistant 2026.10 and older)" id="hacs">
        <Prose>
          <ol>
            <li>
              In Home Assistant, open <strong>HACS</strong>.
            </li>
            <li>
              Click the <strong>⋮</strong> menu in the top-right and choose{" "}
              <strong>Custom repositories</strong>.
            </li>
            <li>
              Add the repository URL <code>{repoUrl}</code> with category <strong>Dashboard</strong>
              , then click <strong>Add</strong>.
            </li>
            <li>
              Search for <strong>{title}</strong> in HACS and click <strong>Download</strong>.
            </li>
            <li>Reload your dashboard / clear browser cache.</li>
          </ol>
        </Prose>
      </Section>
    </>
  );
}
