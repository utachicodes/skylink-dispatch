import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DeliveryInsert = Database["public"]["Tables"]["deliveries"]["Insert"];
type DeliveryUpdate = Database["public"]["Tables"]["deliveries"]["Update"];

export const deliveryService = {
  async createDelivery(delivery: DeliveryInsert) {
    const { data, error } = await supabase
      .from("deliveries")
      .insert(delivery)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDeliveryStatus(deliveryId: string, status: Database["public"]["Enums"]["delivery_status"]) {
    const updates: DeliveryUpdate = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "delivered") {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("deliveries")
      .update(updates)
      .eq("id", deliveryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async assignOperator(deliveryId: string, operatorId: string, droneId?: string) {
    const updates: DeliveryUpdate = {
      operator_id: operatorId,
      status: "confirmed",
      updated_at: new Date().toISOString()
    };

    if (droneId) {
      updates.drone_id = droneId;
    }

    const { data, error } = await supabase
      .from("deliveries")
      .update(updates)
      .eq("id", deliveryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDelivery(deliveryId: string) {
    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (error) throw error;
    return data;
  },

  async getPendingDeliveries() {
    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .in("status", ["pending", "confirmed"])
      .is("operator_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }
};
