import { AppNav } from "@/components/AppNav";

export const SenderNav = () => (
  <AppNav
    home="/sender/requests"
    sub="Sender"
    items={[
      { to: "/sender/trips", label: "Browse trips" },
      { to: "/sender/requests", label: "My requests", match: (p) => p.startsWith("/sender/requests") },
      { to: "/sender/new-request", label: "Post a request" },
      { to: "/profile", label: "Profile", match: (p) => p.startsWith("/profile") || p.startsWith("/verify") },
    ]}
  />
);
