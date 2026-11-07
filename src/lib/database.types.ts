// Generated from the live Supabase schema (project qguhqutloktoxbkgjhty) on 2026-11-07.
// Regenerate after every migration: `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`
// (helper generics trimmed to `Tables` / `Enums`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      account_settings: {
        Row: { digit_style: string; marketing_emails: boolean; updated_at: string; user_id: string };
        Insert: { digit_style?: string; marketing_emails?: boolean; updated_at?: string; user_id: string };
        Update: { digit_style?: string; marketing_emails?: boolean; updated_at?: string; user_id?: string };
        Relationships: [];
      };
      currencies: {
        Row: { code: string; created_at: string; is_active: boolean; is_default: boolean; minor_units: number };
        Insert: { code: string; created_at?: string; is_active?: boolean; is_default?: boolean; minor_units: number };
        Update: { code?: string; created_at?: string; is_active?: boolean; is_default?: boolean; minor_units?: number };
        Relationships: [];
      };
      jobs: {
        Row: {
          apply_url: string;
          company_name: string;
          company_website: string | null;
          created_at: string;
          expires_at: string | null;
          featured: boolean;
          id: number;
          job_description: string;
          job_title: string;
          job_type: string;
          listing_type: string;
          location: string | null;
          published_date: string;
          remote_policy: string;
          role_category: string;
          salary_range: string | null;
          slug: string;
          source: string;
          status: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"];
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
          onboarded_at: string | null;
          preferred_currency: string;
          preferred_locale: Database["public"]["Enums"]["locale_code"];
          updated_at: string;
          username: string | null;
          visibility: Database["public"]["Enums"]["profile_visibility"];
        };
        Insert: Record<string, never>;
        Update: {
          avatar_path?: string | null;
          bio?: string | null;
          city?: string | null;
          country_code?: string;
          display_name?: string;
          headline?: string | null;
          is_client?: boolean;
          is_freelancer?: boolean;
          preferred_currency?: string;
          preferred_locale?: Database["public"]["Enums"]["locale_code"];
          username?: string | null;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_currency_fkey";
            columns: ["preferred_currency"];
            isOneToOne: false;
            referencedRelation: "currencies";
            referencedColumns: ["code"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          granted_by: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      account_status: "active" | "suspended" | "deactivated";
      app_role: "admin" | "moderator";
      content_status: "draft" | "pending_review" | "published" | "rejected" | "suspended" | "archived";
      locale_code: "en" | "ar" | "ckb" | "kmr";
      profile_visibility: "public" | "private";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
