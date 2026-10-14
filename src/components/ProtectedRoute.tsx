import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: "Admin" | "Sender" | "Traveller";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && profile?.role !== requireRole && profile?.role !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
