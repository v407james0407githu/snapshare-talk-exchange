import { useEffect, useState } from "react";

export function useDeferredPublicQuery(delay = 350) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const run = () => setEnabled(true);

    const handle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (
            window as Window & {
              requestIdleCallback?: (
                callback: () => void,
                options?: { timeout: number },
              ) => number;
            }
          ).requestIdleCallback?.(run, { timeout: delay * 4 }) ??
          window.setTimeout(run, delay)
        : window.setTimeout(run, delay);

    return () => {
      if (typeof handle === "number") {
        window.clearTimeout(handle);
      }
    };
  }, [delay]);

  return enabled;
}
