// useOutsideClick.ts
import { useEffect, useRef } from "react";

export function useOutsideClick<T extends HTMLElement>(
  onOutside: () => void,
  extraRefs: Array<React.RefObject<HTMLElement>> = []
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;

      const mainEl = ref.current;
      const extraEls = extraRefs.map(r => r.current).filter(Boolean) as HTMLElement[];

      const insideMain = mainEl ? mainEl.contains(target) : false;
      const insideExtra = extraEls.some(el => el.contains(target));

      if (!insideMain && !insideExtra) onOutside();
    }

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onOutside, extraRefs]);

  return ref;
}
