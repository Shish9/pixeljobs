// Mirrors the live Supabase schema (project qguhqutloktoxbkgjhty) as of migration 20261107220207_trust_and_safety_clock.
// Regenerate after every migration: `npx supabase gen types typescript --project-id <ref>` and keep these shapes in sync.
// Insert/Update types are narrowed to the columns API roles may actually write (see GRANTs in the migrations).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };
type Table<R, I = Record<string, never>, U = Record<string, never>> = { Row: R; Insert: I; Update: U; Relationships: Rel[] };

export type ContentStatus = "draft" | "pending_review" | "published" | "rejected" | "suspended" | "archived";
export type LangKey = "ckb" | "kmr" | "ar" | "en" | "tr" | "fa";
export type Tier = "basic" | "standard" | "premium";
export type ProjectStatus = "draft" | "open" | "in_review" | "assigned" | "in_progress" | "completed" | "cancelled" | "closed";
export type ProposalStatus = "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn" | "archived";
export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";
export type ReportTarget = "user" | "service" | "project" | "portfolio" | "message" | "review";
export type ReportReason = "spam" | "scam" | "offensive" | "inappropriate" | "fake" | "other";
export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";

type ConversationRow = {
  id: string;
  request_id: string | null;
  proposal_id: string | null;
  client_id: string;
  freelancer_id: string;
  last_message_at: string | null;
  last_message_preview: string;
  last_sender_id: string | null;
  created_at: string;
};
type MessageRow = { id: string; conversation_id: string; sender_id: string; body: string; hidden_at: string | null; created_at: string };
type ReviewRow = {
  id: string;
  request_id: string | null;
  proposal_id: string | null;
  service_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: "client" | "freelancer";
  rating: number;
  body: string | null;
  status: "published" | "hidden";
  visible_at: string;
  created_at: string;
};
type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  target_owner: string | null;
  reason: ReportReason;
  details: string | null;
  snapshot: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
};
type ModerationActionRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  report_id: string | null;
  note: string | null;
  created_at: string;
};
type StatsRow = { review_count: number; rating_avg: number };

type ProfileRow = {
  account_status: "active" | "suspended" | "deactivated";
  availability: string;
  avatar_path: string | null;
  bio: string | null;
  city: string | null;
  country_code: string;
  created_at: string;
  display_name: string;
  headline: string | null;
  id: string;
  is_client: boolean;
  is_freelancer: boolean;
  languages: string[];
  onboarded_at: string | null;
  preferred_currency: string;
  preferred_locale: "en" | "ar" | "ckb" | "kmr";
  rate_currency: string;
  rate_minor: number | null;
  skills: string[];
  updated_at: string;
  username: string | null;
  visibility: "public" | "private";
  website_url: string | null;
};
type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    | "username" | "display_name" | "headline" | "bio" | "avatar_path" | "city" | "country_code" | "preferred_locale"
    | "preferred_currency" | "is_freelancer" | "is_client" | "visibility" | "skills" | "languages" | "availability"
    | "rate_minor" | "rate_currency" | "website_url"
  >
>;

type EntryRow = {
  created_at: string; description: string | null; end_year: number | null; id: string; kind: string;
  organization: string | null; start_year: number | null; title: string; user_id: string;
};
type EntryWrite = Partial<Omit<EntryRow, "id" | "created_at" | "user_id">>;

type PortfolioRow = {
  created_at: string; description: string | null; id: string; image_path: string | null; link_url: string | null;
  outcome: string | null; owner_id: string; skills: string[]; status: ContentStatus; title: string; updated_at: string;
};
type PortfolioWrite = Partial<Omit<PortfolioRow, "id" | "created_at" | "updated_at" | "owner_id">>;

type ServiceRow = {
  category: string; city: string | null; cover_path: string | null; created_at: string; description: string; faqs: Json;
  id: string; languages: string[]; owner_id: string; published_at: string | null; requirements: string | null;
  status: ContentStatus; title: string; updated_at: string;
};
type ServiceWrite = Partial<Pick<ServiceRow, "title" | "category" | "description" | "requirements" | "cover_path" | "city" | "languages" | "faqs" | "status">>;

type PackageRow = {
  currency: string; deliverables: string[]; delivery_days: number; description: string | null; price_minor: number;
  revisions: number; service_id: string; tier: Tier; title: string;
};

type RequestRow = {
  client_id: string; created_at: string; currency: string; delivery_days: number; freelancer_id: string; id: string;
  message: string; price_minor: number; service_id: string; status: RequestStatus; tier: Tier; updated_at: string;
};

type ProjectRow = {
  budget_max_minor: number | null; budget_min_minor: number | null; budget_type: string; category: string;
  city: string | null; client_id: string; created_at: string; currency: string; description: string;
  experience_level: string; id: string; moderation: string; published_at: string | null; skills: string[];
  status: ProjectStatus; timeline: string; title: string; updated_at: string; visibility: string;
};
type ProjectWrite = Partial<
  Pick<ProjectRow, "title" | "description" | "category" | "skills" | "budget_type" | "budget_min_minor" | "budget_max_minor" | "timeline" | "experience_level" | "city" | "visibility" | "status">
>;

type ProposalRow = {
  answers: string | null; bid_minor: number; client_id: string; cover_letter: string; created_at: string; currency: string;
  freelancer_id: string; id: string; portfolio_item_ids: string[]; project_id: string; status: ProposalStatus;
  timeline_days: number; updated_at: string;
};

type JobRow = {
  apply_url: string; company_name: string; company_website: string | null; created_at: string; expires_at: string | null;
  featured: boolean; id: number; job_description: string; job_title: string; job_type: string; listing_type: string;
  location: string | null; published_date: string; remote_policy: string; role_category: string; salary_range: string | null;
  slug: string; source: string; status: string; updated_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      account_settings: Table<
        { digit_style: string; marketing_emails: boolean; updated_at: string; user_id: string },
        Record<string, never>,
        { digit_style?: string; marketing_emails?: boolean }
      >;
      currencies: Table<{ code: string; created_at: string; is_active: boolean; is_default: boolean; minor_units: number }>;
      jobs: Table<JobRow>;
      profiles: Table<ProfileRow, Record<string, never>, ProfileUpdate>;
      profile_entries: Table<EntryRow, EntryWrite & { kind: string; title: string }, EntryWrite>;
      portfolio_items: Table<PortfolioRow, PortfolioWrite & { title: string }, PortfolioWrite>;
      services: Table<ServiceRow, ServiceWrite & { title: string; category: string }, ServiceWrite>;
      service_packages: Table<
        PackageRow,
        Omit<PackageRow, "currency" | "revisions" | "deliverables" | "description"> & Partial<PackageRow>,
        Partial<Omit<PackageRow, "service_id" | "tier">>
      >;
      service_requests: Table<RequestRow, { service_id: string; tier: Tier; message: string }, { status?: RequestStatus }>;
      projects: Table<ProjectRow, ProjectWrite & { title: string; description: string; category: string }, ProjectWrite>;
      proposals: Table<
        ProposalRow,
        { project_id: string; cover_letter: string; bid_minor: number; timeline_days: number; portfolio_item_ids?: string[]; answers?: string | null },
        { status?: ProposalStatus }
      >;
      saved_items: Table<
        { created_at: string; item_id: string; item_type: string; user_id: string },
        { item_type: string; item_id: string }
      >;
      conversations: Table<ConversationRow>;
      messages: Table<MessageRow, { conversation_id: string; body: string }>;
      conversation_reads: Table<{ conversation_id: string; user_id: string; last_read_at: string }>;
      reviews: Table<ReviewRow, { request_id?: string | null; proposal_id?: string | null; rating: number; body?: string | null }>;
      reports: Table<ReportRow, { target_type: ReportTarget; target_id: string; reason: ReportReason; details?: string | null }>;
      moderation_actions: Table<ModerationActionRow>;
      user_roles: Table<
        { created_at: string; granted_by: string | null; role: "admin" | "moderator"; user_id: string },
        { role: "admin" | "moderator"; user_id: string; granted_by?: string | null }
      >;
    };
    Views: {
      review_stats: { Row: StatsRow & { reviewee_id: string }; Relationships: Rel[] };
      service_review_stats: { Row: StatsRow & { service_id: string }; Relationships: Rel[] };
    };
    Functions: {
      mark_conversation_read: { Args: { p_conversation: string }; Returns: undefined };
      unread_conversation_count: { Args: Record<string, never>; Returns: number };
      moderate: {
        Args: { p_target_type: string; p_target_id: string; p_action: string; p_note?: string | null; p_report_id?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      account_status: "active" | "suspended" | "deactivated";
      app_role: "admin" | "moderator";
      content_status: ContentStatus;
      locale_code: "en" | "ar" | "ckb" | "kmr";
      profile_visibility: "public" | "private";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
