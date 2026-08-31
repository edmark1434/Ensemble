import { useMemo, useState } from "react";
import { Check, Trash2, UserPlus, X } from "lucide-react";
import type { TeamTaskMember } from "./types";

export default function WorkspaceMembersModal({ open, members, availableMembers, saving, onClose, onAdd, onRemove }: {
  open: boolean;
  members: TeamTaskMember[];
  availableMembers: TeamTaskMember[];
  saving: boolean;
  onClose: () => void;
  onAdd: (accountIds: string[]) => Promise<void>;
  onRemove: (accountId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const memberIds = useMemo(() => new Set(members.map((member) => member.account_id)), [members]);
  const candidates = availableMembers.filter((member) => !memberIds.has(member.account_id));
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-[#11131d]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#11131d]">
          <div><h2 className="font-semibold text-gray-900 dark:text-white">Workspace members</h2><p className="text-xs text-zinc-500">Choose who can view and receive tasks for this work.</p></div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 p-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Current members</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.account_id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-400">{member.display_name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900 dark:text-white">{member.display_name}</p><p className="text-xs text-zinc-500">@{member.handle} · {member.team_role}</p></div>
                  <button type="button" disabled={saving} onClick={() => void onRemove(member.account_id)} className="cursor-pointer rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" title="Remove from workspace"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {!members.length && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">No workspace members yet.</p>}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Add active Team members</h3>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {candidates.map((member) => {
                const checked = selected.includes(member.account_id);
                return (
                  <button key={member.account_id} type="button" onClick={() => setSelected((current) => checked ? current.filter((id) => id !== member.account_id) : [...current, member.account_id])} className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition ${checked ? "border-blue-500 bg-blue-500/10" : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"}`}>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900 dark:text-white">{member.display_name}</p><p className="text-xs text-zinc-500">@{member.handle} · {member.role}</p></div>
                    <span className={`grid h-5 w-5 place-items-center rounded border ${checked ? "border-blue-500 bg-blue-500 text-white" : "border-white/20"}`}>{checked && <Check className="h-3 w-3" />}</span>
                  </button>
                );
              })}
              {!candidates.length && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">All active Team members are already included.</p>}
            </div>
          </section>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#11131d]">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 dark:border-white/10">Close</button>
          <button type="button" disabled={saving || !selected.length} onClick={async () => { await onAdd(selected); setSelected([]); }} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="h-4 w-4" />{saving ? "Adding..." : "Add selected"}</button>
        </div>
      </div>
    </div>
  );
}
