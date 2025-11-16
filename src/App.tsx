import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RoleSelection from "./pages/RoleSelection";
import Dashboard from "./pages/Dashboard";
import CreateDelivery from "./pages/CreateDelivery";
import TrackDelivery from "./pages/TrackDelivery";
import History from "./pages/History";
import Profile from "./pages/Profile";
import OperatorDashboard from "./pages/OperatorDashboard";
import PilotControl from "./pages/PilotControl";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/select-role" element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />
            
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["client"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/create-delivery" element={<ProtectedRoute allowedRoles={["client"]}><CreateDelivery /></ProtectedRoute>} />
            <Route path="/track/:id" element={<ProtectedRoute><TrackDelivery /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute allowedRoles={["client"]}><History /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            <Route path="/operator" element={<ProtectedRoute allowedRoles={["operator"]}><OperatorDashboard /></ProtectedRoute>} />
            <Route path="/pilot/mission/:missionId" element={<ProtectedRoute allowedRoles={["operator"]}><PilotControl /></ProtectedRoute>} />
            <Route path="/pilot/delivery/:deliveryId" element={<ProtectedRoute allowedRoles={["operator"]}><PilotControl /></ProtectedRoute>} />
            <Route path="/pilot/:missionId" element={<ProtectedRoute allowedRoles={["operator"]}><PilotControl /></ProtectedRoute>} />
            
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
