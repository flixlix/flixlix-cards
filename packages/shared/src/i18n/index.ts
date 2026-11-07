import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import * as ca from "./languages/ca.json";
import * as cs from "./languages/cs.json";
import * as de from "./languages/de.json";
import * as dk from "./languages/dk.json";
import * as en from "./languages/en.json";
import * as es from "./languages/es.json";
import * as fi from "./languages/fi.json";
import * as fr from "./languages/fr.json";
import * as hi from "./languages/hi-IN.json";
import * as it from "./languages/it.json";
import * as nl from "./languages/nl.json";
import * as pl from "./languages/pl.json";
import * as ptBR from "./languages/pt-BR.json";
import * as pt from "./languages/pt-PT.json";
import * as ru from "./languages/ru.json";
import * as sk from "./languages/sk.json";
import * as sv from "./languages/sv.json";
import * as ua from "./languages/ua.json";

const languages: Record<string, unknown> = {
  ca,
  cs,
  en,
  de,
  dk,
  pt,
  pt_BR: ptBR,
  es,
  nl,
  it,
  fr,
  ru,
  fi,
  pl,
  sk,
  sv,
  hi,
  ua,
};

const defaultLang = "en";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function getTranslatedString(key: string, lang: string): string | undefined {
  let node: unknown = languages[lang];
  for (const part of key.split(".")) {
    if (!isRecord(node)) {
      return undefined;
    }
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Translates `key` into `language` (e.g. "pt-BR"), falling back to English and then the key. */
export function translate(key: string, language: string) {
  const lang = language.replace(/['"]+/g, "").replace("-", "_");

  return nonEmpty(getTranslatedString(key, lang)) ?? getTranslatedString(key, defaultLang) ?? key;
}

export function setupCustomlocalize(key: string) {
  return translate(key, nonEmpty(localStorage.getItem("selectedLanguage")) ?? defaultLang);
}

export default setupCustomlocalize;
