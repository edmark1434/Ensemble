// Safe to share between the editor controls and server-side enforcement.
export function canResizeComposition(plan?: string): boolean {
  return ["premium", "business"].includes(plan?.trim().toLowerCase() ?? "");
}

export const COMPOSITION_SIZE_PLAN_MESSAGE =
  "Changing project or scene size requires Premium or Business.";
