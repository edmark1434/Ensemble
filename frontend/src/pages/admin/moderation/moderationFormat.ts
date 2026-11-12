/** Formatting shared by the moderation activity log and the management sections. */

const DASH = '—';

/** `November 12, 2026 at 4:05 PM` */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** `12 Nov 2026, 4:05 PM` — compact enough for a table cell. */
export function formatShortDateTime(value: string | null | undefined) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Full precision, including seconds and the viewer's time zone. */
export function formatExactDateTime(value: string | null | undefined) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const RELATIVE_STEPS: [limit: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86400, 3600, 'hour'],
  [604800, 86400, 'day'],
  [2629800, 604800, 'week'],
  [31557600, 2629800, 'month'],
  [Infinity, 31557600, 'year'],
];

/** `3 hours ago`, `in 2 days`. Falls back to an em dash for unusable input. */
export function formatRelative(value: string | null | undefined) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  const seconds = (date.getTime() - Date.now()) / 1000;
  const absolute = Math.abs(seconds);
  if (absolute < 45) return 'just now';
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [limit, divisor, unit] of RELATIVE_STEPS) {
    if (absolute < limit) return formatter.format(Math.round(seconds / divisor), unit);
  }
  return formatter.format(Math.round(seconds / 31557600), 'year');
}

export function formatBytes(bytes: number | null | undefined) {
  const value = Number(bytes || 0);
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/** `4:07` under an hour, `1:04:07` beyond it. */
export function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

/** Status pill colours, shared so the same word never changes colour between tabs. */
export function statusClass(status: string) {
  const s = String(status || '').toLowerCase();
  if (['completed', 'resolved', 'approved', 'verified', 'active', 'visible'].includes(s)) {
    return 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300';
  }
  if (['reversed', 'dismissed', 'rejected', 'declined'].includes(s)) {
    return 'border-violet-500/25 bg-violet-500/15 text-violet-300';
  }
  if (['pending', 'open', 'in progress', 'in_progress', 'locked'].includes(s)) {
    return 'border-amber-500/25 bg-amber-500/15 text-amber-200';
  }
  if (['removed', 'banned', 'frozen', 'suspended'].includes(s)) {
    return 'border-rose-500/25 bg-rose-500/15 text-rose-200';
  }
  if (['archived', 'inactive', 'trashed'].includes(s)) {
    return 'border-white/10 bg-zinc-500/15 text-zinc-300';
  }
  return 'border-white/10 bg-zinc-500/15 text-zinc-300';
}

/** How loud an activity entry should look, by catalog severity. */
export function severityClass(severity: string) {
  switch (String(severity || '').toLowerCase()) {
    case 'critical':
      return 'border-rose-500/30 bg-rose-500/15 text-rose-200';
    case 'high':
      return 'border-orange-500/30 bg-orange-500/15 text-orange-200';
    case 'medium':
      return 'border-amber-500/30 bg-amber-500/15 text-amber-200';
    case 'info':
      return 'border-sky-500/30 bg-sky-500/15 text-sky-200';
    default:
      return 'border-white/10 bg-white/[0.04] text-zinc-400';
  }
}

export function severityLabel(severity: string) {
  const s = String(severity || 'low').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Person = {
  name?: string | null;
  handle?: string | null;
  userId?: string | number | null;
};

/** `Ada Lovelace @ada`, degrading to a handle, then an id, then `Unknown`. */
export function personLabel(person?: Person | null) {
  if (person?.name) return person.handle ? `${person.name} @${person.handle}` : person.name;
  if (person?.handle) return `@${person.handle}`;
  return person?.userId != null ? String(person.userId) : 'Unknown';
}

export function apiMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err instanceof Error ? err.message : fallback) ||
    fallback
  );
}

/** Copies text, reporting whether it worked so callers can toast accordingly. */
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Quotes a CSV field so commas, quotes and newlines survive a spreadsheet. */
function csvField(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds a CSV from headers plus rows and hands the browser a download. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n');
  // A BOM keeps Excel from mangling non-ASCII text in the export.
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { DASH };
