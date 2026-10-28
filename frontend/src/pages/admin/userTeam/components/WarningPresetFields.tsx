import { groupedWarnings, getWarningById, type WarningDesk } from '@/lib/warningCatalog';
import { warningLadderSummary } from '@/lib/warningLadder';

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
  const groups = groupedWarnings(desk);
  const preset = getWarningById(warningId);

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
                  {item.label} · {item.points} pt
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {preset ? (
        <p className="text-xs text-zinc-400">
          {warningLadderSummary(preset.points)}
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
