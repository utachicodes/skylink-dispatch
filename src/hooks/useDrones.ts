import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Drone = Database["public"]["Tables"]["drones"]["Row"];

export function useDrones() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrones = async () => {
      try {
        const { data, error } = await supabase
          .from("drones")
          .select("*")
          .eq("is_active", true)
          .order("drone_name");

        if (error) throw error;
        setDrones(data || []);
      } catch (error) {
        console.error("Error fetching drones:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrones();

    const channel = supabase
      .channel("drones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drones",
        },
        () => {
          fetchDrones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { drones, loading };
}
