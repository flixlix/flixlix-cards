import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Github } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { DocsSearch } from "@/components/docs/docs-search";
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
  component: DocsLayout,
});

const SECTION_LABELS: Record<string, string> = {
  "power-flow-card-plus": "Power Flow Card Plus",
  "energy-flow-card-plus": "Energy Flow Card Plus",
  contributing: "How to contribute",
  installation: "Installation",
  configuration: "Configuration",
  examples: "Examples",
};

function humanize(part: string): string {
  if (SECTION_LABELS[part]) return SECTION_LABELS[part];
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
                        <span className="text-muted-foreground">{humanize(segment)}</span>
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
        <main className="px-4 py-6 md:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-5xl xl:max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
