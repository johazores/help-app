"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } finally {
    area.remove();
  }
}

/**
 * Copies text and reports honestly whether it worked. `copied` holds the key
 * of the last successful copy for two seconds; `failed` is set when neither
 * the Clipboard API (unavailable on plain HTTP) nor the fallback succeeded.
 */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (text: string, key = "default") => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = legacyCopy(text);
      }
    } catch {
      ok = legacyCopy(text);
    }
    setFailed(!ok);
    if (timer.current) clearTimeout(timer.current);
    if (ok) {
      setCopied(key);
      timer.current = setTimeout(() => setCopied(null), 2000);
    }
    return ok;
  }, []);

  return { copy, copied, failed };
}
