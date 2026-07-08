import { cn } from "@/lib/utils";

export function ColumnResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (clientX: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-primary/40 active:bg-primary/60"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e.clientX);
      }}
    />
  );
}

export function ResizableTable({
  children,
  className,
  minWidth,
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: number | string;
}) {
  return (
    <table
      className={cn("w-full", className)}
      style={{ tableLayout: "fixed", minWidth: minWidth ?? "100%" }}
    >
      {children}
    </table>
  );
}

export function ResizableColGroup<T extends string>({
  columns,
  widths,
}: {
  columns: readonly T[];
  widths: Record<T, number>;
}) {
  return (
    <colgroup>
      {columns.map((col) => (
        <col key={col} style={{ width: widths[col] }} />
      ))}
    </colgroup>
  );
}

export function ResizableTh({
  children,
  resizable = true,
  onResizeStart,
  className,
  innerClassName,
  ...props
}: React.ComponentProps<"th"> & {
  resizable?: boolean;
  onResizeStart?: (clientX: number) => void;
  innerClassName?: string;
}) {
  return (
    <th className={cn("relative p-0 font-medium select-none", className)} {...props}>
      <div className={cn("px-3 py-2 pr-4 flex items-center gap-2 min-h-[2rem]", innerClassName)}>
        {children}
      </div>
      {resizable && onResizeStart ? <ColumnResizeHandle onResizeStart={onResizeStart} /> : null}
    </th>
  );
}
