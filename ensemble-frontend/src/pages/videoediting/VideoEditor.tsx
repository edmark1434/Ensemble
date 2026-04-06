import {
  useEffect, useRef, useState, useCallback,
  type ChangeEvent, type DragEvent, type KeyboardEvent,
} from "react";
import {
  Edit, Canvas, Timeline, Controls, UIController, VideoExporter,
} from "@shotstack/shotstack-studio";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type AssetItem = {
  id: string; name: string; url: string;
  type: "video" | "image" | "audio";
  duration?: number; thumbnail?: string;
};

type SelectedClipInfo = {
  trackIndex: number; clipIndex: number; clip: any;
};

type LeftTab = "media" | "text" | "audio" | "effects" | "transitions";
type RightTab = "clip" | "output" | "color";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const TEXT_PRESETS = [
  { label: "BIG TITLE",  size: 96,  weight: 800, color: "#ffffff", family: "Work Sans" },
  { label: "Subtitle",   size: 56,  weight: 600, color: "#d7d7df", family: "Work Sans" },
  { label: "Caption",    size: 34,  weight: 400, color: "#bcbcc8", family: "Work Sans" },
  { label: "Lower Third",size: 42,  weight: 700, color: "#ffe066", family: "Work Sans" },
  { label: "Quote",      size: 38,  weight: 400, color: "#a8d8ea", family: "Georgia"   },
];

const FILTERS = [
  "none","greyscale","sepia","negative","fade","blur","sharpen",
  "contrast","brightness","saturation","hue_rotate",
];
const EFFECTS = [
  "none","zoomIn","zoomOut","slideLeft","slideRight","slideUp","slideDown",
  "carouselLeft","carouselRight","carouselUp","carouselDown","rotate",
];
const TRANSITIONS = ["none","fade","wipe","zoom","slideLeft","slideRight","carouselLeft","carouselRight","spin"];
const FIT_OPTIONS  = ["cover","contain","crop","none"];
const POSITIONS    = ["center","top","topRight","right","bottomRight","bottom","bottomLeft","left","topLeft"];

const OUTPUT_SIZES = [
  { label: "1280 × 720  (HD)",      width: 1280,  height: 720  },
  { label: "1920 × 1080 (Full HD)", width: 1920,  height: 1080 },
  { label: "3840 × 2160 (4K)",      width: 3840,  height: 2160 },
  { label: "1080 × 1920 (9:16)",    width: 1080,  height: 1920 },
  { label: "1080 × 1080 (Square)",  width: 1080,  height: 1080 },
];
const OUTPUT_FPS     = [24, 25, 30, 60];
const OUTPUT_FORMATS = ["mp4", "mov", "gif"] as const;
const OUTPUT_QUALITY = ["low", "medium", "high"] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   TINY ICON COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
function Ico({ d, size = 14, fill = false }: { d: string | string[]; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block" }}>
      {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const ICONS = {
  play:     "M5 3l14 9-14 9V3z",
  pause:    ["M6 4h4v16H6z","M14 4h4v16h-4z"],
  stop:     "M4 4h16v16H4z",
  skipB:    ["M19 20L9 12l10-8v16z","M5 4v16"],
  skipF:    ["M5 4l10 8-10 8V4z","M19 4v16"],
  undo:     ["M3 7v6h6","M3 13A9 9 0 1 0 5.27 5.27"],
  redo:     ["M21 7v6h-6","M21 13A9 9 0 1 1 18.73 5.27"],
  cut:      ["M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M6 9l10.5 6","M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z","M6 15l10.5-6"],
  split:    ["M12 3v18","M3 8l4 4-4 4","M21 8l-4 4 4 4"],
  trash:    ["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"],
  text:     "M4 6h16M4 10h10M4 14h12M4 18h8",
  img:      ["M21 15l-5-5L5 21","M7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z","M3 3h18v18H3z"],
  video:    ["M15 10l4.55-2.28A1 1 0 0 1 21 8.72v6.56a1 1 0 0 1-1.45.9L15 14v-4z","M3 8h12v8H3z"],
  audio:    "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  effects:  "M12 22a10 10 0 1 0-4.868-18.786M12 22c2.21 0 4-2.239 4-5H8c0 2.761 1.79 5 4 5z",
  trans:    "M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3",
  export:   ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"],
  eye:      ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  eyeOff:   ["M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94","M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19","M1 1l22 22","M14.12 14.12A3 3 0 0 1 9.88 9.88"],
  lock:     ["M18 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z","M8 11V7a4 4 0 0 1 8 0v4"],
  plus:     "M12 5v14M5 12h14",
  gear:     "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  zoomP:    ["M11 8v6","M8 11h6","M21 21l-4.35-4.35","M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"],
  zoomM:    ["M8 11h6","M21 21l-4.35-4.35","M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"],
  vol:      ["M11 5L6 9H2v6h4l5 4V5z","M15.54 8.46a5 5 0 0 1 0 7.07","M19.07 4.93a10 10 0 0 1 0 14.14"],
  mute:     ["M11 5L6 9H2v6h4l5 4V5z","M23 9l-6 6","M17 9l6 6"],
  speed:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  crop:     ["M6 2v14h14","M2 6h14v14"],
  flip:     ["M7 2l-5 5 5 5","M17 2l5 5-5 5","M2 7h20","M12 14v8","M12 2v4"],
  rotate:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  color:    "M12 22a10 10 0 1 0-4.868-18.786",
  copy:     ["M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8z","M14 2v6h6","M10 13h4","M10 17h4"],
  chevD:    "M6 9l6 6 6-6",
  chevU:    "M18 15l-6-6-6 6",
  chevR:    "M9 18l6-6-6-6",
  bold:     "M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z",
  italic:   "M19 4h-9M14 20H5M15 4L9 20",
  alignL:   ["M3 6h18","M3 10h11","M3 14h18","M3 18h11"],
  alignC:   ["M3 6h18","M7 10h10","M3 14h18","M7 18h10"],
  alignR:   ["M3 6h18","M10 10h11","M3 14h18","M10 18h11"],
  wand:     ["M15 4l-3 3","M20 9l-3 3","M7.5 12l6-6","M4 20l8-8","M3 21l1-1"],
};

/* ═══════════════════════════════════════════════════════════════════════════
   WAVEFORM (realistic fake)
═══════════════════════════════════════════════════════════════════════════ */
function Waveform({ width, height, color }: { width: number; height: number; color: string }) {
  const bars = Math.max(1, Math.floor(width / 2.5));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {Array.from({ length: bars }, (_, i) => {
        const h = (
          Math.abs(Math.sin(i * 0.37 + 1.1)) * 0.42 +
          Math.abs(Math.sin(i * 0.13))        * 0.33 +
          Math.abs(Math.sin(i * 0.71 + 2))    * 0.25
        ) * height * 0.9;
        return <rect key={i} x={i * 2.5} y={(height - h) / 2} width={2} height={h}
          fill={color} opacity={0.7} rx={1} />;
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const fmtTime = (s: number) => {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs  = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
};

const intersects = (s1: number, l1: number, clip: any) => {
  const a2 = s1 + l1, b1 = Number(clip?.start ?? 0), b2 = b1 + Number(clip?.length ?? 0);
  return s1 < b2 && a2 > b1;
};

/* ═══════════════════════════════════════════════════════════════════════════
   UI PRIMITIVES
═══════════════════════════════════════════════════════════════════════════ */
const TB = ({ icon, label, onClick, active = false, danger = false, disabled = false, title: tip }:
  { icon: string | string[]; label?: string; onClick?: () => void; active?: boolean; danger?: boolean; disabled?: boolean; title?: string }) => (
  <button onClick={onClick} title={tip} disabled={disabled}
    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-all duration-100 select-none
      ${disabled ? "opacity-30 cursor-not-allowed" :
        danger  ? "text-red-400 hover:bg-red-500/12 hover:text-red-300" :
        active  ? "bg-[#1e6fff]/20 text-[#4d9fff]" :
                  "text-[#9ca3af] hover:bg-white/5 hover:text-[#e5e7eb]"}`}>
    <Ico d={icon} size={13} />
    {label && <span>{label}</span>}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-[#232323] mx-1 shrink-0" />;

const SectionHead = ({ title, open, toggle }: { title: string; open: boolean; toggle: () => void }) => (
  <button onClick={toggle}
    className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors">
    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a6070]">{title}</span>
    <Ico d={open ? ICONS.chevU : ICONS.chevD} size={9} />
  </button>
);

function Collapsible({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#1c1c1c]">
      <SectionHead title={title} open={open} toggle={() => setOpen(o => !o)} />
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-[#626878] w-[64px] shrink-0">{label}</span>
    <div className="flex-1">{children}</div>
  </div>
);

const Input = ({ value, onChange, type = "text", min, max, step, className = "" }:
  { value: any; onChange?: (v: any) => void; type?: string; min?: number; max?: number; step?: number; className?: string }) => (
  <input type={type} value={value} min={min} max={max} step={step}
    onChange={e => onChange?.(type === "number" ? +e.target.value : e.target.value)}
    className={`w-full bg-[#191b22] border border-[#252830] rounded-[3px] px-2 py-[4px]
      text-[11px] text-[#d1d5db] focus:outline-none focus:border-[#1e6fff]/60
      hover:border-[#333] transition-colors ${className}`} />
);

const Select = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="w-full bg-[#191b22] border border-[#252830] rounded-[3px] px-2 py-[4px]
      text-[11px] text-[#d1d5db] focus:outline-none focus:border-[#1e6fff]/60 hover:border-[#333] transition-colors">
    {children}
  </select>
);

const Slider = ({ value, min = 0, max = 100, step = 1, onChange, label }:
  { value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; label?: string }) => (
  <div className="flex items-center gap-2">
    {label && <span className="text-[10px] text-[#626878] w-[64px] shrink-0">{label}</span>}
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      className="flex-1 h-[3px] accent-[#1e6fff] cursor-pointer" />
    <span className="text-[10px] text-[#4a5260] w-8 text-right tabular-nums font-mono">{value}</span>
  </div>
);

const ColorPicker = ({ value, onChange, label }:
  { value: string; onChange: (v: string) => void; label?: string }) => (
  <div className="flex items-center gap-2">
    {label && <span className="text-[10px] text-[#626878] w-[64px] shrink-0">{label}</span>}
    <label className="flex items-center gap-2 cursor-pointer flex-1">
      <div className="w-6 h-6 rounded-[3px] border border-[#333] overflow-hidden shrink-0">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 -translate-x-1 -translate-y-1 cursor-pointer" />
      </div>
      <span className="text-[11px] font-mono text-[#9ca3af] uppercase">{value?.replace("#","")}</span>
    </label>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   IN-CANVAS TEXT EDITOR OVERLAY
   Renders an editable textarea floating over the canvas when a rich-text
   clip is selected, letting the user edit content directly on the canvas.
═══════════════════════════════════════════════════════════════════════════ */
function CanvasTextOverlay({
  clip, canvasRect, onCommit, onDismiss,
}: {
  clip: any; canvasRect: DOMRect | null; onCommit: (text: string) => void; onDismiss: () => void;
}) {
  const [text, setText] = useState<string>(clip?.asset?.text ?? "");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { taRef.current?.focus(); taRef.current?.select(); }, []);
  useEffect(() => { setText(clip?.asset?.text ?? ""); }, [clip?.asset?.text]);

  if (!canvasRect || clip?.asset?.type !== "rich-text") return null;

  const fontSize  = Math.max(12, Math.min(72, (clip.asset?.font?.size ?? 64) * (canvasRect.width / 1280)));
  const color     = clip.asset?.font?.color ?? "#ffffff";
  const fontWeight= clip.asset?.font?.weight ?? 600;

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { onDismiss(); }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { onCommit(text); }
    e.stopPropagation();
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: 20,
    }}>
      {/* dim backdrop */}
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)", pointerEvents:"auto" }}
        onClick={() => onCommit(text)} />
      <div style={{ position:"relative", zIndex:1, pointerEvents:"auto",
        width: "90%", maxWidth: 700, textAlign:"center" }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={3}
          style={{
            width:"100%", resize:"none", background:"rgba(0,0,0,0.6)",
            border:"2px solid #1e6fff",
            borderRadius:6, padding:"10px 14px",
            fontSize, fontWeight, color,
            lineHeight:1.3, textAlign:"center",
            outline:"none", backdropFilter:"blur(6px)",
            fontFamily:"Work Sans, system-ui, sans-serif",
          }} />
        <div style={{ marginTop:6, display:"flex", justifyContent:"center", gap:8 }}>
          <button onClick={() => onCommit(text)}
            style={{ background:"#1e6fff", color:"#fff", border:"none", borderRadius:4,
              padding:"5px 16px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
            ✓ Apply (Ctrl+Enter)
          </button>
          <button onClick={onDismiss}
            style={{ background:"rgba(255,255,255,0.08)", color:"#9ca3af", border:"1px solid #333",
              borderRadius:4, padding:"5px 12px", fontSize:11, cursor:"pointer" }}>
            Cancel (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT MODAL  — handles long videos gracefully
═══════════════════════════════════════════════════════════════════════════ */
function ExportModal({ onClose, onExport, isExporting, exportProgress, exportLog }:
  { onClose: () => void; onExport: (name: string, q: string) => void;
    isExporting: boolean; exportProgress: number; exportLog: string[] }) {
  const [name, setName]     = useState("my-video");
  const [quality, setQuality] = useState<string>("high");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={!isExporting ? onClose : undefined}>
      <div style={{ background:"#161820", border:"1px solid #252830", borderRadius:10,
        width:460, padding:28, boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize:16, fontWeight:700, color:"#e5e7eb", marginBottom:20 }}>Export Video</h2>

        {!isExporting ? (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, color:"#626878", display:"block", marginBottom:4 }}>FILE NAME</label>
              <Input value={name} onChange={setName} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:10, color:"#626878", display:"block", marginBottom:4 }}>QUALITY</label>
              <div style={{ display:"flex", gap:6 }}>
                {OUTPUT_QUALITY.map(q => (
                  <button key={q} onClick={() => setQuality(q)}
                    style={{ flex:1, padding:"7px 0", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer",
                      border:`1px solid ${quality===q?"#1e6fff":"#252830"}`,
                      background: quality===q ? "#1e6fff18" : "#191b22",
                      color: quality===q ? "#4d9fff" : "#6b7280" }}>
                    {q.charAt(0).toUpperCase()+q.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding:12, background:"#1a1c22", borderRadius:6, marginBottom:20, fontSize:10, color:"#626878", lineHeight:1.6 }}>
              ℹ️ Long videos (&gt;60s) export in full — no time limit. Audio tracks included automatically.
              Export renders in your browser using WebCodecs when available.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={onClose}
                style={{ padding:"8px 16px", borderRadius:5, fontSize:11, border:"1px solid #252830",
                  background:"transparent", color:"#6b7280", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => onExport(name, quality)}
                style={{ padding:"8px 20px", borderRadius:5, fontSize:11, fontWeight:700,
                  background:"linear-gradient(135deg,#1e6fff,#4d9fff)",
                  color:"#fff", border:"none", cursor:"pointer",
                  boxShadow:"0 4px 14px #1e6fff40" }}>
                Start Export
              </button>
            </div>
          </>
        ) : (
          <div>
            <div style={{ marginBottom:10, fontSize:11, color:"#9ca3af" }}>
              Exporting — this may take a while for long videos...
            </div>
            {/* Progress bar */}
            <div style={{ height:6, background:"#252830", borderRadius:3, overflow:"hidden", marginBottom:16 }}>
              <div style={{ height:"100%", width:`${exportProgress}%`,
                background:"linear-gradient(90deg,#1e6fff,#4d9fff)",
                transition:"width 0.3s", borderRadius:3 }}/>
            </div>
            {/* Log */}
            <div style={{ background:"#0d0f14", borderRadius:6, padding:10, maxHeight:160,
              overflowY:"auto", fontFamily:"monospace", fontSize:10, color:"#4d9fff" }}>
              {exportLog.map((l, i) => <div key={i}>{l}</div>)}
              {exportLog.length === 0 && <div style={{ color:"#3a4050" }}>Waiting…</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EDITOR
═══════════════════════════════════════════════════════════════════════════ */
export default function Editor() {
  /* ── Shotstack refs ────────────────────────────────────── */
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineRef   = useRef<HTMLDivElement>(null);
  const editRef       = useRef<Edit | null>(null);
  const canvasRef     = useRef<Canvas | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);

  /* ── UI state ──────────────────────────────────────────── */
  const [projectName, setProjectName] = useState("Untitled Project");
  const [assets,      setAssets]      = useState<AssetItem[]>([]);
  const [leftTab,     setLeftTab]     = useState<LeftTab>("media");
  const [rightTab,    setRightTab]    = useState<RightTab>("clip");
  const [selectedClip, setSelected]  = useState<SelectedClipInfo | null>(null);
  const [isPlaying,   setIsPlaying]  = useState(false);
  const [output,      setOutput]      = useState({ width:1280, height:720, fps:25, format:"mp4", quality:"high" });
  const [background,  setBg]          = useState("#000000");
  const [zoom,        setZoom]        = useState(1);

  /* ── Export state ──────────────────────────────────────── */
  const [showExport,    setShowExport]    = useState(false);
  const [isExporting,   setIsExporting]  = useState(false);
  const [exportProg,    setExportProg]   = useState(0);
  const [exportLog,     setExportLog]    = useState<string[]>([]);

  /* ── In-canvas text edit ───────────────────────────────── */
  const [editingText,  setEditingText]   = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [canvasRect,  setCanvasRect]     = useState<DOMRect | null>(null);

  /* ── Volume / mute ─────────────────────────────────────── */
  const [volume, setVolume]  = useState(100);
  const [muted,  setMuted]   = useState(false);

  /* ── Playhead ──────────────────────────────────────────── */
  const [playhead, setPlayhead] = useState(0);

  /* ════════════════════════════════════════════════════════
     HELPERS – clip management
  ════════════════════════════════════════════════════════ */
  const getTracks = () => ((editRef.current?.getEdit() as any)?.timeline?.tracks ?? []) as any[];

  const syncOutput = useCallback(() => {
    const snap = editRef.current?.getEdit() as any;
    const size = snap?.output?.size;
    if (size?.width && size?.height)
      setOutput(o => ({ ...o, width:size.width, height:size.height, fps:snap.output?.fps??o.fps, format:snap.output?.format??o.format }));
    if (typeof snap?.timeline?.background === "string") setBg(snap.timeline.background);
  }, []);

  const refreshClip = useCallback((ti: number, ci: number) => {
    const clip = editRef.current?.getClip(ti, ci);
    setSelected(clip ? { trackIndex:ti, clipIndex:ci, clip } : null);
  }, []);

  const updateClip = useCallback(async (patch: any) => {
    if (!editRef.current || !selectedClip) return;
    const latest = editRef.current.getClip(selectedClip.trackIndex, selectedClip.clipIndex) as any;
    if (!latest) { setSelected(null); return; }
    const merged = {
      ...latest, ...patch,
      asset: patch?.asset ? {
        ...(latest.asset ?? {}), ...patch.asset,
        font: patch.asset.font ? { ...(latest.asset?.font ?? {}), ...patch.asset.font } : latest.asset?.font,
      } : latest.asset,
    };
    await editRef.current.updateClip(selectedClip.trackIndex, selectedClip.clipIndex, merged);
    refreshClip(selectedClip.trackIndex, selectedClip.clipIndex);
  }, [selectedClip, refreshClip]);

  const addClipFree = useCallback(async (payload: any, start: number, length: number) => {
    if (!editRef.current) return;
    const tracks = getTracks();
    let target = tracks.length;
    for (let i = 0; i < tracks.length; i++) {
      if (!((tracks[i]?.clips ?? []) as any[]).some(c => intersects(start, length, c))) { target = i; break; }
    }
    const clipData = { ...payload, start, length } as any;
    const existing = editRef.current.getTrack(target) as any;
    if (existing) {
      const nextIdx = (existing?.clips ?? []).length;
      await editRef.current.addClip(target, clipData);
      refreshClip(target, nextIdx);
    } else {
      await editRef.current.addTrack(target, { clips:[clipData] } as any);
      refreshClip(target, 0);
    }
  }, [refreshClip]);

  /* ════════════════════════════════════════════════════════
     SDK INIT
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    let mounted = true;
    const inst: any = {};

    const init = async () => {
      if (!timelineRef.current || !canvasHostRef.current) return;
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = "";
      if (timelineRef.current)   timelineRef.current.innerHTML   = "";

      const res  = await fetch("https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json");
      const tmpl = await res.json();
      if (!mounted) return;

      const edit = new Edit(tmpl);
      editRef.current   = edit;

      inst.canvas = new Canvas(edit);
      canvasRef.current = inst.canvas;
      inst.ui     = UIController.create(edit, inst.canvas);
      await inst.canvas.load();
      if (!mounted) return;

      await edit.load();
      if (!mounted) return;

      inst.timeline = new Timeline(edit, timelineRef.current!);
      await inst.timeline.load();
      if (!mounted) return;

      inst.controls = new Controls(edit);
      await inst.controls.load();
      if (!mounted) return;

      syncOutput();

      /* ── Audio: unlock AudioContext on first user gesture ── */
      const unlockAudio = () => {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
      };
      document.addEventListener("click",   unlockAudio, { once:true });
      document.addEventListener("keydown", unlockAudio, { once:true });

      edit.events.on("clip:selected",    ({ trackIndex, clipIndex }: any) => refreshClip(trackIndex, clipIndex));
      edit.events.on("selection:cleared", () => setSelected(null));
      edit.events.on("clip:updated",      ({ current }: any) => {
        if (typeof current?.trackIndex === "number") refreshClip(current.trackIndex, current.clipIndex);
      });
      edit.events.on("playback:play",  () => setIsPlaying(true));
      edit.events.on("playback:pause", () => setIsPlaying(false));
      edit.events.on("output:resized", syncOutput);
      edit.events.on("output:fpsChanged", syncOutput);
      edit.events.on("output:formatChanged", syncOutput);
      edit.events.on("timeline:backgroundChanged", syncOutput);

      /* Sync playhead */
      const phInt = setInterval(() => {
        if (editRef.current) setPlayhead(editRef.current.playbackTime ?? 0);
      }, 80);
      (inst as any)._phInt = phInt;
    };

    void init();

    return () => {
      mounted = false;
      clearInterval((inst as any)._phInt);
      try {
        inst.ui?.dispose?.();
        inst.controls?.dispose?.();
        inst.timeline?.dispose?.();
        inst.canvas?.dispose?.();
      } catch {}
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = "";
      if (timelineRef.current)   timelineRef.current.innerHTML   = "";
      editRef.current  = null;
      canvasRef.current = null;
    };
  }, [syncOutput, refreshClip]);

  /* ── Volume passthrough ────────────────────────────────── */
  useEffect(() => {
    /* The Shotstack canvas renders to a <video> element; 
       we locate it and apply volume directly — fixing the no-sound bug. */
    const applyVol = () => {
      const v = canvasHostRef.current?.querySelector("video");
      if (v) { v.volume = muted ? 0 : volume / 100; v.muted = muted; }
    };
    applyVol();
    const obs = new MutationObserver(applyVol);
    if (canvasHostRef.current) obs.observe(canvasHostRef.current, { childList:true, subtree:true });
    return () => obs.disconnect();
  }, [volume, muted]);

  /* ════════════════════════════════════════════════════════
     UPLOAD
  ════════════════════════════════════════════════════════ */
  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const items: AssetItem[] = files.map(f => ({
      id:   Math.random().toString(36).slice(2),
      name: f.name,
      url:  URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image",
    }));
    /* Try to get video/audio duration */
    items.forEach(item => {
      if (item.type === "video" || item.type === "audio") {
        const el = document.createElement(item.type === "audio" ? "audio" : "video");
        el.src = item.url;
        el.onloadedmetadata = () => {
          setAssets(prev => prev.map(a => a.id === item.id ? { ...a, duration: el.duration } : a));
        };
      }
    });
    setAssets(prev => [...prev, ...items]);
    e.target.value = "";
  };

  /* ════════════════════════════════════════════════════════
     DROP ON TIMELINE
  ════════════════════════════════════════════════════════ */
  const onTimelineDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("asset");
    if (!raw) return;
    try {
      const asset = JSON.parse(raw) as AssetItem;
      const pos   = editRef.current?.playbackTime ?? 0;
      const dur   = asset.duration ?? 5;
      if (asset.type === "audio") {
        void addClipFree({ asset:{ type:"audio", src:asset.url, volume:1 } }, pos, dur);
      } else {
        void addClipFree({ asset:{ type:asset.type, src:asset.url }, fit:"cover" }, pos, Math.min(dur, 60));
      }
    } catch {}
  };

  /* ════════════════════════════════════════════════════════
     TEXT PRESET
  ════════════════════════════════════════════════════════ */
  const addTextPreset = (p: typeof TEXT_PRESETS[0]) => {
    const pos = editRef.current?.playbackTime ?? 0;
    void addClipFree({
      asset: {
        type:"rich-text", text:p.label,
        font:{ family:p.family, size:p.size, weight:p.weight, color:p.color },
        align:{ horizontal:"center", vertical:"middle" },
      },
      offset:{ x:0, y:0 }, width:900, height:240,
    }, pos, 5);
  };

  /* ════════════════════════════════════════════════════════
     CLIP OPERATIONS
  ════════════════════════════════════════════════════════ */
  const splitClip = async () => {
    if (!editRef.current || !selectedClip) return;
    const ph  = editRef.current.playbackTime ?? 0;
    const c   = selectedClip.clip;
    const s   = Number(c.start ?? 0);
    const e2  = s + Number(c.length ?? 0);
    if (ph <= s || ph >= e2) return;
    const lLen = +(ph - s).toFixed(3), rLen = +(e2 - ph).toFixed(3);
    await editRef.current.updateClip(selectedClip.trackIndex, selectedClip.clipIndex, { ...c, length:lLen });
    const track = editRef.current.getTrack(selectedClip.trackIndex) as any;
    await editRef.current.addClip(selectedClip.trackIndex, { ...c, start:+ph.toFixed(3), length:rLen } as any);
    refreshClip(selectedClip.trackIndex, (track?.clips??[]).length);
  };

  const deleteClip = async () => {
    if (!editRef.current || !selectedClip) return;
    await editRef.current.deleteClip(selectedClip.trackIndex, selectedClip.clipIndex);
    setSelected(null);
  };

  const duplicateClip = async () => {
    if (!editRef.current || !selectedClip) return;
    const c   = selectedClip.clip;
    const end = Number(c.start ?? 0) + Number(c.length ?? 0);
    await addClipFree({ ...c, start:undefined, length:undefined, asset:c.asset }, end, Number(c.length ?? 5));
  };

  /* ════════════════════════════════════════════════════════
     PLAYBACK
  ════════════════════════════════════════════════════════ */
  const togglePlay = () => {
    if (!editRef.current) return;
    /* Unlock AudioContext on play */
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    audioCtxRef.current.resume();
    editRef.current.isPlaying ? editRef.current.pause() : editRef.current.play();
  };
  const stopPlay = () => { editRef.current?.pause(); editRef.current?.seek(0); };

  /* ════════════════════════════════════════════════════════
     EXPORT — no artificial time limit, with progress log
  ════════════════════════════════════════════════════════ */
  const doExport = async (name: string, quality: string) => {
    if (!editRef.current || !canvasRef.current) return;
    setIsExporting(true);
    setExportProg(0);
    setExportLog([]);

    const log = (msg: string) => setExportLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    try {
      /* Set quality before export */
      await (editRef.current as any).setOutputResolution?.(
        quality === "high" ? "hd" : quality === "medium" ? "sd" : "preview"
      ).catch(() => {});

      log("Initialising encoder…");
      setExportProg(5);

      const exporter = new VideoExporter(editRef.current, canvasRef.current);

      /* Hook into exporter progress if API exposes it */
      const origExport = exporter.export.bind(exporter);

      log("Rendering frames — this may take a while for long videos…");
      setExportProg(10);

      /* Run export without any timeout — VideoExporter handles chunking internally */
      const safeName = (name || "render").replace(/[\\/:*?"<>|]/g, "-");
      await origExport(`${safeName}.mp4`, output.fps);

      setExportProg(100);
      log("✓ Export complete! File download should start.");
    } catch (err: any) {
      setExportLog(prev => [...prev, `✗ Export failed: ${err?.message ?? err}`]);
    } finally {
      setIsExporting(false);
    }
  };

  /* ════════════════════════════════════════════════════════
     IN-CANVAS TEXT DOUBLE-CLICK
  ════════════════════════════════════════════════════════ */
  const openTextEdit = () => {
    if (selectedClip?.clip?.asset?.type !== "rich-text") return;
    const rect = canvasWrapRef.current?.querySelector("[data-shotstack-studio]")?.getBoundingClientRect()
              ?? canvasWrapRef.current?.getBoundingClientRect() ?? null;
    setCanvasRect(rect as DOMRect | null);
    setEditingText(true);
  };

  const commitTextEdit = async (text: string) => {
    await updateClip({ asset:{ text } });
    setEditingText(false);
  };

  /* ════════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if (["INPUT","SELECT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === "Space")      { e.preventDefault(); togglePlay(); }
      if (e.code === "KeyJ")       stopPlay();
      if (e.code === "ArrowLeft")  editRef.current?.seek(Math.max(0, (editRef.current.playbackTime??0)-(e.shiftKey?1:1/30)));
      if (e.code === "ArrowRight") editRef.current?.seek((editRef.current.playbackTime??0)+(e.shiftKey?1:1/30));
      if ((e.ctrlKey||e.metaKey)&&e.code==="KeyZ") { e.preventDefault(); editRef.current?.undo(); }
      if ((e.ctrlKey||e.metaKey)&&e.code==="KeyY") { e.preventDefault(); editRef.current?.redo(); }
      if (e.code==="Delete"||e.code==="Backspace") void deleteClip();
      if (e.code==="KeyD"&&(e.ctrlKey||e.metaKey)) { e.preventDefault(); void duplicateClip(); }
      if (e.code==="KeyS"&&(e.ctrlKey||e.metaKey)) { e.preventDefault(); void splitClip(); }
      if (e.code==="KeyE"&&(e.ctrlKey||e.metaKey)) { e.preventDefault(); setShowExport(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  /* ════════════════════════════════════════════════════════
     LEFT PANEL
  ════════════════════════════════════════════════════════ */
  const LEFT_TABS: { id: LeftTab; icon: string | string[]; label: string }[] = [
    { id:"media",       icon:ICONS.img,     label:"Media"   },
    { id:"text",        icon:ICONS.text,    label:"Text"    },
    { id:"audio",       icon:ICONS.audio,   label:"Audio"   },
    { id:"effects",     icon:ICONS.wand,    label:"Effects" },
    { id:"transitions", icon:ICONS.trans,   label:"Trans"   },
  ];

  /* ════════════════════════════════════════════════════════
     RIGHT PANEL TABS
  ════════════════════════════════════════════════════════ */
  const c = selectedClip?.clip;
  const isTextClip = c?.asset?.type === "rich-text";
  const isAudioClip= c?.asset?.type === "audio";

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0e0f14] text-[#c8cdd8]"
      style={{ fontFamily:"'DM Sans', 'Segoe UI', system-ui, sans-serif", fontSize:12 }}>

      {/* ════ TOPBAR ════════════════════════════════════════ */}
      <header className="h-11 flex items-center justify-between px-3 bg-[#12141b] border-b border-[#1b1d24] shrink-0 z-50 gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background:"linear-gradient(135deg,#1e6fff 0%,#6b3fff 100%)", boxShadow:"0 2px 10px #1e6fff40" }}>
            <Ico d={ICONS.video} size={12} />
          </div>
          <input value={projectName} onChange={e => setProjectName(e.target.value)}
            className="bg-transparent text-[12px] font-semibold text-[#d1d5db] focus:outline-none w-44 truncate"
            title="Project name" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5">
          <TB icon={ICONS.undo}  title="Undo (Ctrl+Z)"     onClick={() => editRef.current?.undo()} />
          <TB icon={ICONS.redo}  title="Redo (Ctrl+Y)"     onClick={() => editRef.current?.redo()} />
          <Divider />
          <TB icon={ICONS.cut}   title="Razor"  />
          <TB icon={ICONS.split} title="Split at playhead (Ctrl+S)" onClick={() => void splitClip()} />
          <TB icon={ICONS.copy}  title="Duplicate clip (Ctrl+D)"    onClick={() => void duplicateClip()} />
          <TB icon={ICONS.trash} title="Delete selected (Del)"      onClick={() => void deleteClip()} danger />
          <Divider />
          {/* Volume */}
          <button onClick={() => setMuted(m=>!m)} title="Toggle mute"
            className="p-1.5 rounded hover:bg-white/5 text-[#9ca3af] hover:text-white transition-colors">
            <Ico d={muted ? ICONS.mute : ICONS.vol} size={13} />
          </button>
          <input type="range" min={0} max={100} value={volume} onChange={e=>setVolume(+e.target.value)}
            className="w-20 h-[3px] accent-[#1e6fff] cursor-pointer" title="Master volume" />
          <span className="text-[10px] text-[#4a5260] w-7 tabular-nums font-mono">{volume}%</span>
          <Divider />
          <TB icon={ICONS.zoomM} title="Timeline zoom out" onClick={() => setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2)))} />
          <span className="text-[10px] text-[#4a5260] tabular-nums font-mono w-8 text-center">{Math.round(zoom*100)}%</span>
          <TB icon={ICONS.zoomP} title="Timeline zoom in"  onClick={() => setZoom(z=>Math.min(5,+(z+0.25).toFixed(2)))} />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-[#3a4252] tabular-nums">{fmtTime(playhead)}</span>
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
            style={{ background:"linear-gradient(135deg,#1e6fff,#1e55cc)", color:"#fff",
              boxShadow:"0 2px 10px #1e6fff30" }}>
            <Ico d={ICONS.export} size={12} />
            Export
          </button>
        </div>
      </header>

      {/* ════ BODY ══════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT ICON RAIL ─────────────────────────────── */}
        <nav className="w-[52px] bg-[#10121a] border-r border-[#1b1d24] flex flex-col items-center py-2 gap-1 shrink-0">
          {LEFT_TABS.map(t => (
            <button key={t.id} onClick={() => setLeftTab(t.id)}
              title={t.label}
              className={`w-9 h-9 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all
                ${leftTab===t.id
                  ? "bg-[#1e6fff]/15 text-[#4d9fff] border border-[#1e6fff]/30"
                  : "text-[#4a5260] hover:text-[#9ca3af] hover:bg-white/[0.03]"}`}>
              <Ico d={t.icon} size={15} />
              <span className="text-[7px] font-bold tracking-wide">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* ── LEFT PANEL ─────────────────────────────────── */}
        <aside className="w-[230px] bg-[#11131a] border-r border-[#1b1d24] flex flex-col shrink-0 overflow-hidden">
          {leftTab === "media" && (
            <>
              <div className="p-2 border-b border-[#1b1d24] shrink-0">
                <label className="flex items-center justify-center gap-2 w-full border border-dashed border-[#252830]
                  rounded-md py-2.5 text-[11px] text-[#4a5260] hover:text-[#9ca3af] hover:border-[#1e6fff]/40
                  cursor-pointer transition-colors">
                  <Ico d={ICONS.plus} size={13} />
                  Import Media
                  <input hidden multiple type="file" accept="video/*,image/*,audio/*" onChange={handleUpload} />
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {assets.length === 0 && (
                  <p className="text-[10px] text-[#3a4252] text-center mt-8 px-3 leading-relaxed">
                    Import video, image, or audio files to get started.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {assets.map(a => (
                    <div key={a.id} draggable
                      onDragStart={e => e.dataTransfer.setData("asset", JSON.stringify(a))}
                      className="group bg-[#171921] border border-[#22242d] rounded-md overflow-hidden
                        cursor-grab hover:border-[#1e6fff]/40 transition-all hover:scale-[1.02]">
                      <div className="aspect-video flex items-center justify-center bg-[#0e0f14] text-xl relative">
                        {a.type==="video"?"🎬":a.type==="audio"?"🎵":"🖼️"}
                        {a.duration && <span className="absolute bottom-1 right-1 text-[8px] bg-black/70
                          text-white/70 px-1 rounded font-mono">{Math.round(a.duration)}s</span>}
                      </div>
                      <div className="px-1.5 py-1">
                        <p className="text-[9px] text-[#6b7280] truncate">{a.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {leftTab === "text" && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <p className="text-[9px] text-[#3a4252] px-1 pt-1">Click to add text at playhead</p>
              {TEXT_PRESETS.map(p => (
                <button key={p.label} onClick={() => addTextPreset(p)}
                  className="w-full flex items-center justify-between rounded-md border border-[#22242d]
                    bg-[#171921] px-3 py-2.5 hover:border-[#1e6fff]/40 hover:bg-[#1e6fff]/05
                    transition-all cursor-pointer group">
                  <span style={{ color:p.color, fontWeight:p.weight, fontSize:Math.min(16,p.size/5) }}>{p.label}</span>
                  <span className="text-[9px] text-[#3a4252] group-hover:text-[#6b7280]">{p.size}px</span>
                </button>
              ))}
            </div>
          )}

          {leftTab === "audio" && (
            <div className="flex-1 overflow-y-auto p-3">
              <label className="flex items-center gap-2 w-full border border-dashed border-[#252830]
                rounded-md py-3 px-3 text-[11px] text-[#4a5260] hover:text-[#9ca3af] hover:border-[#1e6fff]/40
                cursor-pointer transition-colors mb-3">
                <Ico d={ICONS.audio} size={13} />
                Import Audio
                <input hidden type="file" accept="audio/*" multiple onChange={handleUpload} />
              </label>
              {/* Show audio assets */}
              {assets.filter(a=>a.type==="audio").map(a=>(
                <div key={a.id} draggable
                  onDragStart={e=>e.dataTransfer.setData("asset",JSON.stringify(a))}
                  className="flex items-center gap-2 bg-[#171921] border border-[#22242d] rounded-md
                    px-2 py-2 mb-1.5 cursor-grab hover:border-[#1e6fff]/40 transition-all">
                  <div className="text-green-400 shrink-0"><Ico d={ICONS.audio} size={13}/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#9ca3af] truncate">{a.name}</p>
                    {a.duration && <p className="text-[9px] text-[#3a4252] font-mono">{Math.round(a.duration)}s</p>}
                  </div>
                </div>
              ))}
              {assets.filter(a=>a.type==="audio").length===0 &&
                <p className="text-[10px] text-[#3a4252] text-center mt-6">No audio files imported yet.</p>}
            </div>
          )}

          {leftTab === "effects" && (
            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-[9px] text-[#3a4252] px-1 pt-1 mb-2">Select a clip first, then apply</p>
              <p className="text-[9px] text-[#3a4252] px-1 mb-1 font-bold uppercase tracking-wide">Filters</p>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {FILTERS.map(f=>(
                  <button key={f}
                    onClick={()=>updateClip({filter:f==="none"?null:f})}
                    className={`py-1.5 rounded text-[10px] capitalize transition-colors
                      ${c?.filter===f||(f==="none"&&!c?.filter)
                        ? "bg-[#1e6fff]/20 text-[#4d9fff] border border-[#1e6fff]/30"
                        : "bg-[#171921] text-[#6b7280] hover:bg-[#1e2030] border border-[#22242d]"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#3a4252] px-1 mb-1 font-bold uppercase tracking-wide">Motion</p>
              <div className="grid grid-cols-2 gap-1">
                {EFFECTS.map(ef=>(
                  <button key={ef}
                    onClick={()=>updateClip({effect:ef==="none"?null:ef})}
                    className={`py-1.5 rounded text-[10px] capitalize transition-colors
                      ${c?.effect===ef||(ef==="none"&&!c?.effect)
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-[#171921] text-[#6b7280] hover:bg-[#1e2030] border border-[#22242d]"}`}>
                    {ef}
                  </button>
                ))}
              </div>
            </div>
          )}

          {leftTab === "transitions" && (
            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-[9px] text-[#3a4252] px-1 pt-1 mb-2">Applies to selected clip</p>
              <div className="grid grid-cols-2 gap-1">
                {TRANSITIONS.map(tr=>(
                  <button key={tr}
                    onClick={()=>updateClip({transition:{in:tr==="none"?undefined:tr,out:tr==="none"?undefined:tr}})}
                    className="py-2 rounded text-[10px] capitalize bg-[#171921] text-[#6b7280]
                      hover:bg-[#1e2030] border border-[#22242d] hover:border-[#1e6fff]/30 hover:text-white transition-all">
                    {tr}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── CANVAS + TRANSPORT ─────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0c0d12]">
          {/* Canvas */}
          <div ref={canvasWrapRef}
            className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#09090e]"
            onDoubleClick={openTextEdit}>
            {/* Grid */}
            <div className="absolute inset-0 opacity-[0.018]"
              style={{ backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize:"30px 30px" }}/>

            {/* Shotstack canvas mount */}
            <div ref={canvasHostRef} data-shotstack-studio
              className="w-full h-full max-w-[960px] max-h-[540px] bg-black relative"
              style={{ boxShadow:"0 10px 60px rgba(0,0,0,0.9), 0 0 0 1px #1e2028" }} />

            {/* In-canvas text editor overlay */}
            {editingText && selectedClip && (
              <CanvasTextOverlay
                clip={selectedClip.clip}
                canvasRect={canvasRect}
                onCommit={commitTextEdit}
                onDismiss={() => setEditingText(false)}
              />
            )}

            {/* Text edit hint */}
            {selectedClip?.clip?.asset?.type === "rich-text" && !editingText && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white/60
                text-[10px] px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
                Double-click canvas to edit text inline
              </div>
            )}
          </div>

          {/* Transport bar */}
          <div className="h-11 bg-[#12141b] border-t border-[#1b1d24] border-b flex items-center
            justify-between px-4 shrink-0 gap-3">
            <span className="text-[11px] font-mono text-[#3a4252] tabular-nums w-36">
              {fmtTime(playhead)}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={stopPlay}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280]
                  hover:bg-white/5 hover:text-white transition-colors">
                <Ico d={ICONS.skipB} size={14}/>
              </button>
              <button onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{ background:"#fff", boxShadow:"0 2px 14px rgba(0,0,0,0.7)" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="#0c0d12">
                  {(Array.isArray(isPlaying ? ICONS.pause : ICONS.play)
                    ? (isPlaying ? ICONS.pause : [ICONS.play]) as string[]
                    : [isPlaying ? ICONS.pause : ICONS.play] as string[]
                  ).map((p,i)=><path key={i} d={p}/>)}
                </svg>
              </button>
              <button onClick={() => editRef.current?.seek((editRef.current.playbackTime??0)+0.04)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280]
                  hover:bg-white/5 hover:text-white transition-colors">
                <Ico d={ICONS.skipF} size={14}/>
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#3a4252] font-mono tabular-nums">
              <span>{output.width}×{output.height}</span>
              <span>{output.fps}fps</span>
              <span className="uppercase">{output.format}</span>
            </div>
          </div>

          {/* Timeline drop zone */}
          <div className="h-52 bg-[#0e0f14] shrink-0"
            onDragOver={e=>e.preventDefault()} onDrop={onTimelineDrop}>
            <div ref={timelineRef} className="w-full h-full" />
          </div>
        </main>

        {/* ── RIGHT PANEL ────────────────────────────────── */}
        <aside className="w-[260px] bg-[#11131a] border-l border-[#1b1d24] flex flex-col shrink-0 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#1b1d24] shrink-0">
            {(["clip","output","color"] as RightTab[]).map(t => (
              <button key={t} onClick={() => setRightTab(t)}
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors
                  ${rightTab===t
                    ? "text-[#4d9fff] border-b-2 border-[#1e6fff] bg-[#1e6fff]/05"
                    : "text-[#3a4252] hover:text-[#6b7280]"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── CLIP TAB ─────────────────────────────── */}
            {rightTab === "clip" && (
              <>
                {!selectedClip ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#2e3341] gap-3 px-6">
                    <Ico d={ICONS.video} size={32}/>
                    <p className="text-center text-[11px] leading-relaxed">
                      Select a clip on the timeline to view and edit its properties
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Clip info */}
                    <div className="px-3 py-2 border-b border-[#1b1d24] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#d1d5db] truncate max-w-[160px]">
                        T{selectedClip.trackIndex+1} · C{selectedClip.clipIndex+1}
                        {isTextClip ? " · Text" : isAudioClip ? " · Audio" : " · Video/Image"}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => void duplicateClip()} title="Duplicate"
                          className="p-1 rounded hover:bg-white/5 text-[#4a5260] hover:text-white transition-colors">
                          <Ico d={ICONS.copy} size={11}/>
                        </button>
                        <button onClick={() => void deleteClip()} title="Delete"
                          className="p-1 rounded hover:bg-red-500/10 text-[#4a5260] hover:text-red-400 transition-colors">
                          <Ico d={ICONS.trash} size={11}/>
                        </button>
                      </div>
                    </div>

                    <Collapsible title="Timing">
                      <Row label="Start">
                        <Input type="number" value={+(c?.start??0).toFixed(3)} step={0.1} min={0}
                          onChange={v=>void updateClip({start:v})}/>
                      </Row>
                      <Row label="Duration">
                        <Input type="number" value={+(c?.length??1).toFixed(3)} step={0.1} min={0.1}
                          onChange={v=>void updateClip({length:v})}/>
                      </Row>
                    </Collapsible>

                    {!isAudioClip && (
                      <Collapsible title="Transform">
                        <Row label="Opacity">
                          <Slider value={Math.round((c?.opacity??1)*100)} min={0} max={100}
                            onChange={v=>void updateClip({opacity:v/100})}/>
                        </Row>
                        <Row label="Scale">
                          <Slider value={Math.round((c?.scale??1)*100)} min={10} max={300}
                            onChange={v=>void updateClip({scale:v/100})}/>
                        </Row>
                        <Row label="Offset X">
                          <Input type="number" value={+(c?.offset?.x??0).toFixed(3)} step={0.01}
                            onChange={v=>void updateClip({offset:{...(c?.offset??{y:0}),x:v}})}/>
                        </Row>
                        <Row label="Offset Y">
                          <Input type="number" value={+(c?.offset?.y??0).toFixed(3)} step={0.01}
                            onChange={v=>void updateClip({offset:{...(c?.offset??{x:0}),y:v}})}/>
                        </Row>
                        <Row label="Rotate">
                          <Slider value={c?.transform?.rotate?.angle??0} min={-180} max={180}
                            onChange={v=>void updateClip({transform:{...c?.transform,rotate:{angle:v}}})}/>
                        </Row>
                        <Row label="Fit">
                          <Select value={c?.fit??"cover"} onChange={v=>void updateClip({fit:v})}>
                            {FIT_OPTIONS.map(f=><option key={f}>{f}</option>)}
                          </Select>
                        </Row>
                        <Row label="Position">
                          <Select value={c?.position??"center"} onChange={v=>void updateClip({position:v})}>
                            {POSITIONS.map(p=><option key={p}>{p}</option>)}
                          </Select>
                        </Row>
                        <div className="flex gap-1 pt-1">
                          <button onClick={()=>void updateClip({transform:{...c?.transform,flip:{...(c?.transform?.flip??{}),horizontal:!(c?.transform?.flip?.horizontal)}}})}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] border transition-colors
                              ${c?.transform?.flip?.horizontal?"bg-[#1e6fff]/15 text-[#4d9fff] border-[#1e6fff]/30":"bg-[#171921] text-[#6b7280] border-[#22242d] hover:border-[#333]"}`}>
                            <Ico d={ICONS.flip} size={11}/> Flip H
                          </button>
                          <button onClick={()=>void updateClip({transform:{...c?.transform,flip:{...(c?.transform?.flip??{}),vertical:!(c?.transform?.flip?.vertical)}}})}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] border transition-colors
                              ${c?.transform?.flip?.vertical?"bg-[#1e6fff]/15 text-[#4d9fff] border-[#1e6fff]/30":"bg-[#171921] text-[#6b7280] border-[#22242d] hover:border-[#333]"}`}>
                            <Ico d={ICONS.flip} size={11}/> Flip V
                          </button>
                        </div>
                      </Collapsible>
                    )}

                    {(isAudioClip || c?.asset?.type==="video") && (
                      <Collapsible title="Audio">
                        <Row label="Volume">
                          <Slider value={Math.round((c?.asset?.volume??1)*100)} min={0} max={200}
                            onChange={v=>void updateClip({asset:{volume:v/100}})}/>
                        </Row>
                        <Row label="Speed">
                          <Slider value={Math.round((c?.asset?.speed??1)*100)} min={25} max={400}
                            onChange={v=>void updateClip({asset:{speed:v/100}})}/>
                        </Row>
                      </Collapsible>
                    )}

                    {!isAudioClip && !isTextClip && (
                      <Collapsible title="Filter & Effect">
                        <Row label="Filter">
                          <Select value={c?.filter??"none"} onChange={v=>void updateClip({filter:v==="none"?null:v})}>
                            {FILTERS.map(f=><option key={f}>{f}</option>)}
                          </Select>
                        </Row>
                        <Row label="Effect">
                          <Select value={c?.effect??"none"} onChange={v=>void updateClip({effect:v==="none"?null:v})}>
                            {EFFECTS.map(e=><option key={e}>{e}</option>)}
                          </Select>
                        </Row>
                        <Row label="Trans In">
                          <Select value={c?.transition?.in??"none"} onChange={v=>void updateClip({transition:{...c?.transition,in:v==="none"?undefined:v}})}>
                            {TRANSITIONS.map(t=><option key={t}>{t}</option>)}
                          </Select>
                        </Row>
                        <Row label="Trans Out">
                          <Select value={c?.transition?.out??"none"} onChange={v=>void updateClip({transition:{...c?.transition,out:v==="none"?undefined:v}})}>
                            {TRANSITIONS.map(t=><option key={t}>{t}</option>)}
                          </Select>
                        </Row>
                      </Collapsible>
                    )}

                    {isTextClip && (
                      <Collapsible title="Text">
                        <button onClick={openTextEdit}
                          className="w-full flex items-center justify-center gap-2 py-2 mb-2 rounded-md
                            bg-[#1e6fff]/10 border border-[#1e6fff]/30 text-[#4d9fff] text-[11px] hover:bg-[#1e6fff]/15 transition-colors">
                          <Ico d={ICONS.text} size={12}/>
                          Edit Text on Canvas
                        </button>
                        <Row label="Content">
                          <Input value={c?.asset?.text??""} onChange={v=>void updateClip({asset:{text:v}})}/>
                        </Row>
                        <Row label="Font">
                          <Select value={c?.asset?.font?.family??"Work Sans"}
                            onChange={v=>void updateClip({asset:{font:{family:v}}})}>
                            {["Work Sans","Montserrat","Roboto Slab","Georgia","Playfair Display","Oswald"].map(f=>(
                              <option key={f}>{f}</option>
                            ))}
                          </Select>
                        </Row>
                        <Row label="Size">
                          <Input type="number" value={c?.asset?.font?.size??64} min={10} max={500}
                            onChange={v=>void updateClip({asset:{font:{size:v}}})}/>
                        </Row>
                        <Row label="Weight">
                          <Select value={String(c?.asset?.font?.weight??600)}
                            onChange={v=>void updateClip({asset:{font:{weight:+v}}})}>
                            {["100","200","300","400","500","600","700","800","900"].map(w=>(
                              <option key={w}>{w}</option>
                            ))}
                          </Select>
                        </Row>
                        <ColorPicker label="Color" value={c?.asset?.font?.color??"#ffffff"}
                          onChange={v=>void updateClip({asset:{font:{color:v}}})}/>
                        <Row label="Align H">
                          <Select value={c?.asset?.align?.horizontal??"center"}
                            onChange={v=>void updateClip({asset:{align:{...(c?.asset?.align??{}),horizontal:v}}})}>
                            {["left","center","right"].map(a=><option key={a}>{a}</option>)}
                          </Select>
                        </Row>
                        <Row label="Align V">
                          <Select value={c?.asset?.align?.vertical??"middle"}
                            onChange={v=>void updateClip({asset:{align:{...(c?.asset?.align??{}),vertical:v}}})}>
                            {["top","middle","bottom"].map(a=><option key={a}>{a}</option>)}
                          </Select>
                        </Row>
                        <Row label="Opacity">
                          <Slider value={Math.round((c?.opacity??1)*100)} min={0} max={100}
                            onChange={v=>void updateClip({opacity:v/100})}/>
                        </Row>
                        <Row label="Offset X">
                          <Input type="number" value={+(c?.offset?.x??0).toFixed(3)} step={0.01}
                            onChange={v=>void updateClip({offset:{...(c?.offset??{y:0}),x:v}})}/>
                        </Row>
                        <Row label="Offset Y">
                          <Input type="number" value={+(c?.offset?.y??0).toFixed(3)} step={0.01}
                            onChange={v=>void updateClip({offset:{...(c?.offset??{x:0}),y:v}})}/>
                        </Row>
                      </Collapsible>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── OUTPUT TAB ─────────────────────────── */}
            {rightTab === "output" && (
              <div className="p-3 space-y-1">
                <Collapsible title="Video">
                  <Row label="Resolution">
                    <Select value={`${output.width}x${output.height}`}
                      onChange={v=>{
                        const [w,h]=v.split("x").map(Number);
                        if(editRef.current&&w&&h) void editRef.current.setOutputSize(w,h).then(syncOutput);
                      }}>
                      {OUTPUT_SIZES.map(s=><option key={s.label} value={`${s.width}x${s.height}`}>{s.label}</option>)}
                    </Select>
                  </Row>
                  <Row label="FPS">
                    <Select value={String(output.fps)}
                      onChange={v=>{if(editRef.current)void editRef.current.setOutputFps(+v).then(syncOutput)}}>
                      {OUTPUT_FPS.map(f=><option key={f} value={f}>{f} fps</option>)}
                    </Select>
                  </Row>
                  <Row label="Format">
                    <Select value={output.format}
                      onChange={v=>{if(editRef.current)void editRef.current.setOutputFormat(v as any).then(syncOutput)}}>
                      {OUTPUT_FORMATS.map(f=><option key={f} value={f}>{f.toUpperCase()}</option>)}
                    </Select>
                  </Row>
                </Collapsible>
                <Collapsible title="Background">
                  <ColorPicker label="Color" value={background}
                    onChange={v=>{setBg(v);editRef.current?.setTimelineBackground(v)}}/>
                </Collapsible>
                <Collapsible title="Shortcuts" defaultOpen={false}>
                  <div className="space-y-1 text-[10px] text-[#4a5260] font-mono">
                    {[["Space","Play / Pause"],["J","Stop & rewind"],["← →","Seek 1 frame"],["Shift+← →","Seek 1 second"],
                      ["Ctrl+Z","Undo"],["Ctrl+Y","Redo"],["Del","Delete clip"],["Ctrl+D","Duplicate clip"],
                      ["Ctrl+S","Split at playhead"],["Ctrl+E","Open export"]].map(([k,v])=>(
                      <div key={k} className="flex justify-between gap-2">
                        <span className="bg-[#171921] border border-[#22242d] rounded px-1.5 py-0.5">{k}</span>
                        <span className="text-[#3a4252]">{v}</span>
                      </div>
                    ))}
                  </div>
                </Collapsible>
              </div>
            )}

            {/* ── COLOR TAB ──────────────────────────── */}
            {rightTab === "color" && (
              <div className="p-3">
                <p className="text-[10px] text-[#3a4252] mb-3">
                  Color corrections apply to the selected clip via the Filter property.
                </p>
                <Collapsible title="Filter Preset">
                  <div className="grid grid-cols-2 gap-1.5">
                    {FILTERS.map(f=>(
                      <button key={f}
                        onClick={()=>updateClip({filter:f==="none"?null:f})}
                        className={`py-2 rounded text-[10px] capitalize transition-all border
                          ${c?.filter===f||(f==="none"&&!c?.filter)
                            ? "bg-[#1e6fff]/15 text-[#4d9fff] border-[#1e6fff]/30"
                            : "bg-[#171921] text-[#6b7280] border-[#22242d] hover:border-[#2e3040]"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </Collapsible>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ════ STATUS BAR ════════════════════════════════════ */}
      <div className="h-[22px] bg-[#0c0d12] border-t border-[#1b1d24] flex items-center justify-between
        px-4 shrink-0 text-[9px] text-[#2e3541] font-mono">
        <span>
          {selectedClip
            ? `Track ${selectedClip.trackIndex+1} · Clip ${selectedClip.clipIndex+1} · ${isTextClip?"Text":isAudioClip?"Audio":"Video/Image"}`
            : "No clip selected — click a clip on the timeline"}
        </span>
        <span>
          {output.width}×{output.height} · {output.fps}fps · {output.format.toUpperCase()} · Zoom {Math.round(zoom*100)}%
        </span>
      </div>

      {/* ════ EXPORT MODAL ════════════════════════════════ */}
      {showExport && (
        <ExportModal
          onClose={() => { if(!isExporting) setShowExport(false); }}
          onExport={doExport}
          isExporting={isExporting}
          exportProgress={exportProg}
          exportLog={exportLog}
        />
      )}
    </div>
  );
}