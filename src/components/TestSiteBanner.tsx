import { Link, useLocation } from "react-router-dom";
import { IS_TEST_SITE, SIM_STORAGE_KEY } from "@/lib/env";

/** A loud strip on the test website so it can never be mistaken for the real one. */
export const TestSiteBanner = () => {
  const { pathname } = useLocation();
  if (!IS_TEST_SITE || SIM_STORAGE_KEY || pathname === "/simulator") return null;
  return (
    <div className="relative z-[60] bg-clay text-white font-body text-xs font-semibold text-center px-3 py-1.5">
      TEST SITE · fake people and fake money ·{" "}
      <Link to="/simulator" className="underline underline-offset-2">Open the simulator</Link>
    </div>
  );
};
