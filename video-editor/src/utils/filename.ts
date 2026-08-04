export const splitExt = (fileName: string): { base: string; ext: string } => {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, idx), ext: fileName.slice(idx) };
};

// Pure, isomorphic - no DB access. Given the set of names already taken,
// returns `fileName` unchanged if free, otherwise the same " (n)" suffixed
// variant resolveUniqueFileName would produce. Client code predicts,
// ahead of the presign round-trip, what name an in-flight upload will
// resolve to; the server route uses it for the real, DB-backed check.
export function resolveUniqueFileNameFromTaken(
  fileName: string,
  taken: Set<string>
): string {
  if (!taken.has(fileName)) return fileName;

  const { base, ext } = splitExt(fileName);
  let n = 2;
  while (taken.has(`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
}