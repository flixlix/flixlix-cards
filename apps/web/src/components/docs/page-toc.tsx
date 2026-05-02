import * as React from "react";

import { cn } from "@flixlix-cards/cn";

export type TocItem = {
  id: string;
  label: string;
  /** 1 = top-level, 2 = nested. Defaults to 1. */
  depth?: 1 | 2;
};

export function PageTOC({ items, className }: { items: TocItem[]; className?: string }) {
  const [activeId, setActiveId] = React.useState<string | null>(items[0]?.id ?? null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) return;
        const top = items.find((i) => visible.has(i.id));
        if (top) setActiveId(top.id);
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  function jumpTo(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    if (typeof window.history?.replaceState === "function") {
      window.history.replaceState(null, "", `#${id}`);
    }
    setActiveId(id);
  }

  return (
    <nav aria-label="On this page" className={cn("text-sm", className)}>
      <div className="text-muted-foreground mb-3 text-[11px] font-semibold uppercase tracking-wider">
        On this page
      </div>
      <ul className="border-border space-y-0.5 border-l">
        {items.map((item) => {
          const active = activeId === item.id;
          const depth = item.depth ?? 1;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => jumpTo(e, item.id)}
                className={cn(
                  "-ml-px block border-l-2 py-1 transition-colors",
                  depth === 1 ? "pl-3" : "pl-6",
                  active
                    ? "border-primary text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
