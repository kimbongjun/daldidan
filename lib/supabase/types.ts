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
      blog_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string | null;
          author_name: string;
          password_hash: string | null;
          content: string;
          image_urls: string[];
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id?: string | null;
          author_name: string;
          password_hash?: string | null;
          content: string;
          image_urls?: string[];
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          image_urls?: string[];
          updated_at?: string;
        };
      };
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
          view_count: number;
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
          view_count?: number;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense";
          category: string;
          buyer: "공동" | "봉준" | "달희";
          merchant_name: string;
          location: string;
          receipt_image_url: string | null;
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
          buyer?: "공동" | "봉준" | "달희";
          merchant_name?: string;
          location?: string;
          receipt_image_url?: string | null;
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
          buyer?: "공동" | "봉준" | "달희";
          merchant_name?: string;
          location?: string;
          receipt_image_url?: string | null;
          amount?: number;
          note?: string;
          date?: string;
          created_at?: string;
        };
      };
      stock_watchlist: {
        Row: {
          user_id: string;
          items: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          items?: Json;
          updated_at?: string;
        };
        Update: {
          items?: Json;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
