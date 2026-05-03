import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bug,
  GitBranch,
  GitPullRequest,
  Github,
  Hammer,
  HardDrive,
  Heart,
  Package,
  Rocket,
  Terminal,
} from "lucide-react";

import {
  Callout,
  CodeBlock,
  NextPageNav,
  PageHeader,
  Prose,
  Section,
} from "@/components/docs/doc-primitives";
import { Button } from "@flixlix-cards/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flixlix-cards/ui/components/card";

export const Route = createFileRoute("/_docs/contributing")({
  component: ContributingPage,
});

function ContributingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Project"
        title="How to contribute"
        description="Thanks for your interest in improving flixlix-cards! This guide walks you through setting up the monorepo, working on a card, and getting your changes merged."
        badges={[{ label: "Monorepo" }, { label: "pnpm" }, { label: "Changesets" }]}
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild>
          <a
            href="https://github.com/flixlix/flixlix-cards"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="size-4" /> Open the repo
          </a>
        </Button>
        <Button asChild variant="outline">
          <a
            href="https://github.com/flixlix/flixlix-cards/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Bug className="size-4" /> Report an issue
          </a>
        </Button>
      </div>

      <Section id="prerequisites" title="1. Prerequisites">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="size-4" /> Node.js
              </CardTitle>
              <CardDescription>LTS recommended</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <a href="https://nodejs.org/en/download" target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" /> pnpm
              </CardTitle>
              <CardDescription>Package manager</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <a href="https://pnpm.io/installation" target="_blank" rel="noopener noreferrer">
                  Install
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="size-4" /> Docker
              </CardTitle>
              <CardDescription>Optional, for dev Home Assistant instance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <a
                  href="https://www.docker.com/get-started/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get started
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="repo-layout" title="2. Repository layout">
        <Prose>
          <p>
            <code>flixlix-cards</code> is a Turborepo + pnpm monorepo. Each card is its own package
            in <code>packages/flixlix-cards</code>. The docs site you're reading right now lives in{" "}
            <code>apps/web</code>.
          </p>
        </Prose>
        <CodeBlock
          language="text"
          code={`flixlix-cards/
├─ apps/
│  └─ web/                      # this docs site
├─ packages/
│  ├─ flixlix-cards/
│  │  ├─ power-flow-card-plus/
│  │  └─ energy-flow-card-plus/
│  │  └─ energy-breakdown-card/
│  ├─ shared/                   # shared utilities & i18n
│  ├─ ui/                       # shadcn-style UI primitives
│  └─ tooling/                  # eslint, prettier, tsconfig presets
├─ pnpm-workspace.yaml
└─ turbo.json`}
        />
      </Section>

      <Section id="setup" title="3. Local setup">
        <Prose>
          <p>
            Fork the repo on GitHub, clone your fork, and install dependencies once at the root.
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`git clone https://github.com/<your-username>/flixlix-cards.git
cd flixlix-cards
pnpm install`}
        />
      </Section>

      <Section id="working-on-a-card" title="4. Working on a card">
        <Prose>
          <p>
            Move into the package you want to change and start the dev build. Most card packages
            ship a <code>dev</code> script that watches the source and rebuilds the bundle.
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`cd packages/flixlix-cards/power-flow-card-plus
pnpm dev`}
        />
        <Callout variant="tip" title="Local Home Assistant">
          To test the card end-to-end, you need a Home Assistant instance. From the repo root you
          can spin one up via Docker:
          <br />
          <code>pnpm start:hass</code>
          <br />
          Then open <code>http://localhost:8123</code> and add the local resource{" "}
          <code>http://&lt;your-ip&gt;:5001/&lt;card-filename&gt;.js</code> to your dashboard.
        </Callout>
      </Section>

      <Section id="docs-site" title="5. Working on the docs site">
        <Prose>
          <p>
            The site you are reading is in <code>apps/web</code>. Run it locally with:
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`cd apps/web
pnpm dev`}
        />
        <Prose>
          <p>
            Routes live in <code>src/routes</code>. The docs use TanStack Router's file-based
            routing, adding a new file under <code>src/routes/_docs/</code> automatically appears on
            the site.
          </p>
        </Prose>
      </Section>

      <Section id="quality" title="6. Code quality checks">
        <Prose>
          <p>Before pushing, run the same checks CI runs.</p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`pnpm format:check   # prettier
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest`}
        />
        <Callout variant="info">
          Each package also has a <code>precommit</code> script that runs the relevant subset.
        </Callout>
      </Section>

      <Section id="changesets" title="7. Add a changeset">
        <Prose>
          <p>
            We use{" "}
            <a
              href="https://github.com/changesets/changesets"
              target="_blank"
              rel="noopener noreferrer"
            >
              Changesets
            </a>{" "}
            to manage versions and generate release notes for the published cards.
          </p>
          <p>If your change affects a released card, run:</p>
        </Prose>
        <CodeBlock language="bash" code={`pnpm changeset`} />
        <Prose>
          <p>
            Pick the affected packages, pick the bump type (<code>patch</code>, <code>minor</code>,
            or <code>major</code>) and write a clear summary. The summary appears in the next
            release notes.
          </p>
        </Prose>
      </Section>

      <Section id="commit" title="8. Commit, push, open a PR">
        <Prose>
          <ol>
            <li>
              Create a feature branch: <code>git checkout -b feat/your-feature</code>.
            </li>
            <li>
              Commit using a clear message, we use Conventional Commits style (<code>feat:</code>,{" "}
              <code>fix:</code>, <code>chore:</code>, etc.).
            </li>
            <li>
              Push your branch and open a pull request against <code>main</code>.
            </li>
            <li>
              Mention any relevant GitHub issues. Screenshots / GIFs help a lot for UI changes.
            </li>
          </ol>
        </Prose>
        <CodeBlock
          language="bash"
          code={`git checkout -b feat/grid-color-toggle
git add .
git commit -m "feat(power-flow): add color toggle for grid icon"
git push -u origin feat/grid-color-toggle`}
        />
      </Section>

      <Section id="review" title="9. Review &amp; release">
        <Prose>
          <p>
            A maintainer will review your PR, request changes if needed, and merge once it's ready.
            Releases are automated by the changesets bot, once your changeset is merged into{" "}
            <code>main</code>, a release PR is opened that bumps versions and publishes new
            artifacts to HACS / GitHub.
          </p>
        </Prose>
      </Section>

      <Section id="ideas" title="Need ideas?">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bug className="size-4" /> Triage issues
              </CardTitle>
              <CardDescription>
                Reproduce bug reports and confirm whether they still happen on the latest version.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Hammer className="size-4" /> Tackle a TODO
              </CardTitle>
              <CardDescription>
                Each card has a to-do list in its README, improvements, new options, more language
                support.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="size-4" /> New card
              </CardTitle>
              <CardDescription>
                Build a new card on top of the shared utilities, open an issue first to coordinate.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>

      <Section id="thanks" title="Thanks!">
        <Prose>
          <p className="flex items-center gap-2">
            <Heart className="size-4 text-red-500" /> Every contribution, code, docs, bug reports,
            or sharing the project, keeps this monorepo alive. Thank you.
          </p>
        </Prose>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <a
              href="https://github.com/flixlix/flixlix-cards/pulls"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitPullRequest className="size-4" /> Open pull requests
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href="https://github.com/flixlix/flixlix-cards/branches"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitBranch className="size-4" /> Branches
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/">← Back to docs home</Link>
          </Button>
        </div>
      </Section>

      <NextPageNav prev={{ label: "Examples", to: "/energy-flow-card-plus/examples" }} />
    </>
  );
}
