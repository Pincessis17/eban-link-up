import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminBookings from "./pages/AdminBookings.tsx";
import AdminFeedback from "./pages/admin/AdminFeedback";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import TravelerHome from "./pages/traveler/TravelerHome.tsx";
import TravelerNewTrip from "./pages/traveler/TravelerNewTrip.tsx";
import TravelerRequests from "./pages/traveler/TravelerRequests.tsx";
import TravelerRequestDetail from "./pages/traveler/TravelerRequestDetail.tsx";
import TravelerVerification from "./pages/traveler/TravelerVerification.tsx";
import TravelerEarnings from "./pages/traveler/TravelerEarnings.tsx";
import AdminMatch from "./pages/admin/AdminMatch.tsx";
import AdminVerifications from "./pages/admin/AdminVerifications.tsx";
import AdminPayouts from "./pages/admin/AdminPayouts.tsx";
import AdminTravelers from "./pages/admin/AdminTravelers.tsx";
import SenderRequests from "./pages/sender/SenderRequests.tsx";
import SenderRequestDetail from "./pages/sender/SenderRequestDetail.tsx";
import SenderNewRequest from "./pages/sender/SenderNewRequest.tsx";
import SenderBrowseTrips from "./pages/sender/SenderBrowseTrips.tsx";
import TravelerBrowseRequests from "./pages/traveler/TravelerBrowseRequests.tsx";

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
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute requireRole="Admin">
                  <AdminFeedback />
                </ProtectedRoute>
              }
            />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute requireRole="Admin">
                  <AdminBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/new-trip"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerNewTrip />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/browse"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerBrowseRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/requests"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/requests/:id"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerRequestDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/match"
              element={
                <ProtectedRoute requireRole="Admin">
                  <AdminMatch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute requireRole="Admin">
                  <AdminVerifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payouts"
              element={
                <ProtectedRoute requireRole="Admin">
                  <AdminPayouts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/travelers"
              element={
                <ProtectedRoute requireRole="Admin">
                  <AdminTravelers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/verification"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/earnings"
              element={
                <ProtectedRoute requireRole="Traveller">
                  <TravelerEarnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/trips"
              element={
                <ProtectedRoute requireRole="Sender">
                  <SenderBrowseTrips />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/requests"
              element={
                <ProtectedRoute requireRole="Sender">
                  <SenderRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/requests/:id"
              element={
                <ProtectedRoute requireRole="Sender">
                  <SenderRequestDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/new-request"
              element={
                <ProtectedRoute requireRole="Sender">
                  <SenderNewRequest />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
