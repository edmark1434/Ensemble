import React, { useEffect, useState } from "react";
import { X, Search, ChevronDown, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import useBlockMembersStore, {
  useActiveSceneBlockId
} from "@/features/editor/store/use-block-members-store";
import {
  ASSIGNABLE_BLOCK_ROLES,
  type AssignableBlockRole,
  type BlockPerson
} from "@/features/editor/types/block-members";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const Avatar = ({
  name,
  avatarUrl
}: {
  name: string;
  avatarUrl?: string | null;
}) => {
  // Falls back to initials when there's no avatar or the image fails to load.
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200">
      {getInitials(name)}
    </div>
  );
};

const RoleSelectPopover = ({
  value,
  onChange,
  onRemove,
  prefix
}: {
  value: AssignableBlockRole;
  onChange: (v: AssignableBlockRole) => void;
  onRemove?: () => void;
  prefix?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="flex w-full items-center justify-between text-sm font-normal"
          variant="outline"
        >
          <div className="w-full overflow-hidden text-left">
            <p className="truncate">
              {prefix && (
                <span className="text-muted-foreground">{prefix} </span>
              )}
              {value}
            </p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[300] p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        {ASSIGNABLE_BLOCK_ROLES.map((option) => (
          <div
            key={option}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
            className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
          >
            {option}
            {option === value && (
              <Check size={14} className="text-muted-foreground" />
            )}
          </div>
        ))}
        {onRemove && (
          <div
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            className="cursor-pointer border-t px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
          >
            Remove
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const UserRow = ({
  name,
  email,
  avatarUrl,
  role,
  editable,
  onRoleChange,
  onRemove
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AssignableBlockRole | "Owner";
  // False for the owner row, and for everyone when the viewer isn't the owner.
  editable: boolean;
  onRoleChange?: (role: AssignableBlockRole) => void;
  onRemove?: () => void;
}) => {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} avatarUrl={avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-200">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      {role === "Owner" || !editable ? (
        <span className="w-36 shrink-0 text-right text-sm text-muted-foreground">
          {role}
        </span>
      ) : (
        <div className="w-36 shrink-0">
          <RoleSelectPopover
            value={role}
            onChange={(v) => onRoleChange?.(v)}
            onRemove={onRemove}
          />
        </div>
      )}
    </div>
  );
};

export default function AccessPicker() {
  const { setFloatingControl } = useLayoutStore();
  const blockId = useActiveSceneBlockId();
  const {
    status,
    error,
    owner,
    members,
    candidates,
    canManage,
    load,
    addMember,
    changeRole,
    removeMember
  } = useBlockMembersStore();

  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState<AssignableBlockRole>("Viewer");

  // Refresh on open so people added to the project since the panel was last
  // shown appear as suggestions.
  useEffect(() => {
    if (blockId) void load(blockId);
  }, [blockId, load]);

  // No scene selected (e.g. selection cleared while the panel was open).
  if (!blockId) return null;

  const q = query.trim().toLowerCase();
  const suggestions = candidates.filter(
    (c) =>
      !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  );

  const handleAdd = (person: BlockPerson) => {
    void addMember(person, newUserRole);
    setQuery("");
    setSuggestOpen(false);
  };

  // Enter adds the top match. Only project members can be added, so there's
  // no "type any email" fallback anymore.
  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !suggestions[0]) return;
    handleAdd(suggestions[0]);
  };

  const hint =
    status !== "ready"
      ? null
      : !canManage
        ? "Only the scene owner can change who has access."
        : candidates.length === 0
          ? "Everyone in this project already has access."
          : q && suggestions.length === 0
            ? "No project members match that search."
            : null;

  return (
    <div className="w-md bg-card border flex flex-col rounded-lg">
      {/* Header */}
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-semibold">Specific access</p>
        <X
          className="h-4 w-4 cursor-pointer text-muted-foreground"
          onClick={() => setFloatingControl("")}
        />
      </div>

      {/* Search - same icon size and offsets as the font picker */}
      <div className="px-4">
        <Popover
          open={canManage && suggestOpen && suggestions.length > 0}
          onOpenChange={setSuggestOpen}
        >
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Add project members by name or email"
                className="pl-10"
                value={query}
                disabled={!canManage}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={handleQueryKeyDown}
              />
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="z-[300] p-0"
            style={{ width: "var(--radix-popover-trigger-width)" }}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[200px]">
              {suggestions.map((person) => (
                <div
                  key={person.userId}
                  onClick={() => handleAdd(person)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-zinc-800/50"
                >
                  <Avatar name={person.name} avatarUrl={person.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.email}
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Role for newly added people - full width, like the font picker's category filter */}
      {canManage && (
        <div className="px-4 mt-3">
          <RoleSelectPopover
            prefix="Add as:"
            value={newUserRole}
            onChange={setNewUserRole}
          />
        </div>
      )}

      {hint && <p className="px-4 mt-2 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="px-4 mt-2 text-xs text-red-500">{error}</p>}

      {/* List */}
      <ScrollArea className="w-full px-4 mt-4 [&>[data-radix-scroll-area-viewport]]:max-h-[300px]">
        <div className="w-full h-fit pb-4 flex flex-col gap-6">
          {status === "loading" && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {owner && (
            <UserRow
              name={owner.name}
              email={owner.email}
              avatarUrl={owner.avatarUrl}
              role="Owner"
              editable={false}
            />
          )}
          {members.map((m) => (
            <UserRow
              key={m.userId}
              name={m.name}
              email={m.email}
              avatarUrl={m.avatarUrl}
              role={m.role}
              editable={canManage}
              onRoleChange={(role) => void changeRole(m.userId, role)}
              onRemove={() => void removeMember(m.userId)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}