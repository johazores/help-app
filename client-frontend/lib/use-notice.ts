"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Notice {
  text: string;
  bad?: boolean;
}

/** A status message that clears itself; a newer message always replaces an older one. */
export function useNotice(durationMs = 6000) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const say = useCallback(
    (text: string, bad = false) => {
      if (timer.current) clearTimeout(timer.current);
      setNotice({ text, bad });
      timer.current = setTimeout(() => setNotice(null), durationMs);
    },
    [durationMs],
  );

  return { notice, say };
}
