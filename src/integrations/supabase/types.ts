export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_code: string | null
          category: string
          created_at: string
          feature_ref: string | null
          id: string
          install_date: string | null
          last_maintenance: string | null
          latitude: number | null
          layer_id: string | null
          location_name: string | null
          longitude: number | null
          metadata: Json
          name: string
          next_maintenance: string | null
          status: Database["public"]["Enums"]["asset_status"]
          subcategory: string | null
          tag_code: string | null
          updated_at: string
        }
        Insert: {
          asset_code?: string | null
          category: string
          created_at?: string
          feature_ref?: string | null
          id?: string
          install_date?: string | null
          last_maintenance?: string | null
          latitude?: number | null
          layer_id?: string | null
          location_name?: string | null
          longitude?: number | null
          metadata?: Json
          name: string
          next_maintenance?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          subcategory?: string | null
          tag_code?: string | null
          updated_at?: string
        }
        Update: {
          asset_code?: string | null
          category?: string
          created_at?: string
          feature_ref?: string | null
          id?: string
          install_date?: string | null
          last_maintenance?: string | null
          latitude?: number | null
          layer_id?: string | null
          location_name?: string | null
          longitude?: number | null
          metadata?: Json
          name?: string
          next_maintenance?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          subcategory?: string | null
          tag_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gis_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_features: {
        Row: {
          created_at: string
          geometry: Json
          id: string
          layer_id: string
          name: string | null
          properties: Json
        }
        Insert: {
          created_at?: string
          geometry: Json
          id?: string
          layer_id: string
          name?: string | null
          properties?: Json
        }
        Update: {
          created_at?: string
          geometry?: Json
          id?: string
          layer_id?: string
          name?: string | null
          properties?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gis_features_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gis_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_layers: {
        Row: {
          bbox: Json | null
          category: string
          color: string
          created_at: string
          description: string | null
          feature_count: number
          geometry_type: string
          icon: string | null
          id: string
          name: string
          source_file: string | null
          storage_path: string | null
          updated_at: string
          visible_by_default: boolean
        }
        Insert: {
          bbox?: Json | null
          category: string
          color?: string
          created_at?: string
          description?: string | null
          feature_count?: number
          geometry_type: string
          icon?: string | null
          id?: string
          name: string
          source_file?: string | null
          storage_path?: string | null
          updated_at?: string
          visible_by_default?: boolean
        }
        Update: {
          bbox?: Json | null
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          feature_count?: number
          geometry_type?: string
          icon?: string | null
          id?: string
          name?: string
          source_file?: string | null
          storage_path?: string | null
          updated_at?: string
          visible_by_default?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          id: number
          recorded_at: string
          sensor_id: string
          value: number
        }
        Insert: {
          id?: number
          recorded_at?: string
          sensor_id: string
          value: number
        }
        Update: {
          id?: number
          recorded_at?: string
          sensor_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      sensors: {
        Row: {
          asset_id: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          sensor_type: string
          unit: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          sensor_type: string
          unit?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          sensor_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensors_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          order_number: string
          priority: Database["public"]["Enums"]["work_order_priority"]
          status: Database["public"]["Enums"]["work_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          order_number?: string
          priority?: Database["public"]["Enums"]["work_order_priority"]
          status?: Database["public"]["Enums"]["work_order_status"]
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          order_number?: string
          priority?: Database["public"]["Enums"]["work_order_priority"]
          status?: Database["public"]["Enums"]["work_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "facility_manager" | "maintenance" | "viewer"
      asset_status: "operational" | "maintenance" | "offline" | "decommissioned"
      work_order_priority: "low" | "medium" | "high" | "critical"
      work_order_status:
        | "open"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
    Enums: {
      app_role: ["admin", "facility_manager", "maintenance", "viewer"],
      asset_status: ["operational", "maintenance", "offline", "decommissioned"],
      work_order_priority: ["low", "medium", "high", "critical"],
      work_order_status: [
        "open",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
