"use client";

import * as React from "react";

// Recharts tooltips follow the pointer and ignore pointer events, so the eye
// button inside one can't be reached. Hover still previews as before; a click
// or tap pins the tooltip on that bar/slice (trigger "click") and makes it
// interactive, until the user clicks or taps outside the chart card.
export function usePinnedTooltip() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    if (!pinned) return;
    const unpinOutside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener("pointerdown", unpinOutside);
    return () => document.removeEventListener("pointerdown", unpinOutside);
  }, [pinned]);

  return {
    ref,
    pin: () => setPinned(true),
    tooltipProps: {
      trigger: pinned ? "click" : "hover",
      wrapperStyle: { pointerEvents: pinned ? "auto" : "none" },
    } as const,
    // Keeps a click inside the tooltip (the eye) from also re-targeting the chart.
    stopClick: (e: React.MouseEvent) => e.stopPropagation(),
  };
}
