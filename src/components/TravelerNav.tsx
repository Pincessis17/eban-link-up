import { AppNav } from "@/components/AppNav";

export const TravelerNav = () => (
  <AppNav
    home="/traveler"
    sub="Traveller"
    items={[
      { to: "/traveler", label: "Your trips" },
      { to: "/traveler/browse", label: "Find requests" },
      { to: "/traveler/requests", label: "Bookings", match: (p) => p.startsWith("/traveler/requests") },
      { to: "/traveler/earnings", label: "Earnings" },
      { to: "/traveler/new-trip", label: "Post a trip" },
      { to: "/profile", label: "Profile", match: (p) => p.startsWith("/profile") || p.startsWith("/verify") },
    ]}
  />
);
