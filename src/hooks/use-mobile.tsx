import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Updated to return boolean | undefined to signify loading state
export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Guard against SSR or environments where window is not defined
    if (typeof window === 'undefined') {
        return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const handleResize = () => {
      setIsMobile(mql.matches);
    };

    // Set initial state
    handleResize(); 

    // Listen for changes
    mql.addEventListener("change", handleResize);
    
    return () => {
      mql.removeEventListener("change", handleResize);
    };
  }, []); // Empty dependency array ensures this runs once on mount client-side

  return isMobile;
}
