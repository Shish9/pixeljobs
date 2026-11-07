import type { Dictionary } from "./dictionaries/en";

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
/** "auth.email" | "errors.generic" | … — every leaf key of the dictionary. */
export type MessageKey = {
  [K in keyof Dictionary]: Dictionary[K] extends string ? K : Join<K, keyof Dictionary[K]>;
}[keyof Dictionary];

/** Replace `{name}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Resolve a dotted message key, falling back to the key itself so missing strings are visible, not fatal. */
export function translate(dict: object, key: MessageKey | string, vars?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) return (node as Record<string, unknown>)[part];
    return undefined;
  }, dict);
  return typeof value === "string" ? interpolate(value, vars) : key;
}
