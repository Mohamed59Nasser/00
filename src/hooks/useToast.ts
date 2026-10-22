"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastState } from "@/components/ui";

export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (kind: "success" | "error", message: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ kind, message });
      timer.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { toast, show };
}
