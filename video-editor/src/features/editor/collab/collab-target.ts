export type CollabTarget =
  | { kind: "project"; id: string }
  | { kind: "block"; id: string };

export function collabApiBase(target: CollabTarget): string {
  return target.kind === "project"
    ? `/api/collab/projects/${target.id}`
    : `/api/collab/blocks/${target.id}`;
}