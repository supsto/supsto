// Bu dosya üretilmiştir. Elle düzenlemeyin.
// Yeniden üretmek için: npm run db:types  (local Supabase ayakta olmalı)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          locale: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          locale: string
          name: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          locale?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          avg_response_hours: number | null
          city: string | null
          content_language: string
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          district: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          response_rate: number | null
          slug: string
          status: string
          tax_number: string | null
          type: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avg_response_hours?: number | null
          city?: string | null
          content_language?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          response_rate?: number | null
          slug: string
          status?: string
          tax_number?: string | null
          type?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avg_response_hours?: number | null
          city?: string | null
          content_language?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          response_rate?: number | null
          slug?: string
          status?: string
          tax_number?: string | null
          type?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_verifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          company_id: string
          created_at: string
          id: string
          last_message_at: string
          product_id: string | null
          rfq_id: string | null
        }
        Insert: {
          buyer_id: string
          company_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          product_id?: string | null
          rfq_id?: string | null
        }
        Update: {
          buyer_id?: string
          company_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          product_id?: string | null
          rfq_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          product_id: string | null
          rfq_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rfq_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rfq_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tiers: {
        Row: {
          created_at: string
          currency: string
          id: string
          max_quantity: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          max_quantity?: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          brand: string | null
          category_id: string | null
          company_id: string
          content_language: string
          created_at: string
          currency: string
          description: string | null
          id: string
          images: string[] | null
          moq: number
          price: number | null
          price_hidden: boolean
          slug: string
          status: string
          stock_quantity: number
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          brand?: string | null
          category_id?: string | null
          company_id: string
          content_language?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[] | null
          moq?: number
          price?: number | null
          price_hidden?: boolean
          slug: string
          status?: string
          stock_quantity?: number
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          brand?: string | null
          category_id?: string | null
          company_id?: string
          content_language?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[] | null
          moq?: number
          price?: number | null
          price_hidden?: boolean
          slug?: string
          status?: string
          stock_quantity?: number
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          delivery_days: number | null
          id: string
          message: string | null
          moq: number | null
          price: number
          rfq_id: string
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          message?: string | null
          moq?: number | null
          price: number
          rfq_id: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          message?: string | null
          moq?: number | null
          price?: number
          rfq_id?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          attachments: string[]
          buyer_id: string
          category_id: string | null
          city: string | null
          content_language: string
          created_at: string
          deadline: string | null
          delivery_days: number | null
          description: string
          id: string
          quantity: number | null
          quote_count: number
          status: string
          target_price: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          attachments?: string[]
          buyer_id: string
          category_id?: string | null
          city?: string | null
          content_language?: string
          created_at?: string
          deadline?: string | null
          delivery_days?: number | null
          description: string
          id?: string
          quantity?: number | null
          quote_count?: number
          status?: string
          target_price?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: string[]
          buyer_id?: string
          category_id?: string | null
          city?: string | null
          content_language?: string
          created_at?: string
          deadline?: string | null
          delivery_days?: number | null
          description?: string
          id?: string
          quantity?: number | null
          quote_count?: number
          status?: string
          target_price?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean }
      is_service_context: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

