// Hard limit on a stored file name, extension included.
export const MAX_FILE_NAME_LENGTH = 50;
// Base names are cut to this first, so the extension still fits.
export const MAX_FILE_BASE_LENGTH = 42;
// Room set aside for " (n)" when looking up existing names: " (" + up to 5 digits + ")".
const SUFFIX_RESERVE = 8;

export const splitExt = (fileName: string): { base: string; ext: string } => {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, idx), ext: fileName.slice(idx) };
};

// Cuts by code point so emoji aren't split in half. Only trims trailing
// whitespace when it actually cut something.
const clip = (text: string, max: number): string => {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, Math.max(0, max)).join("").trimEnd();
};

// Caps the base at 42 characters (and at whatever the extension leaves free
// under the 50 limit). The extension is never touched.
export function truncateFileName(fileName: string): string {
  const { base, ext } = splitExt(fileName);
  const room = Math.min(MAX_FILE_BASE_LENGTH, MAX_FILE_NAME_LENGTH - ext.length);
  return `${clip(base, room)}${ext}`;
}

// Pure, isomorphic - no DB access. Given the set of names already taken,
// returns the (truncated) name unchanged if free, otherwise the " (n)"
// suffixed variant. The base shrinks as needed so the suffix and extension
// still fit in 50. Client code predicts, ahead of the presign round-trip,
// what name an in-flight upload will resolve to; the server route uses it
// for the real, DB-backed check.
export function resolveUniqueFileNameFromTaken(
  fileName: string,
  taken: Set<string>
): string {
  const name = truncateFileName(fileName);
  if (!taken.has(name)) return name;

  const { base, ext } = splitExt(name);
  let n = 2;
  while (true) {
    const suffix = ` (${n})`;
    const room = MAX_FILE_NAME_LENGTH - ext.length - suffix.length;
    const candidate = `${clip(base, room)}${suffix}${ext}`;
    if (!taken.has(candidate)) return candidate;
    n++;
  }
}

// Every name resolveUniqueFileNameFromTaken can return for this file starts
// with `prefix` and ends with `ext`, so one LIKE query on those finds
// everything that could collide. The prefix is shorter than the base on
// purpose: suffixed names have their base clipped further.
export function uniqueNameLookup(fileName: string): { prefix: string; ext: string } {
  const { base, ext } = splitExt(truncateFileName(fileName));
  return { prefix: clip(base, MAX_FILE_NAME_LENGTH - ext.length - SUFFIX_RESERVE), ext };
}