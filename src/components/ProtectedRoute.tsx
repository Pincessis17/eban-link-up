import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSecurityGate } from "@/components/AdminSecurityGate";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: "Admin" | "Sender" | "Traveller";
  /** Only for the page where admins set up their authenticator. */
  skipAdminGate?: boolean;
}

export function ProtectedRoute({ children, requireRole, skipAdminGate }: ProtectedRouteProps) {
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

  // Admin pages need two-step login (authenticator code) on top of the password.
  if (requireRole === "Admin" && !skipAdminGate) {
    return <AdminSecurityGate>{children}</AdminSecurityGate>;
  }

  return <>{children}</>;
}
