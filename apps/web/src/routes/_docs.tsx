import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Github } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { DocsSearch } from "@/components/docs/docs-search";
import { pageHead } from "@/lib/seo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@flixlix-cards/ui/components/breadcrumb";
import { Button } from "@flixlix-cards/ui/components/button";
import { Separator } from "@flixlix-cards/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@flixlix-cards/ui/components/sidebar";

export const Route = createFileRoute("/_docs")({
  head: ({ matches }) => pageHead(matches.at(-1)?.pathname ?? "/"),
  component: DocsLayout,
});

const SECTION_LABELS: Record<string, string> = {
  "power-flow-card-plus": "Power Flow Card Plus",
  "home-flow-card": "Home Flow Card",
  "energy-flow-card-plus": "Energy Flow Card Plus",
  "energy-breakdown-card": "Energy Breakdown Card",
  "energy-period-selector-plus": "Energy Period Selector Plus",
  contributing: "How to contribute",
  installation: "Installation",
  configuration: "Configuration",
  examples: "Examples",
};

const CARD_ROOTS = {
  "power-flow-card-plus": "/power-flow-card-plus",
  "home-flow-card": "/home-flow-card",
  "energy-flow-card-plus": "/energy-flow-card-plus",
  "energy-breakdown-card": "/energy-breakdown-card",
  "energy-period-selector-plus": "/energy-period-selector-plus",
  "sortable-list-card": "/sortable-list-card",
} as const;

const cardRoot = (segment: string) =>
  Object.entries(CARD_ROOTS).find(([slug]) => slug === segment)?.[1];

function humanize(part: string): string {
  if (SECTION_LABELS[part]) {
    return SECTION_LABELS[part];
  }
  return part
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function DocsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="hidden lg:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Docs</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {segments.length > 0 ? <BreadcrumbSeparator /> : null}
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                return (
                  <span key={segment} className="contents">
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{humanize(segment)}</BreadcrumbPage>
                      ) : (
                        <ParentCrumb segment={segment} />
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex flex-1 items-center justify-end gap-2 lg:flex-none">
            <DocsSearch className="lg:w-80" />
            <Button asChild size="sm" variant="ghost">
              <a
                href="https://github.com/flixlix/flixlix-cards"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
              >
                <Github className="size-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-x-clip px-4 py-6 md:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-5xl xl:max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="mt-auto border-t px-4 py-6 md:px-8 lg:px-12">
          <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 text-xs xl:max-w-7xl">
            <p>Made by Luca, in the hope that these cards make your dashboard a little nicer.</p>
            <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href="https://github.com/flixlix/flixlix-cards/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground decoration-solar font-medium underline-offset-4 hover:underline"
              >
                MIT License
              </a>
              <a
                href="https://github.com/flixlix"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground decoration-solar font-medium underline-offset-4 hover:underline"
              >
                @flixlix
              </a>
            </p>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ParentCrumb({ segment }: { segment: string }) {
  const to = cardRoot(segment);
  if (!to) {
    return <span className="text-muted-foreground">{humanize(segment)}</span>;
  }
  return (
    <BreadcrumbLink asChild>
      <Link to={to}>{humanize(segment)}</Link>
    </BreadcrumbLink>
  );
}
