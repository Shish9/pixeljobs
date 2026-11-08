import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Database trigger/RLS failures → dictionary keys. Triggers raise short codes (e.g. `email_not_confirmed`);
 * RLS denials surface as 42501; unique violations as 23505. Anything unknown becomes errors.generic.
 */
const CODES: Record<string, string> = {
  email_not_confirmed: "errors.actionEmail",
  service_needs_package: "errors.packageRequired",
  service_needs_description: "errors.descriptionShort",
  rate_limited: "errors.rateLimited",
  transition_not_allowed: "errors.transitionNotAllowed",
  status_not_allowed: "errors.transitionNotAllowed",
  status_locked: "errors.transitionNotAllowed",
  service_unavailable: "errors.notAvailable",
  package_unavailable: "errors.notAvailable",
  project_not_open: "errors.notAvailable",
  own_service: "errors.forbidden",
  own_project: "errors.forbidden",
  not_freelancer: "errors.forbidden",
  invalid_portfolio: "errors.forbidden",
  not_participant: "errors.forbidden",
  conversation_closed: "trust.threadClosed",
  awaiting_client: "trust.awaitingClient",
  not_completed: "trust.notCompleted",
  not_found: "errors.notAvailable",
  own_content: "errors.forbidden",
  target_protected: "errors.forbidden",
  unknown_action: "errors.generic",
};

export function dbErrorKey(error: PostgrestError | null | undefined): string {
  if (!error) return "errors.generic";
  if (error.code === "23505") return "errors.duplicate";
  if (error.code === "42501") return "errors.forbidden";
  if (error.code === "23514") return "errors.generic";
  return CODES[error.message] ?? "errors.generic";
}
