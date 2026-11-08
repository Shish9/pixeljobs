export type LegalDoc = { intro: string; sections: { h: string; p: string[] }[] };
export type LegalKey = "guidelines" | "terms" | "privacy" | "safety";
export type LegalSet = Record<LegalKey, LegalDoc>;
export const LEGAL_KEYS: LegalKey[] = ["guidelines", "terms", "privacy", "safety"];
/** Date the drafts were last edited (shown on each page). */
export const LEGAL_UPDATED = "2026-11-07";
