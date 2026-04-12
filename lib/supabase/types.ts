// Supabase DB 타입 정의 (supabase gen types typescript로 자동 생성 가능)
// npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Database = {
  public: {
    Tables: {
      // SDK 2.x 요구 필드 포함
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          theme: "dark" | "light";
          home_city: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
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
          updated_at: string;
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
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "income" | "expense";
          category?: string;
          amount?: number;
          note?: string;
          date?: string;
          updated_at?: string;
        };
      };
      travel_destinations: {
        Row: {
          id: string;
          name: string;
          location: string;
          region: string | null;
          category: string;
          country: string;
          rating: number | null;
          price_label: string | null;
          tag: string | null;
          image_url: string | null;
          season: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["travel_destinations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["travel_destinations"]["Insert"]>;
      };
      travel_wishlist: {
        Row: {
          user_id: string;
          destination_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["travel_wishlist"]["Row"], "created_at">;
        Update: never;
      };
      culture_events: {
        Row: {
          id: string;
          slug: string;
          type: "movie" | "concert" | "exhibition";
          title: string;
          venue: string;
          date_label: string;
          summary: string;
          image_url: string | null;
          rating: number | null;
          tags: string[];
          booking_url: string | null;
          detail_url: string | null;
          source: string;
          description: string | null;
          address: string | null;
          runtime: string | null;
          period: string | null;
          cast_list: string[] | null;
          price_info: string | null;
          status: string | null;
          fetched_at: string;
          expires_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["culture_events"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["culture_events"]["Insert"]>;
      };
      market_quotes: {
        Row: {
          symbol: string;
          name: string;
          display_symbol: string | null;
          market: "KR" | "US";
          exchange: string;
          currency: string;
          price: number;
          change: number;
          change_pct: number;
          previous_close: number | null;
          day_high: number | null;
          day_low: number | null;
          volume: number | null;
          market_cap: number | null;
          range52w_high: number | null;
          range52w_low: number | null;
          sparkline: number[];
          fetched_at: string;
        };
        Insert: Database["public"]["Tables"]["market_quotes"]["Row"];
        Update: Partial<Database["public"]["Tables"]["market_quotes"]["Row"]>;
      };
      market_indices: {
        Row: {
          symbol: string;
          name: string;
          region: string;
          value: number;
          change: number;
          change_pct: number;
          fetched_at: string;
        };
        Insert: Database["public"]["Tables"]["market_indices"]["Row"];
        Update: Partial<Database["public"]["Tables"]["market_indices"]["Row"]>;
      };
      road_segments: {
        Row: {
          id: string;
          name: string;
          road_type: "고속도로" | "국도" | "도시고속";
          from_location: string;
          to_location: string;
          status: "원활" | "서행" | "정체" | "사고";
          speed_kmh: number | null;
          travel_time_min: number | null;
          distance_km: number | null;
          fetched_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["road_segments"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["road_segments"]["Insert"]>;
      };
      traffic_cctv: {
        Row: {
          id: string;
          road_name: string;
          location: string;
          status: "원활" | "서행" | "정체" | "사고";
          direction: string;
          image_url: string | null;
          fetched_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["traffic_cctv"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["traffic_cctv"]["Insert"]>;
      };
      shopping_deals: {
        Row: {
          id: string;
          title: string;
          store: string;
          category: string;
          original_price: number;
          sale_price: number;
          discount_pct: number;
          purchase_url: string;
          image_url: string | null;
          mall_name: string | null;
          brand: string | null;
          review_count: number | null;
          source: string;
          fetched_at: string;
          expires_at: string;
        };
        Insert: Database["public"]["Tables"]["shopping_deals"]["Row"];
        Update: Partial<Database["public"]["Tables"]["shopping_deals"]["Row"]>;
      };
      search_history: {
        Row: {
          id: string;
          user_id: string | null;
          keyword: string;
          result_count: number;
          searched_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          keyword: string;
          result_count?: number;
          searched_at?: string;
        };
        Update: never;
      };
    };
    Views: {
      monthly_summary: {
        Row: {
          user_id: string;
          ym: string;
          total_income: number;
          total_expense: number;
          balance: number;
        };
      };
      category_expense_summary: {
        Row: {
          user_id: string;
          ym: string;
          category: string;
          total_amount: number;
          tx_count: number;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: Record<string, never>;
  };
};

// 편의 타입 단축
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
