import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import type { WarningDesk } from '@/lib/warningCatalog';
import {
  groupedPunishments,
  groupPunishmentRows,
  mapPunishmentCatalogRow,
  punishmentDurationLabel,
  punishmentsForDesk,
  type PunishmentKind,
  type PunishmentPreset,
} from '@/lib/punishmentCatalog';

const KIND_LABELS: Record<PunishmentKind, string> = {
  timeout: 'Timeout',
  suspend: 'Suspension',
  ban: 'Ban',
};

function groupsFor(rows: PunishmentPreset[], kind?: PunishmentKind, desk: Parameters<typeof groupedPunishments>[0] = 'admin') {
  if (kind) return groupPunishmentRows(rows);
  const byKind: { category: string; items: PunishmentPreset[] }[] = [];
  (['timeout', 'suspend', 'ban'] as PunishmentKind[]).forEach((item) => {
    const items = rows.filter((row) => row.kind === item);
    if (items.length) byKind.push({ category: KIND_LABELS[item], items });
  });
  return byKind.length ? byKind : groupedPunishments(desk, kind);
}

export function PunishmentPresetFields({
  desk = 'admin',
  kind,
  punishmentId,
  onPunishmentId,
  onPreset,
  fieldClass = 'mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white',
}: {
  desk?: WarningDesk;
  kind?: PunishmentKind;
  punishmentId: string;
  onPunishmentId: (id: string) => void;
  onPreset?: (preset: PunishmentPreset | null) => void;
  fieldClass?: string;
}) {
  const [rows, setRows] = useState<PunishmentPreset[]>(() => punishmentsForDesk(desk, kind));
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/api/admin/punishment-catalog', { params: { desk, kind } }).catch((err) => {
          if (err?.response?.status === 403) {
            return api.get('/api/moderator/punishment-catalog', { params: { desk, kind } });
          }
          throw err;
        });
        const next = (res.data?.data || [])
          .map(mapPunishmentCatalogRow)
          .filter((row: PunishmentPreset) => row.id && row.label);
        if (!cancelled) {
          setRows(next);
          setLive(true);
          onPreset?.(next.find((row: PunishmentPreset) => row.id === punishmentId) || null);
        }
      } catch {
        if (!cancelled) {
          const fallback = punishmentsForDesk(desk, kind);
          setRows(fallback);
          setLive(false);
          onPreset?.(fallback.find((row) => row.id === punishmentId) || null);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [desk, kind]);

  const groups = useMemo(
    () => (live ? groupsFor(rows, kind, desk) : groupsFor(punishmentsForDesk(desk, kind), kind, desk)),
    [live, rows, desk, kind],
  );
  const preset = rows.find((row) => row.id === punishmentId) || null;

  return (
    <div className="space-y-3">
      <label className="block text-xs text-zinc-500">
        Punishment
        <select
          value={punishmentId}
          onChange={(event) => {
            const nextId = event.target.value;
            onPunishmentId(nextId);
            onPreset?.(rows.find((row) => row.id === nextId) || null);
          }}
          className={fieldClass}
          required
        >
          <option value="">Select a punishment</option>
          {groups.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {punishmentDurationLabel(item)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {preset ? (
        <p className="text-xs text-zinc-400">
          Default {punishmentDurationLabel(preset).toLowerCase()}.
          {preset.note ? ` ${preset.note}` : ''}
        </p>
      ) : (
        <p className="text-xs text-zinc-500">Pick the named punishment. You can override the clock below.</p>
      )}
    </div>
  );
}
