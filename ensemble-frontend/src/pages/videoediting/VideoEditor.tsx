import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Edit, Canvas, Timeline, Controls, UIController, VideoExporter } from "@shotstack/shotstack-studio";

type AssetItem = {
  id: string;
  name: string;
  url: string;
  type: "video" | "image";
};

type SelectedClipInfo = {
  trackIndex: number;
  clipIndex: number;
  clip: any;
};

const TEXT_PRESETS = [
  { label: "Title", size: 80, color: "#ffffff" },
  { label: "Subtitle", size: 48, color: "#d7d7df" },
  { label: "Caption", size: 32, color: "#bcbcc8" },
  { label: "Bold", size: 64, color: "#f8d948" },
];

const OUTPUT_SIZES = [
  { label: "1280 x 720", width: 1280, height: 720 },
  { label: "1920 x 1080", width: 1920, height: 1080 },
  { label: "1080 x 1920", width: 1080, height: 1920 },
];

const OUTPUT_FPS = [24, 25, 30, 60];
const OUTPUT_FORMATS = ["mp4", "mov", "gif"] as const;

export default function Editor() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<Edit | null>(null);
  const canvasRef = useRef<Canvas | null>(null);

  const [projectName, setProjectName] = useState("My Project");
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [activeTab, setActiveTab] = useState<"media" | "text" | "audio">("media");
  const [selectedClip, setSelectedClip] = useState<SelectedClipInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [output, setOutput] = useState({ width: 1280, height: 720, fps: 25, format: "mp4" });
  const [background, setBackground] = useState("#000000");

  const getTracks = () => (((editRef.current?.getEdit() as any)?.timeline?.tracks ?? []) as any[]);

  const syncOutput = () => {
    const snapshot = editRef.current?.getEdit() as any;
    const size = snapshot?.output?.size;
    const fps = snapshot?.output?.fps;
    const format = snapshot?.output?.format;
    const bg = snapshot?.timeline?.background;
    if (size?.width && size?.height && fps && format) {
      setOutput({ width: size.width, height: size.height, fps, format });
    }
    if (typeof bg === "string") {
      setBackground(bg);
    }
  };

  const refreshSelectedClip = (trackIndex: number, clipIndex: number) => {
    const clip = editRef.current?.getClip(trackIndex, clipIndex);
    if (!clip) {
      setSelectedClip(null);
      return;
    }
    setSelectedClip({ trackIndex, clipIndex, clip });
  };

  const updateSelectedClip = async (patch: any) => {
    if (!editRef.current || !selectedClip) return;
    const latest = editRef.current.getClip(selectedClip.trackIndex, selectedClip.clipIndex) as any;
    if (!latest) {
      setSelectedClip(null);
      return;
    }
    const merged = {
      ...latest,
      ...patch,
      asset: patch?.asset
        ? {
            ...(latest.asset ?? {}),
            ...patch.asset,
            font: patch.asset.font
              ? {
                  ...(latest.asset?.font ?? {}),
                  ...patch.asset.font,
                }
              : latest.asset?.font,
          }
        : latest.asset,
    };
    await editRef.current.updateClip(selectedClip.trackIndex, selectedClip.clipIndex, merged);
    refreshSelectedClip(selectedClip.trackIndex, selectedClip.clipIndex);
  };

  const intersects = (start: number, length: number, clip: any) => {
    const a1 = Number(start);
    const a2 = a1 + Number(length);
    const b1 = Number(clip?.start ?? 0);
    const b2 = b1 + Number(clip?.length ?? 0);
    return a1 < b2 && a2 > b1;
  };

  const addClipInFreeTrack = async (clipPayload: any, start: number, length: number) => {
    if (!editRef.current) return;
    const tracks = getTracks();
    let target = tracks.length;
    for (let i = 0; i < tracks.length; i += 1) {
      const clips = (tracks[i]?.clips ?? []) as any[];
      const overlap = clips.some((clip) => intersects(start, length, clip));
      if (!overlap) {
        target = i;
        break;
      }
    }

    const clipData = { ...clipPayload, start, length } as any;
    const existing = editRef.current.getTrack(target) as any;
    if (existing) {
      const nextIndex = (existing?.clips ?? []).length;
      await editRef.current.addClip(target, clipData);
      refreshSelectedClip(target, nextIndex);
      return;
    }

    await editRef.current.addTrack(target, { clips: [clipData] } as any);
    refreshSelectedClip(target, 0);
  };

  const splitSelectedClip = async () => {
    if (!editRef.current || !selectedClip) return;
    const playhead = Number(editRef.current.playbackTime || 0);
    const clip = selectedClip.clip;
    const start = Number(clip.start ?? 0);
    const end = start + Number(clip.length ?? 0);
    if (playhead <= start || playhead >= end) return;

    const leftLength = +(playhead - start).toFixed(3);
    const rightLength = +(end - playhead).toFixed(3);
    await editRef.current.updateClip(selectedClip.trackIndex, selectedClip.clipIndex, {
      ...clip,
      length: leftLength,
    });

    const track = editRef.current.getTrack(selectedClip.trackIndex) as any;
    const newIndex = (track?.clips ?? []).length;
    await editRef.current.addClip(selectedClip.trackIndex, {
      ...clip,
      start: +playhead.toFixed(3),
      length: rightLength,
    } as any);
    refreshSelectedClip(selectedClip.trackIndex, newIndex);
  };

  const deleteSelectedClip = async () => {
    if (!editRef.current || !selectedClip) return;
    await editRef.current.deleteClip(selectedClip.trackIndex, selectedClip.clipIndex);
    setSelectedClip(null);
  };

  useEffect(() => {
    let isMounted = true;
    const instances: {
      canvas?: Canvas;
      timeline?: Timeline;
      controls?: Controls;
      ui?: ReturnType<typeof UIController.create>;
    } = {};

    const init = async () => {
      if (!timelineRef.current || !canvasHostRef.current) return;

      const isStale = () => !isMounted;
      const disposeInstances = () => {
        try {
          if (instances.ui && typeof instances.ui.dispose === "function") instances.ui.dispose();
          if (instances.controls && typeof instances.controls.dispose === "function") instances.controls.dispose();
          if (instances.timeline && typeof instances.timeline.dispose === "function") instances.timeline.dispose();
          if (instances.canvas && typeof instances.canvas.dispose === "function") instances.canvas.dispose();
        } catch {
          // guard
        }
      };

      canvasHostRef.current.innerHTML = "";
      timelineRef.current.innerHTML = "";

      const response = await fetch("https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json");
      const template = await response.json();
      if (isStale()) return;

      const edit = new Edit(template);
      editRef.current = edit;
      instances.canvas = new Canvas(edit);
      canvasRef.current = instances.canvas;
      instances.ui = UIController.create(edit, instances.canvas);
      await instances.canvas.load();
      if (isStale()) {
        disposeInstances();
        return;
      }

      await edit.load();
      if (isStale()) {
        disposeInstances();
        return;
      }

      instances.timeline = new Timeline(edit, timelineRef.current);
      await instances.timeline.load();
      if (isStale()) {
        disposeInstances();
        return;
      }

      instances.controls = new Controls(edit);
      await instances.controls.load();
      if (isStale()) {
        disposeInstances();
        return;
      }

      syncOutput();
      edit.events.on("clip:selected", ({ trackIndex, clipIndex }: { trackIndex: number; clipIndex: number }) => {
        refreshSelectedClip(trackIndex, clipIndex);
      });
      edit.events.on("selection:cleared", () => setSelectedClip(null));
      edit.events.on("clip:updated", ({ current }: { current: { trackIndex: number; clipIndex: number } }) => {
        if (typeof current?.trackIndex === "number" && typeof current?.clipIndex === "number") {
          refreshSelectedClip(current.trackIndex, current.clipIndex);
        }
      });
      edit.events.on("playback:play", () => setIsPlaying(true));
      edit.events.on("playback:pause", () => setIsPlaying(false));
      edit.events.on("output:resized", syncOutput);
      edit.events.on("output:fpsChanged", syncOutput);
      edit.events.on("output:formatChanged", syncOutput);
      edit.events.on("timeline:backgroundChanged", syncOutput);
    };

    void init();

    return () => {
      isMounted = false;
      try {
        if (instances.ui && typeof instances.ui.dispose === "function") instances.ui.dispose();
        if (instances.controls && typeof instances.controls.dispose === "function") instances.controls.dispose();
        if (instances.timeline && typeof instances.timeline.dispose === "function") instances.timeline.dispose();
        if (instances.canvas && typeof instances.canvas.dispose === "function") instances.canvas.dispose();
      } catch {
        // guard
      }
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = "";
      if (timelineRef.current) timelineRef.current.innerHTML = "";
      editRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const uploaded = files.map((file): AssetItem => ({
      id: Math.random().toString(36).slice(2, 11),
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
    }));
    setAssets((prev) => [...prev, ...uploaded]);
  };

  const onDropOnTimeline = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("asset");
    if (!raw) return;
    try {
      const asset = JSON.parse(raw) as AssetItem;
      if (!asset?.url) return;
      const position = Number(editRef.current?.playbackTime || 0);
      void addClipInFreeTrack({ asset: { type: asset.type, src: asset.url } }, position, 5);
    } catch {
      // ignore invalid drop payload
    }
  };

  const addTextPreset = (preset: { label: string; size: number; color: string }) => {
    const position = Number(editRef.current?.playbackTime || 0);
    void addClipInFreeTrack(
      {
        asset: {
          type: "rich-text",
          text: preset.label.toUpperCase(),
          font: { family: "Work Sans", size: preset.size, weight: 600, color: preset.color },
          align: { horizontal: "center", vertical: "middle" },
        },
        offset: { x: 0, y: 0 },
        width: 900,
        height: 240,
      },
      position,
      5,
    );
  };

  const togglePlay = () => {
    if (!editRef.current) return;
    if (editRef.current.isPlaying) {
      editRef.current.pause();
    } else {
      editRef.current.play();
    }
  };

  const exportVideo = async () => {
    if (!editRef.current || !canvasRef.current) return;
    setIsExporting(true);
    try {
      const exporter = new VideoExporter(editRef.current, canvasRef.current);
      const safeName = (projectName || "render").trim().replace(/[\\/:*?"<>|]/g, "-") || "render";
      await exporter.export(`${safeName}.mp4`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0b0c10] text-[#ebedf0] flex flex-col overflow-hidden">
      <div className="h-12 border-b border-[#20232b] bg-[#12141a] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-[#1ea7ff]" />
          <span className="text-sm font-semibold">CutStudio</span>
          <span className="text-xs text-[#8f96a3]">{projectName}</span>
        </div>
        <button className="text-xs px-3 py-1.5 rounded bg-[#1b7cff] hover:bg-[#2d88ff]" onClick={() => void exportVideo()}>
          {isExporting ? "Exporting..." : "Export"}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-[72px] border-r border-[#20232b] bg-[#101217] p-2 space-y-2">
          <button onClick={() => setActiveTab("media")} className={`w-full text-xs rounded p-2 ${activeTab === "media" ? "bg-[#1b2230] text-[#61b2ff]" : "text-[#7d8594]"}`}>Media</button>
          <button onClick={() => setActiveTab("text")} className={`w-full text-xs rounded p-2 ${activeTab === "text" ? "bg-[#1b2230] text-[#61b2ff]" : "text-[#7d8594]"}`}>Text</button>
          <button onClick={() => setActiveTab("audio")} className={`w-full text-xs rounded p-2 ${activeTab === "audio" ? "bg-[#1b2230] text-[#61b2ff]" : "text-[#7d8594]"}`}>Audio</button>
        </div>

        <div className="w-[250px] border-r border-[#20232b] bg-[#0f1116] p-3 overflow-y-auto">
          {activeTab === "media" && (
            <>
              <label className="block border border-dashed border-[#2b3040] rounded p-3 text-xs text-[#9aa2b2] cursor-pointer">
                Import media
                <input hidden multiple type="file" accept="video/*,image/*" onChange={handleUpload} />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("asset", JSON.stringify(asset))}
                    className="bg-[#181b22] border border-[#2b3040] rounded p-2 text-[10px] text-[#c5cbda] cursor-grab"
                  >
                    <div className="text-lg">{asset.type === "video" ? "🎬" : "🖼️"}</div>
                    <div className="truncate">{asset.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "text" && (
            <div className="space-y-2">
              {TEXT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => addTextPreset(preset)}
                  className="w-full flex items-center justify-between rounded border border-[#2b3040] bg-[#181b22] px-3 py-2"
                >
                  <span style={{ color: preset.color }} className="font-semibold text-left">{preset.label}</span>
                  <span className="text-xs text-[#7f8796]">{preset.size}px</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "audio" && (
            <div className="text-xs text-[#8d95a5]">Drop audio support can be added to the same timeline flow.</div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col bg-[#0a0c11]">
          <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0b0d13]">
            <div ref={canvasHostRef} data-shotstack-studio className="w-full h-full max-w-[980px] max-h-[560px]" />
          </div>

          <div className="h-10 bg-[#131721] border-y border-[#20232b] flex items-center justify-between px-3 text-xs">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="px-2 py-1 rounded bg-[#1d2432] hover:bg-[#273246]">{isPlaying ? "Pause" : "Play"}</button>
              <button onClick={() => void splitSelectedClip()} className="px-2 py-1 rounded bg-[#1d2432] hover:bg-[#273246]">Split</button>
              <button onClick={() => void deleteSelectedClip()} className="px-2 py-1 rounded bg-[#1d2432] hover:bg-[#273246]">Delete</button>
            </div>
            <div className="text-[#8992a3]">Drag media to timeline. Clips auto-place on non-overlapping tracks.</div>
          </div>

          <div className="h-52 bg-[#0f121a]" onDragOver={(e) => e.preventDefault()} onDrop={onDropOnTimeline}>
            <div ref={timelineRef} className="w-full h-full" />
          </div>
        </div>

        <div className="w-[280px] border-l border-[#20232b] bg-[#0f1116] p-3 overflow-y-auto text-xs">
          <div className="uppercase tracking-wide text-[#8d95a5] mb-2">Properties</div>
          <div className="space-y-2">
            <label className="block">
              <div className="text-[#7d8596] mb-1">Resolution</div>
              <select
                className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                value={`${output.width}x${output.height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split("x").map(Number);
                  if (editRef.current && w && h) void editRef.current.setOutputSize(w, h).then(syncOutput);
                }}
              >
                {OUTPUT_SIZES.map((size) => (
                  <option key={size.label} value={`${size.width}x${size.height}`}>{size.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[#7d8596] mb-1">FPS</div>
              <select
                className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                value={String(output.fps)}
                onChange={(e) => {
                  if (editRef.current) void editRef.current.setOutputFps(Number(e.target.value)).then(syncOutput);
                }}
              >
                {OUTPUT_FPS.map((fps) => (
                  <option key={fps} value={fps}>{fps} fps</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[#7d8596] mb-1">Format</div>
              <select
                className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                value={String(output.format).toLowerCase()}
                onChange={(e) => {
                  if (editRef.current) void editRef.current.setOutputFormat(e.target.value as any).then(syncOutput);
                }}
              >
                {OUTPUT_FORMATS.map((format) => (
                  <option key={format} value={format}>{format.toUpperCase()}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[#7d8596] mb-1">Background</div>
              <input
                type="color"
                className="w-full h-9 rounded bg-[#1a1e28] border border-[#2b3040]"
                value={background}
                onChange={(e) => {
                  setBackground(e.target.value);
                  if (editRef.current) void editRef.current.setTimelineBackground(e.target.value);
                }}
              />
            </label>
          </div>

          {selectedClip && (
            <div className="mt-4 border-t border-[#20232b] pt-3 space-y-2">
              <div className="uppercase tracking-wide text-[#8d95a5]">Selected Asset</div>
              <div className="text-[#7d8596]">Track {selectedClip.trackIndex + 1} · Clip {selectedClip.clipIndex + 1}</div>

              <label className="block">
                <div className="text-[#7d8596] mb-1">Start</div>
                <input
                  type="number"
                  className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                  value={Number(selectedClip.clip.start ?? 0)}
                  onChange={(e) => void updateSelectedClip({ start: Number(e.target.value) })}
                />
              </label>

              <label className="block">
                <div className="text-[#7d8596] mb-1">Duration</div>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                  value={Number(selectedClip.clip.length ?? 1)}
                  onChange={(e) => void updateSelectedClip({ length: Number(e.target.value) })}
                />
              </label>

              <label className="block">
                <div className="text-[#7d8596] mb-1">Opacity</div>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                  value={Number(selectedClip.clip.opacity ?? 1)}
                  onChange={(e) => void updateSelectedClip({ opacity: Number(e.target.value) })}
                />
              </label>

              <label className="block">
                <div className="text-[#7d8596] mb-1">Position X</div>
                <input
                  type="number"
                  step={0.01}
                  className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                  value={Number(selectedClip.clip.offset?.x ?? 0)}
                  onChange={(e) => void updateSelectedClip({
                    offset: {
                      ...(selectedClip.clip.offset ?? { y: 0 }),
                      x: Number(e.target.value),
                    },
                  })}
                />
              </label>

              <label className="block">
                <div className="text-[#7d8596] mb-1">Position Y</div>
                <input
                  type="number"
                  step={0.01}
                  className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                  value={Number(selectedClip.clip.offset?.y ?? 0)}
                  onChange={(e) => void updateSelectedClip({
                    offset: {
                      ...(selectedClip.clip.offset ?? { x: 0 }),
                      y: Number(e.target.value),
                    },
                  })}
                />
              </label>

              {selectedClip.clip.asset?.type === "rich-text" && (
                <>
                  <label className="block">
                    <div className="text-[#7d8596] mb-1">Text</div>
                    <input
                      type="text"
                      className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                      value={selectedClip.clip.asset.text ?? ""}
                      onChange={(e) => void updateSelectedClip({ asset: { text: e.target.value } })}
                    />
                  </label>
                  <label className="block">
                    <div className="text-[#7d8596] mb-1">Text Color</div>
                    <input
                      type="color"
                      className="w-full h-9 rounded bg-[#1a1e28] border border-[#2b3040]"
                      value={selectedClip.clip.asset.font?.color ?? "#ffffff"}
                      onChange={(e) => void updateSelectedClip({ asset: { font: { color: e.target.value } } })}
                    />
                  </label>
                  <label className="block">
                    <div className="text-[#7d8596] mb-1">Font Size</div>
                    <input
                      type="number"
                      min={10}
                      max={220}
                      className="w-full rounded bg-[#1a1e28] border border-[#2b3040] p-2"
                      value={Number(selectedClip.clip.asset.font?.size ?? 64)}
                      onChange={(e) => void updateSelectedClip({ asset: { font: { size: Number(e.target.value) } } })}
                    />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}