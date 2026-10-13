import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * True below `breakpoint` CSS pixels (default 768). A component whose CSS stacks at
 * another width passes that width, so its JS branch and its CSS agree (D32).
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  // Initialize with actual value to avoid false -> true flash on mobile
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
