type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          slug: string;
          title: string;
          description: string;
          thumbnail_url: string | null;
          content_html: string;
          content_json: Json | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          author_name?: string;
          slug: string;
          title: string;
          description?: string;
          thumbnail_url?: string | null;
          content_html?: string;
          content_json?: Json | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          author_name?: string;
          slug?: string;
          title?: string;
          description?: string;
          thumbnail_url?: string | null;
          content_html?: string;
          content_json?: Json | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense";
          category: string;
          amount: number;
          note: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "income" | "expense";
          category: string;
          amount: number;
          note?: string;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "income" | "expense";
          category?: string;
          amount?: number;
          note?: string;
          date?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
