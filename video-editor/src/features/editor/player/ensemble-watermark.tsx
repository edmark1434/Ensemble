// Visual markup is mirrored in the render-server patch. Editor interactions
// live in the scene overlay so controls never appear in exported frames.
export function EnsembleWatermark({ width, height }: { width: number; height: number }) {
  const unit = Math.min(width, height) / 1080;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2147483647 }}>
      <div data-ensemble-watermark="" style={{
        position: "absolute", left: "50%", top: 36 * unit, transform: "translateX(-50%)",
        display: "flex", alignItems: "baseline", gap: 10 * unit,
        padding: `${8 * unit}px ${12 * unit}px`,
        color: "#ffffff", textShadow: `0 ${2 * unit}px ${6 * unit}px rgba(0, 0, 0, 0.65)`,
        fontFamily: 'var(--font-plus-jakarta-sans, "Plus Jakarta Sans"), sans-serif',
        fontSize: 36 * unit, fontWeight: 600, letterSpacing: -0.8 * unit,
        lineHeight: 1.25, whiteSpace: "nowrap", userSelect: "none",
      }}>
        <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 24 * unit, letterSpacing: 1.2 * unit }}>MADE IN</span>
        <span style={{ fontWeight: 700 }}>Ensemble</span>
      </div>
    </div>
  );
}
