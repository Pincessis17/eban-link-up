/** True only on the test website (Vercel env VITE_EBAN_ENV=test). The real site never sets it. */
export const IS_TEST_SITE = import.meta.env.VITE_EBAN_ENV === "test";

/**
 * Inside the simulator, each screen is an iframe named "eban-sim-<role>".
 * Giving each one its own storage key lets three different people be signed in at once.
 */
export const SIM_STORAGE_KEY: string | null =
  IS_TEST_SITE && typeof window !== "undefined" && window.name.startsWith("eban-sim-") ? window.name : null;
