import { useRouter } from "@tanstack/react-router";
import {
  Airplay,
  CornerDownLeft,
  Hash,
  ListTree,
  Moon,
  Search,
  Sparkles,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { setThemeMode } from "#/lib/theme";
import { cn } from "@flixlix-cards/cn";

import { searchDocs, SUGGESTED_GROUPS, type SearchEntry } from "./docs-search-index";

const TYPE_ICONS: Record<SearchEntry["type"], React.ComponentType<{ className?: string }>> = {
  page: Search,
  section: Hash,
  option: ListTree,
  example: Wrench,
};

const TYPE_LABELS: Record<SearchEntry["type"], string> = {
  page: "Page",
  section: "Section",
  option: "Option",
  example: "Example",
};

type Command = {
  id: string;
  title: string;
  description: string;
  /** Extra words the command should match besides its title. */
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: () => void;
};

const THEME_COMMANDS: Command[] = [
  {
    id: "theme-light",
    title: "Light theme",
    description: "Switch the docs to the light theme",
    keywords: "theme light mode appearance color scheme",
    icon: Sun,
    perform: () => setThemeMode("light"),
  },
  {
    id: "theme-dark",
    title: "Dark theme",
    description: "Switch the docs to the dark theme",
    keywords: "theme dark mode appearance color scheme night",
    icon: Moon,
    perform: () => setThemeMode("dark"),
  },
  {
    id: "theme-auto",
    title: "System theme",
    description: "Follow your operating system's appearance",
    keywords: "theme system auto mode appearance color scheme",
    icon: Airplay,
    perform: () => setThemeMode("auto"),
  },
];

function matchCommands(query: string): Command[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return THEME_COMMANDS;
  return THEME_COMMANDS.filter((c) => {
    const haystack = `${c.title} ${c.keywords}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200/60 text-foreground rounded-sm px-0.5 dark:bg-amber-400/30">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

type MenuItem = { kind: "doc"; entry: SearchEntry } | { kind: "command"; command: Command };

type Group = { label: string; items: MenuItem[] };

export function DocsSearch({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setIsMac(/(Mac|iPhone|iPad|iPod)/i.test(navigator.platform));
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock body scroll when open
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search documentation"
        className={cn(
          "border-input bg-background hover:bg-accent/40 text-muted-foreground inline-flex h-9 w-full items-center gap-2 rounded-md border px-2.5 text-sm shadow-sm transition-colors",
          className
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">Search docs…</span>
        <kbd className="border-input bg-muted hidden rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline-block">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>

      {mounted && open
        ? createPortal(<CommandMenu onClose={() => setOpen(false)} />, document.body)
        : null}
    </>
  );
}

function CommandMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const groups: Group[] = React.useMemo(() => {
    const trimmed = query.trim();
    const commandGroup = (commands: Command[]): Group[] =>
      commands.length > 0
        ? [
            {
              label: "Commands",
              items: commands.map((command) => ({ kind: "command", command }) as MenuItem),
            },
          ]
        : [];

    if (!trimmed) {
      return [
        ...SUGGESTED_GROUPS.filter((g) => g.entries.length > 0).map((g) => ({
          label: g.label,
          items: g.entries.map((entry) => ({ kind: "doc", entry }) as MenuItem),
        })),
        ...commandGroup(THEME_COMMANDS),
      ];
    }

    const results = searchDocs(query, 24);
    const commands = commandGroup(matchCommands(trimmed));
    if (results.length === 0) return commands;
    // group by type for a richer command-menu feel
    const order: SearchEntry["type"][] = ["page", "section", "option", "example"];
    const buckets = new Map<SearchEntry["type"], SearchEntry[]>();
    for (const entry of results) {
      const list = buckets.get(entry.type) ?? [];
      list.push(entry);
      buckets.set(entry.type, list);
    }
    return [
      ...order
        .map((type) => ({
          label: { page: "Pages", section: "Sections", option: "Options", example: "Examples" }[
            type
          ],
          items: (buckets.get(type) ?? []).map((entry) => ({ kind: "doc", entry }) as MenuItem),
        }))
        .filter((g) => g.items.length > 0),
      ...commands,
    ];
  }, [query]);

  const flatEntries = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);

  React.useEffect(() => setActiveIndex(0), [query]);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the active item visible
  React.useEffect(() => {
    if (!listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function navigateTo(entry: SearchEntry) {
    const [pathname, hash] = entry.to.split("#");
    void router.navigate({ to: pathname, hash: hash ?? undefined });
    onClose();
  }

  function runItem(item: MenuItem) {
    if (item.kind === "doc") {
      navigateTo(item.entry);
    } else {
      item.command.perform();
      onClose();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flatEntries.length === 0 ? 0 : (i + 1) % flatEntries.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        flatEntries.length === 0 ? 0 : (i - 1 + flatEntries.length) % flatEntries.length
      );
    } else if (e.key === "Enter") {
      const item = flatEntries[activeIndex];
      if (item) {
        e.preventDefault();
        runItem(item);
      }
    }
  }

  // Track the running index across groups so highlight + arrow nav stay correct
  let runningIndex = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]"
    >
      <button
        type="button"
        aria-label="Close search"
        className="bg-background/70 fixed inset-0 -z-10 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-popover text-popover-foreground flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl">
        {/* Search bar */}
        <div className="border-border relative flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls="docs-command-list"
            aria-activedescendant={
              flatEntries[activeIndex] ? `command-item-${activeIndex}` : undefined
            }
            className="placeholder:text-muted-foreground flex-1 bg-transparent py-3 text-sm outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground rounded-sm p-1"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground border-input rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium"
            onClick={onClose}
          >
            ESC
          </button>
        </div>

        {/* Results / suggestions */}
        <div
          ref={listRef}
          id="docs-command-list"
          role="listbox"
          className="flex-1 overflow-y-auto py-2"
        >
          {groups.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            groups.map((group, gi) => (
              <div key={`${group.label}-${gi}`} className="px-1 py-1">
                <div className="text-muted-foreground flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider">
                  {!query && gi === 0 ? <Sparkles className="size-3" /> : null}
                  {group.label}
                </div>
                <ul className="flex flex-col">
                  {group.items.map((item) => {
                    const idx = runningIndex++;
                    const active = idx === activeIndex;
                    const Icon =
                      item.kind === "doc" ? TYPE_ICONS[item.entry.type] : item.command.icon;
                    const title = item.kind === "doc" ? item.entry.title : item.command.title;
                    const description =
                      item.kind === "doc" ? item.entry.description : item.command.description;
                    const typeLabel =
                      item.kind === "doc" ? TYPE_LABELS[item.entry.type] : "Command";
                    const key = item.kind === "doc" ? item.entry.to : item.command.id;
                    return (
                      <li key={`${key}-${idx}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          id={`command-item-${idx}`}
                          data-index={idx}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => runItem(item)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50 text-foreground"
                          )}
                        >
                          <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">
                                {highlight(title, query)}
                              </span>
                              <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wide">
                                {typeLabel}
                              </span>
                            </div>
                            {description ? (
                              <div className="text-muted-foreground truncate text-xs">
                                {highlight(description, query)}
                              </div>
                            ) : null}
                            {item.kind === "doc" ? (
                              <div className="text-muted-foreground/70 truncate text-[11px]">
                                {item.entry.breadcrumb}
                              </div>
                            ) : null}
                          </div>
                          {active ? (
                            <CornerDownLeft className="text-muted-foreground mt-1 size-3.5 shrink-0" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd>
              close
            </span>
          </div>
          {query ? (
            <span>
              {flatEntries.length} result{flatEntries.length === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="hidden sm:inline">
              Tip: type to search any option, page, or example
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-input bg-background text-foreground rounded border px-1 py-0.5 font-mono text-[10px] font-medium">
      {children}
    </kbd>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm">
      <Search className="size-5 opacity-50" />
      <div>
        No results for <span className="text-foreground font-medium">"{query}"</span>.
      </div>
      <div className="text-xs">Try a different keyword, or browse via the sidebar.</div>
    </div>
  );
}
