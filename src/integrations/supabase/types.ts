export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      delivery_requests: {
        Row: {
          created_at: string
          destination_city: string
          destination_country: string
          dropped_off_at: string | null
          handed_to_traveller_at: string | null
          handoff_signature_url: string | null
          id: string
          item_description: string
          item_type: string
          item_value: number
          matched_traveller_id: string | null
          origin_city: string
          origin_country: string
          preferred_date: string | null
          route_id: string | null
          sender_id: string
          special_handling_flags: string[]
          status: string
          urgency_level: string
          trip_id: string | null
          offered_price: number | null
          agreed_price: number | null
          sender_dropoff_confirmed_at: string | null
          delivered_at: string | null
          pickup_confirmed_at: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string
          destination_city: string
          destination_country: string
          dropped_off_at?: string | null
          handed_to_traveller_at?: string | null
          handoff_signature_url?: string | null
          id?: string
          item_description: string
          item_type: string
          item_value?: number
          matched_traveller_id?: string | null
          origin_city: string
          origin_country: string
          preferred_date?: string | null
          route_id?: string | null
          sender_id: string
          special_handling_flags?: string[]
          status?: string
          urgency_level: string
          trip_id?: string | null
          offered_price?: number | null
          agreed_price?: number | null
          sender_dropoff_confirmed_at?: string | null
          delivered_at?: string | null
          pickup_confirmed_at?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string
          destination_city?: string
          destination_country?: string
          dropped_off_at?: string | null
          handed_to_traveller_at?: string | null
          handoff_signature_url?: string | null
          id?: string
          item_description?: string
          item_type?: string
          item_value?: number
          matched_traveller_id?: string | null
          origin_city?: string
          origin_country?: string
          preferred_date?: string | null
          route_id?: string | null
          sender_id?: string
          special_handling_flags?: string[]
          status?: string
          urgency_level?: string
          trip_id?: string | null
          offered_price?: number | null
          agreed_price?: number | null
          sender_dropoff_confirmed_at?: string | null
          delivered_at?: string | null
          pickup_confirmed_at?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_matched_traveller_id_fkey"
            columns: ["matched_traveller_id"]
            isOneToOne: false
            referencedRelation: "traveller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          raised_by: string
          reason: string
          request_id: string
          resolution: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          raised_by: string
          reason: string
          request_id: string
          resolution?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          raised_by?: string
          reason?: string
          request_id?: string
          resolution?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      handoff_preferences: {
        Row: {
          created_at: string
          id: string
          location: string | null
          request_id: string
          scheduled_time: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          request_id: string
          scheduled_time?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          request_id?: string
          scheduled_time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "handoff_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          match_score: number
          request_id: string
          status: string
          traveller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score: number
          request_id: string
          status?: string
          traveller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number
          request_id?: string
          status?: string
          traveller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_traveller_id_fkey"
            columns: ["traveller_id"]
            isOneToOne: false
            referencedRelation: "traveller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string
          created_at: string
          id: string
          rating: number
          status: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          rating: number
          status?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_status: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_status?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_status?: boolean
          type?: string
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
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          request_id: string
          sender_id: string
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          request_id: string
          status: string
          traveller_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          request_id: string
          status?: string
          traveller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          request_id?: string
          status?: string
          traveller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_traveller_id_fkey"
            columns: ["traveller_id"]
            isOneToOne: false
            referencedRelation: "traveller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_breakdowns: {
        Row: {
          base_price: number
          created_at: string
          handling_fee: number
          id: string
          margin: number
          request_id: string
          service_fee: number
          total_price: number
          traveller_payout: number
          urgency_fee: number
          weight_price: number
        }
        Insert: {
          base_price: number
          created_at?: string
          handling_fee: number
          id?: string
          margin: number
          request_id: string
          service_fee: number
          total_price: number
          traveller_payout: number
          urgency_fee: number
          weight_price: number
        }
        Update: {
          base_price?: number
          created_at?: string
          handling_fee?: number
          id?: string
          margin?: number
          request_id?: string
          service_fee?: number
          total_price?: number
          traveller_payout?: number
          urgency_fee?: number
          weight_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_breakdowns_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          from_user_id: string
          id: string
          rating: number
          request_id: string
          to_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          rating: number
          request_id: string
          to_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          rating?: number
          request_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          destination_city: string
          destination_country: string
          id: string
          max_price: number
          min_price: number
          origin_city: string
          origin_country: string
          price_per_kg: number
        }
        Insert: {
          active?: boolean
          base_price: number
          created_at?: string
          destination_city: string
          destination_country: string
          id?: string
          max_price: number
          min_price: number
          origin_city: string
          origin_country: string
          price_per_kg: number
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          destination_city?: string
          destination_country?: string
          id?: string
          max_price?: number
          min_price?: number
          origin_city?: string
          origin_country?: string
          price_per_kg?: number
        }
        Relationships: []
      }
      sender_profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sender_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traveller_profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          payout_account_name: string | null
          payout_account_number: string | null
          payout_method: string | null
          payout_provider: string | null
          phone: string | null
          rating: number
          school_affiliation: string | null
          total_deliveries: number
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_method?: string | null
          payout_provider?: string | null
          phone?: string | null
          rating?: number
          school_affiliation?: string | null
          total_deliveries?: number
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_method?: string | null
          payout_provider?: string | null
          phone?: string | null
          rating?: number
          school_affiliation?: string | null
          total_deliveries?: number
          user_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "traveller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrival_date: string
          available_kg: number
          capacity_kg: number
          created_at: string
          departure_date: string
          destination_city: string
          destination_country: string
          id: string
          origin_city: string
          origin_country: string
          price_per_kg: number | null
          restricted_item_preferences: string | null
          status: string
          traveller_id: string
        }
        Insert: {
          arrival_date: string
          available_kg: number
          capacity_kg: number
          created_at?: string
          departure_date: string
          destination_city: string
          destination_country: string
          id?: string
          origin_city: string
          origin_country: string
          price_per_kg?: number | null
          restricted_item_preferences?: string | null
          status?: string
          traveller_id: string
        }
        Update: {
          arrival_date?: string
          available_kg?: number
          capacity_kg?: number
          created_at?: string
          departure_date?: string
          destination_city?: string
          destination_country?: string
          id?: string
          origin_city?: string
          origin_country?: string
          price_per_kg?: number | null
          restricted_item_preferences?: string | null
          status?: string
          traveller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_traveller_id_fkey"
            columns: ["traveller_id"]
            isOneToOne: false
            referencedRelation: "traveller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          created_at: string
          document_url: string
          id: string
          id_document_type: string | null
          reviewed_by: string | null
          status: string
          traveller_id: string
        }
        Insert: {
          created_at?: string
          document_url: string
          id?: string
          id_document_type?: string | null
          reviewed_by?: string | null
          status?: string
          traveller_id: string
        }
        Update: {
          created_at?: string
          document_url?: string
          id?: string
          id_document_type?: string | null
          reviewed_by?: string | null
          status?: string
          traveller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_traveller_id_fkey"
            columns: ["traveller_id"]
            isOneToOne: false
            referencedRelation: "traveller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_traveller: { Args: { p_traveller_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      report_payment_sent: { Args: { p_request_id: string }; Returns: undefined }
      admin_confirm_payment: { Args: { p_request_id: string }; Returns: undefined }
      admin_reject_payment: { Args: { p_request_id: string }; Returns: undefined }
      public_feedback: {
        Args: never
        Returns: {
          id: string
          display_name: string
          role: string | null
          rating: number
          comment: string
          created_at: string
        }[]
      }
      browse_open_trips: {
        Args: never
        Returns: {
          id: string
          origin_country: string
          origin_city: string
          destination_country: string
          destination_city: string
          departure_date: string
          arrival_date: string
          available_kg: number
          price_per_kg: number | null
          restricted_item_preferences: string | null
          traveller_first_name: string
          traveller_rating: number
          traveller_deliveries: number
          traveller_verified: boolean
          is_mine: boolean
        }[]
      }
      browse_open_requests: {
        Args: never
        Returns: {
          id: string
          origin_country: string
          origin_city: string
          destination_country: string
          destination_city: string
          item_type: string
          item_description: string
          weight_kg: number
          item_value: number
          urgency_level: string
          preferred_date: string | null
          special_handling_flags: string[]
          offered_price: number | null
          created_at: string
        }[]
      }
      get_request_counterparty: {
        Args: { p_request_id: string }
        Returns: {
          counterparty_role: string
          first_name: string
          rating: number | null
          total_deliveries: number | null
          verified: boolean | null
          my_rating: number | null
        }[]
      }
      book_trip: {
        Args: {
          p_trip_id: string
          p_item_type: string
          p_item_description: string
          p_weight_kg: number
          p_item_value: number
          p_flags?: string[]
        }
        Returns: string
      }
      claim_request: { Args: { p_request_id: string; p_trip_id: string }; Returns: undefined }
      decline_match: { Args: { p_match_id: string }; Returns: undefined }
      cancel_request: { Args: { p_request_id: string }; Returns: undefined }
      fund_escrow: { Args: { p_request_id: string }; Returns: undefined }
      confirm_receipt: { Args: { p_request_id: string }; Returns: undefined }
      raise_dispute: { Args: { p_request_id: string; p_reason: string }; Returns: undefined }
      rate_request: { Args: { p_request_id: string; p_rating: number; p_comment?: string }; Returns: undefined }
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
  public: {
    Enums: {},
  },
} as const
