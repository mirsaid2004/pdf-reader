"use client";

import { useEffect, useState } from "react";

/** Tracks an element's content-box size (callback-ref friendly: pass the element from state). */
export function useElementSize(el: HTMLElement | null) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize((prev) =>
        prev.width === el.clientWidth && prev.height === el.clientHeight
          ? prev
          : { width: el.clientWidth, height: el.clientHeight },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);

  return size;
}
