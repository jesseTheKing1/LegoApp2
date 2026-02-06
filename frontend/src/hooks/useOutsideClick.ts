// src/hooks/useOutsideClick.ts
import { useEffect, useRef } from "react";

export function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = ref.current;
      if (!el) return;

      const target = e.target as Node | null;
      if (!target) return;

      // If click is INSIDE, do nothing
      if (el.contains(target)) return;

      // Outside → close
      onOutside();
    }

    // IMPORTANT: do NOT use capture, do NOT preventDefault/stopPropagation
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onOutside]);

  return ref;
}

