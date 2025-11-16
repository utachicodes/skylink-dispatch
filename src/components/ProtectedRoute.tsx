import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!userRole) {
    return <Navigate to="/select-role" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const defaultRoute = userRole === "operator" ? "/operator" : userRole === "admin" ? "/admin" : "/dashboard";
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};
