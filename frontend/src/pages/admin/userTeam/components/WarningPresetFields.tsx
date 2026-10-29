import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { groupedWarnings, groupWarningRows, warningsForDesk, type WarningDesk, type WarningPreset } from '@/lib/warningCatalog';
import { warningLadderSummary } from '@/lib/warningLadder';

function mapCatalogRow(row: Partial<WarningPreset> & { slug?: string; durationDays?: number; note?: string }): WarningPreset {
  return {
    id: String(row.id || row.slug || ''),
    label: String(row.label || ''),
    category: String(row.category || 'Other'),
    points: Number(row.points || 1),
    durationDays: Number(row.durationDays || 0) || undefined,
    desks: Array.isArray(row.desks) ? row.desks : ['admin'],
    note: row.note || '',
  };
}

export function WarningPresetFields({
  desk = 'admin',
  warningId,
  reason,
  onWarningId,
  onReason,
  fieldClass = 'mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white',
}: {
  desk?: WarningDesk;
  warningId: string;
  reason: string;
  onWarningId: (id: string) => void;
  onReason: (reason: string) => void;
  fieldClass?: string;
}) {
  const [rows, setRows] = useState<WarningPreset[]>(() => warningsForDesk(desk));
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/api/admin/warning-catalog', { params: { desk } }).catch((err) => {
          if (err?.response?.status === 403) {
            return api.get('/api/moderator/warning-catalog', { params: { desk } });
          }
          throw err;
        });
        const next = (res.data?.data || []).map(mapCatalogRow).filter((row: WarningPreset) => row.id && row.label);
        if (!cancelled) {
          setRows(next);
          setLive(true);
        }
      } catch {
        if (!cancelled) {
          setRows(warningsForDesk(desk));
          setLive(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [desk]);

  const groups = useMemo(
    () => (live ? groupWarningRows(rows) : groupedWarnings(desk)),
    [live, rows, desk],
  );
  const preset = rows.find((row) => row.id === warningId) || null;

  return (
    <div className="space-y-4">
      <label className="block text-xs text-zinc-500">
        Warning
        <select
          value={warningId}
          onChange={(event) => onWarningId(event.target.value)}
          className={fieldClass}
          required
        >
          <option value="">Select a warning</option>
          {groups.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.points} pt{item.durationDays ? ` · ${item.durationDays}d` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {preset ? (
        <p className="text-xs text-zinc-400">
          {warningLadderSummary(preset.points, preset.durationDays)}
          {preset.note ? ` ${preset.note}` : ''}
        </p>
      ) : null}
      <label className="block text-xs text-zinc-500">
        Case notes
        <textarea
          value={reason}
          onChange={(event) => onReason(event.target.value)}
          rows={3}
          required
          placeholder="What happened on this case"
          className={fieldClass}
        />
      </label>
    </div>
  );
}
