import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  GitPullRequest,
  HeartHandshake,
  ListTree,
  Package,
  Wrench,
  Zap,
} from "lucide-react";
import * as React from "react";

import ThemeToggle from "#/components/theme-toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@flixlix-cards/ui/components/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@flixlix-cards/ui/components/sidebar";

type DocSection = {
  label: string;
  to: string;
  items: { label: string; to: string }[];
};

const SECTIONS: DocSection[] = [
  {
    label: "Power Flow Card Plus",
    to: "/power-flow-card-plus",
    items: [
      { label: "Overview", to: "/power-flow-card-plus" },
      { label: "Installation", to: "/power-flow-card-plus/installation" },
      { label: "Configuration", to: "/power-flow-card-plus/configuration" },
      { label: "Examples", to: "/power-flow-card-plus/examples" },
    ],
  },
  {
    label: "Energy Flow Card Plus",
    to: "/energy-flow-card-plus",
    items: [
      { label: "Overview", to: "/energy-flow-card-plus" },
      { label: "Installation", to: "/energy-flow-card-plus/installation" },
      { label: "Configuration", to: "/energy-flow-card-plus/configuration" },
      { label: "Examples", to: "/energy-flow-card-plus/examples" },
    ],
  },
  {
    label: "Energy Breakdown Card",
    to: "/energy-breakdown-card",
    items: [
      { label: "Overview", to: "/energy-breakdown-card" },
      { label: "Installation", to: "/energy-breakdown-card/installation" },
      { label: "Configuration", to: "/energy-breakdown-card/configuration" },
      { label: "Examples", to: "/energy-breakdown-card/examples" },
    ],
  },
];

const SECTION_ICONS_FOR_LABEL: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: BookOpen,
  Installation: Package,
  Configuration: ListTree,
  Examples: Wrench,
};

function isSectionActive(pathname: string, sectionTo: string): boolean {
  return pathname === sectionTo || pathname.startsWith(`${sectionTo}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Track which sections are explicitly open. Initial state opens any section
  // that matches the current path so the user lands on an open accordion.
  const [openSections, setOpenSections] = React.useState<Set<string>>(
    () => new Set(SECTIONS.filter((s) => isSectionActive(pathname, s.to)).map((s) => s.to))
  );

  // When the route changes, automatically open the section that contains the
  // new page. Sections the user has already opened/closed manually keep their
  // current state.
  React.useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      for (const section of SECTIONS) {
        if (isSectionActive(pathname, section.to)) next.add(section.to);
      }
      return next;
    });
  }, [pathname]);

  function setSectionOpen(sectionTo: string, open: boolean) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) next.add(sectionTo);
      else next.delete(sectionTo);
      return next;
    });
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Zap className="size-4" />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">flixlix-cards</span>
                  <span className="text-muted-foreground truncate text-xs">Documentation</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Getting Started</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link to="/">
                    <BookOpen />
                    <span className="truncate">Introduction</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.to);
          return (
            <Collapsible
              key={section.to}
              title={section.label}
              open={isOpen}
              onOpenChange={(next) => setSectionOpen(section.to, next)}
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground flex items-center text-sm">
                  <span className="truncate">{section.label}</span>
                  <CollapsibleTrigger
                    aria-label={`Toggle ${section.label}`}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring ml-auto inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2"
                  >
                    <ChevronRight className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => {
                        const Icon = SECTION_ICONS_FOR_LABEL[item.label] ?? BookOpen;
                        const isActive = pathname === item.to;
                        return (
                          <SidebarMenuItem key={item.to}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={`${section.label} – ${item.label}`}
                            >
                              <Link to={item.to}>
                                <Icon />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        <SidebarGroup>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/contributing"}>
                  <Link to="/contributing">
                    <HeartHandshake />
                    <span className="truncate">How to contribute</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="GitHub">
                  <a
                    href="https://github.com/flixlix/flixlix-cards"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitPullRequest />
                    <span className="truncate">GitHub</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-1 pb-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <span className="text-muted-foreground truncate text-[11px] leading-tight group-data-[collapsible=icon]:hidden">
            Theme
          </span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
