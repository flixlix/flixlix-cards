import { useRouterState } from "@tanstack/react-router";
import { Check, ChevronDown, Copy, FileText, Sparkles, TriangleAlert } from "lucide-react";
import * as React from "react";

import { type SearchEntry } from "@/components/docs/docs-search-index";
import { trackEvent } from "#/lib/analytics";
import { findIndexablePage } from "@/lib/seo";
import { markdownPath, markdownUrl, SITE_NAME } from "@/lib/site";
import { Button } from "@flixlix-cards/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flixlix-cards/ui/components/dropdown-menu";

type Agent = { id: string; name: string; chatUrl: (query: string) => string };

const AGENTS = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    chatUrl: (query) => `https://chatgpt.com/?hints=search&q=${query}`,
  },
  { id: "claude", name: "Claude", chatUrl: (query) => `https://claude.ai/new?q=${query}` },
  {
    id: "perplexity",
    name: "Perplexity",
    chatUrl: (query) => `https://www.perplexity.ai/search?q=${query}`,
  },
  { id: "grok", name: "Grok", chatUrl: (query) => `https://grok.com/?q=${query}` },
] as const satisfies Agent[];

type AgentId = (typeof AGENTS)[number]["id"];

const [DEFAULT_AGENT] = AGENTS;
const STORAGE_KEY = "open-with-agent";

const findAgent = (id: string | null) => AGENTS.find((agent) => agent.id === id);

function agentPrompt(page: SearchEntry) {
  const subject =
    page.card === "general"
      ? `${SITE_NAME}, a set of Home Assistant energy cards`
      : `${page.breadcrumb}, a Home Assistant Lovelace card`;
  return `Read ${markdownUrl(page.to)} so you can help me with ${subject}. Answer from those docs, and ask me about my sensors before writing a config.`;
}

const chatUrl = (agent: Agent, page: SearchEntry) =>
  agent.chatUrl(encodeURIComponent(agentPrompt(page)));

const choiceListeners = new Set<() => void>();

function subscribeToChoice(onChange: () => void) {
  choiceListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    choiceListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const storedChoice = () => window.localStorage.getItem(STORAGE_KEY);

function chooseAgent(id: AgentId) {
  window.localStorage.setItem(STORAGE_KEY, id);
  for (const onChange of choiceListeners) {
    onChange();
  }
}

function useChosenAgent(): Agent {
  const id = React.useSyncExternalStore(subscribeToChoice, storedChoice, () => null);
  return findAgent(id) ?? DEFAULT_AGENT;
}

type CopyState = "idle" | "copied" | "failed";

async function copyPageMarkdown(page: SearchEntry) {
  const path = markdownPath(page.to);
  const markdown = fetch(path).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Fetching ${path} failed with HTTP ${response.status}`);
    }
    return new Blob([await response.text()], { type: "text/plain" });
  });
  await navigator.clipboard.write([new ClipboardItem({ "text/plain": markdown })]);
}

const COPY_LABELS: Record<CopyState, string> = {
  idle: "Copy page as Markdown",
  copied: "Copied",
  failed: "Copy failed",
};

function CopyIcon({ state }: { state: CopyState }) {
  switch (state) {
    case "idle":
      return <Copy />;
    case "copied":
      return <Check className="text-emerald-500" />;
    case "failed":
      return <TriangleAlert className="text-destructive" />;
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

export function OpenWithAgent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const page = findIndexablePage(pathname);
  const agent = useChosenAgent();
  const [copyState, setCopyState] = React.useState<CopyState>("idle");

  if (!page) {
    return null;
  }

  const track = (opened: Agent) =>
    trackEvent("Open with agent", { agent: opened.name, page: page.to });

  function copy(current: SearchEntry) {
    trackEvent("Copy page markdown", { page: current.to });
    copyPageMarkdown(current).then(
      () => setCopyState("copied"),
      () => setCopyState("failed")
    );
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="flex items-center rounded-md border">
      <Button asChild size="sm" variant="ghost" className="rounded-r-none">
        <a
          href={chatUrl(agent, page)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open this page in ${agent.name}`}
          onClick={() => track(agent)}
        >
          <Sparkles className="size-4" />
          <span className="hidden sm:inline">Open in {agent.name}</span>
        </a>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-l-none border-l px-2"
            aria-label="Choose an AI assistant"
          >
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Open this page in</DropdownMenuLabel>
          {AGENTS.map((option) => (
            <DropdownMenuItem key={option.id} asChild>
              <a
                href={chatUrl(option, page)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  chooseAgent(option.id);
                  track(option);
                }}
              >
                {option.name}
                {option.id === agent.id ? <Check className="ml-auto" /> : null}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              copy(page);
            }}
          >
            <CopyIcon state={copyState} />
            {COPY_LABELS[copyState]}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={markdownPath(page.to)} target="_blank" rel="noopener noreferrer">
              <FileText />
              View as Markdown
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
