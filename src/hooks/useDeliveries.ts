import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Delivery = Database["public"]["Tables"]["deliveries"]["Row"];

export function useDeliveries(userId?: string, role?: string | null) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) {
      setLoading(false);
      return;
    }

    const fetchDeliveries = async () => {
      try {
        let query = supabase.from("deliveries").select("*").order("created_at", { ascending: false });

        if (role === "client") {
          query = query.eq("client_id", userId);
        } else if (role === "operator") {
          query = query.eq("operator_id", userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setDeliveries(data || []);
      } catch (error) {
        console.error("Error fetching deliveries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();

    const channel = supabase
      .channel("deliveries-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role]);

  return { deliveries, loading };
}
