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
      company_certificates: {
        Row: {
          company_id: string
          created_at: string
          document_url: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          kind: string
          name: string
          number: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          kind?: string
          name: string
          number?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          kind?: string
          name?: string
          number?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "company_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
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
      currencies: {
        Row: {
          code: string
          name_tr: string
          sort_order: number
          symbol: string
        }
        Insert: {
          code: string
          name_tr: string
          sort_order?: number
          symbol: string
        }
        Update: {
          code?: string
          name_tr?: string
          sort_order?: number
          symbol?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base: string
          fetched_at: string
          quote: string
          rate: number
        }
        Insert: {
          base: string
          fetched_at?: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          fetched_at?: string
          quote?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_fkey"
            columns: ["base"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_fkey"
            columns: ["quote"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
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
      group_buy_participants: {
        Row: {
          buyer_id: string
          created_at: string
          group_buy_id: string
          id: string
          quantity: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          group_buy_id: string
          id?: string
          quantity: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          group_buy_id?: string
          id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_participants_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buy_participants_group_buy_id_fkey"
            columns: ["group_buy_id"]
            isOneToOne: false
            referencedRelation: "group_buys"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buys: {
        Row: {
          committed_quantity: number
          created_at: string
          currency: string
          deadline: string
          id: string
          initiator_id: string
          note: string | null
          product_id: string
          status: string
          target_quantity: number
          target_unit_price: number | null
          updated_at: string
        }
        Insert: {
          committed_quantity?: number
          created_at?: string
          currency?: string
          deadline: string
          id?: string
          initiator_id: string
          note?: string | null
          product_id: string
          status?: string
          target_quantity: number
          target_unit_price?: number | null
          updated_at?: string
        }
        Update: {
          committed_quantity?: number
          created_at?: string
          currency?: string
          deadline?: string
          id?: string
          initiator_id?: string
          note?: string | null
          product_id?: string
          status?: string
          target_quantity?: number
          target_unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_buys_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "group_buys_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buys_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          errors: Json
          failed_rows: number
          filename: string
          finished_at: string | null
          id: string
          ok_rows: number
          status: string
          total_rows: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          errors?: Json
          failed_rows?: number
          filename: string
          finished_at?: string | null
          id?: string
          ok_rows?: number
          status?: string
          total_rows?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          errors?: Json
          failed_rows?: number
          filename?: string
          finished_at?: string | null
          id?: string
          ok_rows?: number
          status?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "import_jobs_created_by_fkey"
            columns: ["created_by"]
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
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_note: string | null
          cancel_reason: string | null
          code: string
          company_id: string
          created_at: string
          currency: string
          delivery_address: string | null
          expected_delivery: string | null
          id: string
          incoterm: string | null
          payment_terms: string | null
          product_id: string | null
          quantity: number
          quote_id: string | null
          rfq_id: string | null
          status: string
          supplier_note: string | null
          title: string
          total_amount: number | null
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_note?: string | null
          cancel_reason?: string | null
          code?: string
          company_id: string
          created_at?: string
          currency?: string
          delivery_address?: string | null
          expected_delivery?: string | null
          id?: string
          incoterm?: string | null
          payment_terms?: string | null
          product_id?: string | null
          quantity: number
          quote_id?: string | null
          rfq_id?: string | null
          status?: string
          supplier_note?: string | null
          title: string
          total_amount?: number | null
          unit?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_note?: string | null
          cancel_reason?: string | null
          code?: string
          company_id?: string
          created_at?: string
          currency?: string
          delivery_address?: string | null
          expected_delivery?: string | null
          id?: string
          incoterm?: string | null
          payment_terms?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string | null
          rfq_id?: string | null
          status?: string
          supplier_note?: string | null
          title?: string
          total_amount?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "orders_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
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
            foreignKeyName: "price_tiers_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_alerts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          product_id: string
          target_price: number | null
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          product_id: string
          target_price?: number | null
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          product_id?: string
          target_price?: number | null
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_view_stats: {
        Row: {
          day: string
          product_id: string
          views: number
        }
        Insert: {
          day?: string
          product_id: string
          views?: number
        }
        Update: {
          day?: string
          product_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_view_stats_product_id_fkey"
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
          cases_per_pallet: number | null
          category_id: string | null
          company_id: string
          content_language: string
          created_at: string
          currency: string
          description: string | null
          hs_code: string | null
          id: string
          images: string[] | null
          incoterm: string | null
          lead_time_days: number | null
          min_order_value: number | null
          moq: number
          payment_terms: string | null
          price: number | null
          price_hidden: boolean
          sample_available: boolean
          sample_price: number | null
          slug: string
          status: string
          stock_quantity: number
          title: string
          unit: string | null
          units_per_case: number | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          brand?: string | null
          cases_per_pallet?: number | null
          category_id?: string | null
          company_id: string
          content_language?: string
          created_at?: string
          currency?: string
          description?: string | null
          hs_code?: string | null
          id?: string
          images?: string[] | null
          incoterm?: string | null
          lead_time_days?: number | null
          min_order_value?: number | null
          moq?: number
          payment_terms?: string | null
          price?: number | null
          price_hidden?: boolean
          sample_available?: boolean
          sample_price?: number | null
          slug: string
          status?: string
          stock_quantity?: number
          title: string
          unit?: string | null
          units_per_case?: number | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          brand?: string | null
          cases_per_pallet?: number | null
          category_id?: string | null
          company_id?: string
          content_language?: string
          created_at?: string
          currency?: string
          description?: string | null
          hs_code?: string | null
          id?: string
          images?: string[] | null
          incoterm?: string | null
          lead_time_days?: number | null
          min_order_value?: number | null
          moq?: number
          payment_terms?: string | null
          price?: number | null
          price_hidden?: boolean
          sample_available?: boolean
          sample_price?: number | null
          slug?: string
          status?: string
          stock_quantity?: number
          title?: string
          unit?: string | null
          units_per_case?: number | null
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
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "products_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
      quote_revisions: {
        Row: {
          actor_id: string
          created_at: string
          currency: string
          delivery_days: number | null
          id: string
          message: string | null
          moq: number | null
          price: number
          quote_id: string
          side: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          message?: string | null
          moq?: number | null
          price: number
          quote_id: string
          side: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          message?: string | null
          moq?: number | null
          price?: number
          quote_id?: string
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_revisions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_revisions_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quote_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
          revision_count: number
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
          revision_count?: number
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
          revision_count?: number
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
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "quotes_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
      sample_requests: {
        Row: {
          buyer_id: string
          company_id: string
          created_at: string
          id: string
          message: string | null
          product_id: string | null
          quantity: number
          shipping_address: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          quantity?: number
          shipping_address?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          quantity?: number
          shipping_address?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sample_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_performance: {
        Row: {
          active_products: number | null
          company_id: string | null
          orders_cancelled: number | null
          orders_completed: number | null
          quotes_accepted: number | null
          quotes_given: number | null
        }
        Insert: {
          active_products?: never
          company_id?: string | null
          orders_cancelled?: never
          orders_completed?: never
          quotes_accepted?: never
          quotes_given?: never
        }
        Update: {
          active_products?: never
          company_id?: string | null
          orders_cancelled?: never
          orders_completed?: never
          quotes_accepted?: never
          quotes_given?: never
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean }
      is_service_context: { Args: never; Returns: boolean }
      notify: {
        Args: {
          p_body: string
          p_title: string
          p_type: string
          p_url: string
          p_user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      track_product_view: { Args: { p_product_id: string }; Returns: undefined }
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

