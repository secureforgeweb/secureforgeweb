import { useCallback, useRef, useState } from "react";

const STORAGE_PREFIX = "secureforgeweb-table-widths-";

function readStoredWidths<T extends string>(
  storageKey: string,
  defaults: Record<T, number>
): Record<T, number> {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<T, number>>;
    const merged = { ...defaults };
    for (const key of Object.keys(defaults) as T[]) {
      const value = parsed[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 32) {
        merged[key] = value;
      }
    }
    return merged;
  } catch {
    return defaults;
  }
}

function persistWidths<T extends string>(storageKey: string, widths: Record<T, number>) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(widths));
  } catch {
    // ignore quota / private mode
  }
}

export function useResizableColumns<T extends string>(
  storageKey: string,
  defaults: Record<T, number>,
  minWidth = 48
) {
  const [widths, setWidths] = useState<Record<T, number>>(() =>
    readStoredWidths(storageKey, defaults)
  );
  const resizing = useRef<{ col: T; startX: number; startW: number } | null>(null);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const onResizeStart = useCallback(
    (col: T, clientX: number) => {
      resizing.current = { col, startX: clientX, startW: widthsRef.current[col] };

      const onMove = (e: MouseEvent) => {
        if (!resizing.current) return;
        const delta = e.clientX - resizing.current.startX;
        const next = Math.max(minWidth, resizing.current.startW + delta);
        setWidths((prev) => {
          const updated = { ...prev, [resizing.current!.col]: next };
          widthsRef.current = updated;
          return updated;
        });
      };

      const onUp = () => {
        persistWidths(storageKey, widthsRef.current);
        resizing.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [minWidth, storageKey]
  );

  const resetWidths = useCallback(() => {
    setWidths(defaults);
    persistWidths(storageKey, defaults);
  }, [defaults, storageKey]);

  return { widths, onResizeStart, resetWidths };
}
