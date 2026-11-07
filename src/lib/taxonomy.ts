/** Fixed marketplace vocabularies. Keys match database domains/checks; labels live in the dictionaries. */
export const CATEGORY_KEYS = ["design", "development", "writing", "translation", "marketing", "video", "business", "engineering"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const LANG_KEYS = ["ckb", "kmr", "ar", "en", "tr", "fa"] as const;
export type LangKey = (typeof LANG_KEYS)[number];

export const TIERS = ["basic", "standard", "premium"] as const;
export type Tier = (typeof TIERS)[number];

export const AVAILABILITY = ["available", "busy", "unavailable"] as const;
export const TIMELINES = ["lt_1w", "1_4w", "1_3m", "gt_3m"] as const;
export const EXPERIENCE_LEVELS = ["entry", "intermediate", "expert"] as const;
export const BUDGET_TYPES = ["fixed", "hourly"] as const;
export const ENTRY_KINDS = ["experience", "education", "certification"] as const;

export type ProjectStatus = "draft" | "open" | "in_review" | "assigned" | "in_progress" | "completed" | "cancelled" | "closed";
/** Client-initiated project transitions (mirrors private.projects_before_write). */
export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["in_review", "closed", "cancelled"],
  in_review: ["open", "closed", "cancelled"],
  assigned: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  closed: [],
};

export type ProposalStatus = "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn" | "archived";
/** Client actions on a proposal (mirrors private.proposals_before_update). */
export const CLIENT_PROPOSAL_ACTIONS: Record<ProposalStatus, ProposalStatus[]> = {
  submitted: ["shortlisted", "accepted", "rejected", "archived"],
  shortlisted: ["accepted", "rejected", "archived", "submitted"],
  rejected: ["archived"],
  accepted: [],
  withdrawn: [],
  archived: [],
};

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";
export const FREELANCER_REQUEST_ACTIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ["accepted", "declined"],
  accepted: ["completed"],
  declined: [],
  cancelled: [],
  completed: [],
};
export const CLIENT_REQUEST_ACTIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ["cancelled"],
  accepted: ["cancelled"],
  declined: [],
  cancelled: [],
  completed: [],
};

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/media/${path}` : null;
}
