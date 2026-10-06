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
  type AssignableBlockRole, BlockMember,
  type BlockPerson, BlockRole, ROLE_RANK, sceneRoleCeiling
} from "@/features/editor/types/block-members";
import { onAccessChanged } from "@/features/editor/collab/access-events";
import { Avatar } from "@/components/user-avatar";

const BLOCK_ROLE_DESCRIPTIONS: Record<AssignableBlockRole, string> = {
  Manager: "Can edit, and manage access to this scene",
  Editor: "Can edit this scene",
  Commenter: "Can view and comment on this scene",
  Viewer: "Can only view this scene"
};

const RoleSelectPopover = ({
  value,
  onChange,
  onRemove,
  prefix,
  maxRole,
  roles = ASSIGNABLE_BLOCK_ROLES,
  showDescriptions,
}: {
  value: AssignableBlockRole;
  onChange: (v: AssignableBlockRole) => void;
  onRemove?: () => void;
  prefix?: string;
  maxRole?: AssignableBlockRole | null;
  roles?: AssignableBlockRole[];
  showDescriptions?: boolean;
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
        {roles.map((option) => {
          const blocked = !!maxRole && ROLE_RANK[option] > ROLE_RANK[maxRole];
          return (
            <div
              key={option}
              title={blocked ? `Limited by their project role (${maxRole})` : undefined}
              onClick={() => {
                if (blocked) return;
                onChange(option);
                setOpen(false);
              }}
              className={`flex items-center justify-between gap-3 px-3 py-2 text-zinc-200 ${
                blocked ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-zinc-800/50"
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm">{option}</div>
                {showDescriptions && (
                  <div className="text-xs text-muted-foreground">{BLOCK_ROLE_DESCRIPTIONS[option]}</div>
                )}
              </div>
              {option === value && <Check size={14} className="shrink-0 text-muted-foreground" />}
            </div>
          );
        })}
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
  onRemove,
  maxRole,
  roles,
  removed,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AssignableBlockRole | "Owner";
  // False for the owner row, and for everyone when the viewer isn't the owner.
  editable: boolean;
  onRoleChange?: (role: AssignableBlockRole) => void;
  onRemove?: () => void;
  maxRole?: AssignableBlockRole | null;
  roles?: AssignableBlockRole[];
  removed?: boolean;
}) => {
  return (
    <div className={`flex items-center gap-3 ${removed ? "opacity-50" : ""}`}>
      <Avatar name={name} avatarUrl={avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-200">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      {removed ? (
        <span className="w-36 shrink-0 text-right text-sm text-muted-foreground">
          Not in project
        </span>
      ) : role === "Owner" || !editable ? (
        <span className="w-36 shrink-0 text-right text-sm text-muted-foreground">
          {role}
        </span>
      ) : (
        <div className="w-36 shrink-0">
          <RoleSelectPopover
            value={role}
            maxRole={maxRole}
            roles={roles}
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
    canGrantManager,
    load,
    addMember,
    changeRole,
    removeMember
  } = useBlockMembersStore();

  const roleOptions = canGrantManager
    ? ASSIGNABLE_BLOCK_ROLES
    : ASSIGNABLE_BLOCK_ROLES.filter((r) => r !== "Manager");

  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState<AssignableBlockRole>("Viewer");

  useEffect(() => {
    if (!blockId) return;
    void load(blockId);

    let t: ReturnType<typeof setTimeout> | null = null;
    const off = onAccessChanged(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(blockId), 150);
    });
    const poll = setInterval(() => void load(blockId), 30_000);

    return () => {
      off();
      clearInterval(poll);
      if (t) clearTimeout(t);
    };
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
        ? "Only the scene owner and managers can change who has access."
        : candidates.length === 0
          ? "Everyone in this project already has access."
          : q && suggestions.length === 0
            ? "No project members match that search."
            : null;

  return (
    <div className="w-md bg-card border flex flex-col rounded-lg">
      {/* Header */}
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-semibold">Scene access</p>
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
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  {person.projectRole && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {person.projectRole}
                    </span>
                  )}
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
            roles={roleOptions}
            showDescriptions
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
              removed={owner.projectRole === null}
            />
          )}
          {members.map((m) => (
            <UserRow
              key={m.userId}
              name={m.name}
              email={m.email}
              avatarUrl={m.avatarUrl}
              role={m.effectiveRole ?? m.role}
              editable={canManage && (canGrantManager || m.role !== "Manager")}
              roles={roleOptions}
              onRoleChange={(role) => void changeRole(m.userId, role)}
              onRemove={() => void removeMember(m.userId)}
              removed={m.projectRole === null}
              maxRole={m.projectRole ? sceneRoleCeiling(m.projectRole) : null}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}