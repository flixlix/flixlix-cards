import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ChartPie,
  ChevronRight,
  GitPullRequest,
  HeartHandshake,
  ListOrdered,
  Sparkles,
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@flixlix-cards/ui/components/sidebar";

type DocSection = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; to: string }[];
};

const SECTIONS: DocSection[] = [
  {
    label: "Power Flow Card Plus",
    to: "/power-flow-card-plus",
    icon: Sparkles,
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
    icon: Zap,
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
    icon: ChartPie,
    items: [
      { label: "Overview", to: "/energy-breakdown-card" },
      { label: "Installation", to: "/energy-breakdown-card/installation" },
      { label: "Configuration", to: "/energy-breakdown-card/configuration" },
      { label: "Examples", to: "/energy-breakdown-card/examples" },
    ],
  },
  {
    label: "Sortable List Card",
    to: "/sortable-list-card",
    icon: ListOrdered,
    items: [
      { label: "Overview", to: "/sortable-list-card" },
      { label: "Installation", to: "/sortable-list-card/installation" },
      { label: "Configuration", to: "/sortable-list-card/configuration" },
      { label: "Examples", to: "/sortable-list-card/examples" },
    ],
  },
];

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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm">
                  <Zap className="size-4 fill-current" />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="font-display truncate font-bold tracking-tight">
                    flixlix-cards
                  </span>
                  <span className="text-muted-foreground truncate text-xs">Documentation</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Getting Started</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Introduction">
                  <Link to="/">
                    <BookOpen />
                    <span className="truncate">Introduction</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>The Cards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECTIONS.map((section) => {
                const isOpen = openSections.has(section.to);
                return (
                  <Collapsible
                    key={section.to}
                    asChild
                    open={isOpen}
                    onOpenChange={(next) => setSectionOpen(section.to, next)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={section.label}
                        isActive={isSectionActive(pathname, section.to)}
                      >
                        <Link to={section.to}>
                          <section.icon />
                          <span className="truncate">{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction
                          aria-label={`Toggle ${section.label}`}
                          className="transition-transform duration-200 data-[state=open]:rotate-90"
                        >
                          <ChevronRight />
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-none">
                          {section.items.map((item) => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton asChild isActive={pathname === item.to}>
                                <Link to={item.to}>
                                  <span className="truncate">{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/contributing"}
                  tooltip="How to contribute"
                >
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
        <div className="flex items-center justify-between gap-2 px-1 pb-1 group-data-[collapsible=icon]:hidden">
          <span className="text-muted-foreground truncate text-[11px] leading-tight">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
