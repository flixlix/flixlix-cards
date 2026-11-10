import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarRange,
  ChartPie,
  ChevronRight,
  Coffee,
  Github,
  HeartHandshake,
  House,
  LayoutGrid,
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
  group: "Live power" | "Energy over time" | "Beyond energy";
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; to: string }[];
};

const SECTIONS: DocSection[] = [
  {
    group: "Live power",
    label: "Power Flow Card Plus",
    to: "/power-flow-card-plus",
    icon: Sparkles,
    items: [
      { label: "Overview", to: "/power-flow-card-plus" },
      { label: "Installation", to: "/power-flow-card-plus/installation" },
      { label: "Configuration", to: "/power-flow-card-plus/configuration" },
      { label: "Examples", to: "/power-flow-card-plus/examples" },
      { label: "Playground", to: "/power-flow-card-plus/playground" },
    ],
  },
  {
    group: "Live power",
    label: "Home Flow Card",
    to: "/home-flow-card",
    icon: House,
    items: [
      { label: "Overview", to: "/home-flow-card" },
      { label: "Installation", to: "/home-flow-card/installation" },
      { label: "Configuration", to: "/home-flow-card/configuration" },
      { label: "Examples", to: "/home-flow-card/examples" },
      { label: "Playground", to: "/home-flow-card/playground" },
    ],
  },
  {
    group: "Energy over time",
    label: "Energy Flow Card Plus",
    to: "/energy-flow-card-plus",
    icon: Zap,
    items: [
      { label: "Overview", to: "/energy-flow-card-plus" },
      { label: "Installation", to: "/energy-flow-card-plus/installation" },
      { label: "Configuration", to: "/energy-flow-card-plus/configuration" },
      { label: "Examples", to: "/energy-flow-card-plus/examples" },
      { label: "Playground", to: "/energy-flow-card-plus/playground" },
    ],
  },
  {
    group: "Energy over time",
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
    group: "Energy over time",
    label: "Energy Period Selector Plus",
    to: "/energy-period-selector-plus",
    icon: CalendarRange,
    items: [
      { label: "Overview", to: "/energy-period-selector-plus" },
      { label: "Installation", to: "/energy-period-selector-plus/installation" },
      { label: "Configuration", to: "/energy-period-selector-plus/configuration" },
      { label: "Examples", to: "/energy-period-selector-plus/examples" },
      { label: "Playground", to: "/energy-period-selector-plus/playground" },
    ],
  },
  {
    group: "Beyond energy",
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

// Collapsed, the group labels slide away; without their padding too, the gap between groups
// would stay far wider than the gap between icons within one.
const COLLAPSING_GROUP =
  "transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:py-0";

const GROUPS: DocSection["group"][] = ["Live power", "Energy over time", "Beyond energy"];

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
  const [previousPathname, setPreviousPathname] = React.useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setOpenSections((prev) => {
      const next = new Set(prev);
      for (const section of SECTIONS) {
        if (isSectionActive(pathname, section.to)) {
          next.add(section.to);
        }
      }
      return next;
    });
  }

  function setSectionOpen(sectionTo: string, open: boolean) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(sectionTo);
      } else {
        next.delete(sectionTo);
      }
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
                <div className="bg-foreground text-solar dark:bg-secondary flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Zap className="size-4 fill-current" />
                </div>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate font-semibold tracking-[-0.01em]">flixlix-cards</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Cards for Home Assistant
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden transition-[gap] duration-200 ease-linear group-data-[collapsible=icon]:gap-1">
        <SidebarGroup className={COLLAPSING_GROUP}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="All cards">
                  <Link to="/">
                    <LayoutGrid />
                    <span>All cards</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GROUPS.map((group) => (
          <SidebarGroup key={group} className={COLLAPSING_GROUP}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECTIONS.filter((section) => section.group === group).map((section) => (
                  <Collapsible
                    key={section.to}
                    asChild
                    open={openSections.has(section.to)}
                    onOpenChange={(next) => setSectionOpen(section.to, next)}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={section.label}
                        isActive={isSectionActive(pathname, section.to)}
                        className="[&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-foreground"
                      >
                        <Link to={section.to}>
                          <section.icon />
                          <span>{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction
                          aria-label={`Show ${section.label} pages`}
                          className="text-muted-foreground hover:text-foreground transition-transform duration-200 ease-(--ease-out-strong) data-[state=open]:rotate-90"
                        >
                          <ChevronRight />
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden duration-200 ease-(--ease-out-strong) motion-reduce:animate-none">
                        <SidebarMenuSub className="mr-0 ml-[1.0625rem] py-1 pr-1">
                          {section.items.map((item) => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === item.to}
                                className="text-muted-foreground hover:text-foreground data-[active=true]:text-foreground relative overflow-visible hover:bg-transparent data-[active=true]:bg-transparent data-[active=true]:font-medium before:absolute before:inset-y-1 before:-left-[11.5px] before:w-0.5 before:rounded-full data-[active=true]:before:bg-solar"
                              >
                                <Link to={item.to}>
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className={COLLAPSING_GROUP}>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/contributing"}
                  tooltip="How to contribute"
                  className="[&>svg]:text-muted-foreground"
                >
                  <Link to="/contributing">
                    <HeartHandshake />
                    <span>How to contribute</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Source on GitHub"
                  className="[&>svg]:text-muted-foreground"
                >
                  <a
                    href="https://github.com/flixlix/flixlix-cards"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github />
                    <span className="flex-1">Source on GitHub</span>
                    <ArrowUpRight aria-label="opens in a new tab" className="size-3.5!" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="relative overflow-x-clip [overflow-clip-margin:4px]">
          {/* As wide as its link, so the hover stops short of the theme toggle beside it. */}
          <SidebarMenu className="w-fit">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Buy me a coffee"
                className="text-muted-foreground hover:text-foreground"
              >
                <a href="https://ko-fi.com/flixlix" target="_blank" rel="noopener noreferrer">
                  <Coffee className="text-solar-ink" />
                  <span>Buy me a coffee</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {/* Pinned to the expanded edge, so the collapsing sidebar closes over it instead of
              pushing it onto the coffee icon. */}
          <ThemeToggle className="absolute top-1/2 left-[calc(var(--sidebar-width)-1rem-2px)] -translate-x-full -translate-y-1/2 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
