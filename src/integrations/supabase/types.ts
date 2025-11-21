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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      deliveries: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          drone_id: string | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: string
          estimated_time: number | null
          id: string
          operator_id: string | null
          package_note: string | null
          package_size: string | null
          package_weight: number | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: string
          points_cost: number
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          drone_id?: string | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: string
          estimated_time?: number | null
          id?: string
          operator_id?: string | null
          package_note?: string | null
          package_size?: string | null
          package_weight?: number | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: string
          points_cost?: number
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          drone_id?: string | null
          dropoff_lat?: number
          dropoff_lng?: number
          dropoff_location?: string
          estimated_time?: number | null
          id?: string
          operator_id?: string | null
          package_note?: string | null
          package_size?: string | null
          package_weight?: number | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_location?: string
          points_cost?: number
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_tracking: {
        Row: {
          altitude: number | null
          battery_level: number | null
          delivery_id: string | null
          drone_id: string
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
        }
        Insert: {
          altitude?: number | null
          battery_level?: number | null
          delivery_id?: string | null
          drone_id: string
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
        }
        Update: {
          altitude?: number | null
          battery_level?: number | null
          delivery_id?: string | null
          drone_id?: string
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "drone_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_tracking_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
        ]
      }
      drones: {
        Row: {
          autonomous_mode: boolean
          battery_level: number | null
          camera_stream_url: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          drone_name: string
          gps_signal: boolean
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          autonomous_mode?: boolean
          battery_level?: number | null
          camera_stream_url?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          drone_name: string
          gps_signal?: boolean
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          autonomous_mode?: boolean
          battery_level?: number | null
          camera_stream_url?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          drone_name?: string
          gps_signal?: boolean
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          delivery_id: string | null
          drone_id: string | null
          id: string
          log_type: string
          message: string
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          drone_id?: string | null
          id?: string
          log_type: string
          message: string
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          drone_id?: string | null
          id?: string
          log_type?: string
          message?: string
          severity?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          phone?: string | null
          points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          points?: number
          updated_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_points: {
        Args: { _points: number; _user_id: string }
        Returns: undefined
      }
      deduct_points: {
        Args: { _points: number; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "operator" | "admin"
      delivery_status:
        | "pending"
        | "confirmed"
        | "in_flight"
        | "arrived"
        | "delivered"
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
      app_role: ["client", "operator", "admin"],
      delivery_status: [
        "pending",
        "confirmed",
        "in_flight",
        "arrived",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
