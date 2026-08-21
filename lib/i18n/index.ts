import { en } from "./en";
import { th, type Dictionary } from "./th";
import type { Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { th, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
export * from "./config";
