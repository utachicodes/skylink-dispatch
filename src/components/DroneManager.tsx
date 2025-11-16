import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Plus, Edit, Trash2, Battery, Radio, MapPin, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTelemetry } from "@/hooks/useTelemetry";

interface Drone {
  id: string;
  drone_name: string;
  is_active: boolean;
  battery_level: number;
  gps_signal: boolean;
  autonomous_mode: boolean;
  current_lat: number | null;
  current_lng: number | null;
  camera_stream_url: string | null;
  created_at: string;
}

export function DroneManager() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Drone | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { latestById } = useTelemetry();
  const [formData, setFormData] = useState({
    drone_name: "",
    is_active: true,
    camera_stream_url: "",
  });

  const fetchDrones = async () => {
    try {
      const { data, error } = await supabase.from("drones").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setDrones(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load drones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrones();
  }, []);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from("drones").insert({
        drone_name: formData.drone_name,
        is_active: formData.is_active,
        camera_stream_url: formData.camera_stream_url || null,
      });
      if (error) throw error;
      toast.success("Drone created");
      setIsDialogOpen(false);
      setFormData({ drone_name: "", is_active: true, camera_stream_url: "" });
      fetchDrones();
    } catch (error: any) {
      toast.error(error.message || "Failed to create drone");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("drones")
        .update({
          drone_name: formData.drone_name,
          is_active: formData.is_active,
          camera_stream_url: formData.camera_stream_url || null,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Drone updated");
      setIsDialogOpen(false);
      setEditing(null);
      setFormData({ drone_name: "", is_active: true, camera_stream_url: "" });
      fetchDrones();
    } catch (error: any) {
      toast.error(error.message || "Failed to update drone");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this drone?")) return;
    try {
      const { error } = await supabase.from("drones").delete().eq("id", id);
      if (error) throw error;
      toast.success("Drone deleted");
      fetchDrones();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete drone");
    }
  };

  const handleEdit = (drone: Drone) => {
    setEditing(drone);
    setFormData({
      drone_name: drone.drone_name,
      is_active: drone.is_active,
      camera_stream_url: drone.camera_stream_url || "",
    });
    setIsDialogOpen(true);
  };

  const getLiveTelemetry = (droneId: string) => {
    // Try to match drone ID with telemetry frames
    const frame = Object.values(latestById).find((f) => f.droneId === droneId || f.droneId.includes(droneId));
    return frame;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading drones...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Drone Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditing(null);
              setFormData({ drone_name: "", is_active: true, camera_stream_url: "" });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Drone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Drone" : "Add New Drone"}</DialogTitle>
              <DialogDescription>Configure drone settings and capabilities</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="drone_name">Drone Name</Label>
                <Input
                  id="drone_name"
                  value={formData.drone_name}
                  onChange={(e) => setFormData({ ...formData, drone_name: e.target.value })}
                  placeholder="DRN-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camera_stream_url">Camera Stream URL (Optional)</Label>
                <Input
                  id="camera_stream_url"
                  value={formData.camera_stream_url}
                  onChange={(e) => setFormData({ ...formData, camera_stream_url: e.target.value })}
                  placeholder="rtsp://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => editing ? handleUpdate(editing.id) : handleCreate()}
              >
                {editing ? "Update" : "Create"} Drone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {drones.map((drone) => {
          const liveData = getLiveTelemetry(drone.id);
          return (
            <Card key={drone.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary" />
                    {drone.drone_name}
                  </CardTitle>
                  <Badge variant={drone.is_active ? "default" : "secondary"}>
                    {drone.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>ID: {drone.id.slice(0, 8)}...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Battery className="h-4 w-4 text-primary" />
                    <span>{liveData?.battery ?? drone.battery_level ?? "--"}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-accent" />
                    <span>{drone.gps_signal ? "GPS" : "No GPS"}</span>
                  </div>
                  {liveData && (
                    <>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-xs">{liveData.latitude.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{liveData.altitude.toFixed(0)}m</span>
                      </div>
                    </>
                  )}
                  {drone.camera_stream_url && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Video className="h-4 w-4 text-primary" />
                      <span className="text-xs truncate">Stream available</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(drone)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(drone.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

