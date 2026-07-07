export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      repos: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          description: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      prompt_versions: {
        Row: {
          id: string;
          repo_id: string;
          content: string;
          model: string;
          temperature: number;
          max_tokens: number;
          commit_message: string | null;
          parent_version_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          repo_id: string;
          content: string;
          model: string;
          temperature: number;
          max_tokens: number;
          commit_message?: string | null;
          parent_version_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          repo_id?: string;
          content?: string;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          commit_message?: string | null;
          parent_version_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      deployments: {
        Row: {
          id: string;
          repo_id: string;
          active_version_id: string;
          api_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          repo_id: string;
          active_version_id: string;
          api_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          repo_id?: string;
          active_version_id?: string;
          api_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
