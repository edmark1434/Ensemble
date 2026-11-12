export function getExportPlanError(
  input: Record<string, unknown>,
  policy: { maxHeight: number; maxFps: number; label: string },
): { status: number; message: string } | null {
  if (typeof input.fps !== "number" || !Number.isFinite(input.fps) || input.fps <= 0) {
    return { status: 400, message: "Invalid export frame rate." };
  }
  if (input.fps > policy.maxFps) {
    return { status: 403, message: `Your plan supports exports up to ${policy.maxFps} fps.` };
  }
  if (input.type !== "audio") {
    if (typeof input.resolution !== "number" || !Number.isSafeInteger(input.resolution) || input.resolution < 2) {
      return { status: 400, message: "Invalid export resolution." };
    }
    if (input.resolution > policy.maxHeight) {
      return { status: 403, message: `Your plan supports exports up to ${policy.label}.` };
    }
  }
  return null;
}
