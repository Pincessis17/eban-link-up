import { supabase } from "@/integrations/supabase/client";

/** Where the links in Eban's account emails send people back to. Always the site they signed up on. */
export const confirmRedirect = () => `${window.location.origin}/login?confirmed=1`;
export const resetRedirect = () => `${window.location.origin}/reset-password`;

/** Plain-English versions of the error messages Supabase sends back. */
export const friendlyAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox (and spam) for the link from Eban.";
  if (m.includes("already registered") || m.includes("already been registered")) return "There's already an account with this email. Sign in instead, or reset your password.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a few minutes and try again.";
  if (m.includes("should be at least") || m.includes("password should")) return "Use at least 8 characters, with letters and numbers.";
  if (m.includes("same password") || m.includes("different from the old")) return "Choose a password you haven't used here before.";
  if (m.includes("aal2") || m.includes("mfa")) return "Admins must enter their authenticator code before changing the password. Sign in, enter the code, then change it.";
  return message;
};

export const resendConfirmation = async (email: string) => {
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: confirmRedirect() } });
  return error ? friendlyAuthError(error.message) : null;
};
