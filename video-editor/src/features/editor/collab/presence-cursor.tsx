import { MousePointer2 } from "lucide-react";
import type { CSSProperties } from "react";

export function PresenceCursor({ name, color, style }: {
  name: string;
  color: string;
  style: CSSProperties;
}) {
  return (
    <div className="absolute" style={style}>
      <MousePointer2 size={18} fill={color} stroke="white" className="-translate-x-[3px] -translate-y-[3px] drop-shadow-sm" />
      <span className="ml-3 block max-w-36 truncate px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: color }}>
        {name}
      </span>
    </div>
  );
}
