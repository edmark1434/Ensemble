"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ChevronDown, Check, Search } from "lucide-react";
import { debounce } from "lodash";
import useBlockMembersStore from "@/features/editor/store/use-block-members-store";
import { onAccessChanged } from "@/features/editor/collab/access-events";

type AssignableProjectRole = "Manager" | "Editor" | "Commenter" | "Viewer";
const ASSIGNABLE_PROJECT_ROLES: AssignableProjectRole[] = ["Manager", "Editor", "Commenter", "Viewer"];

interface ProjectPerson {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ProjectMember extends ProjectPerson {
  role: AssignableProjectRole;
}

interface ProjectAccess {
  owner: ProjectPerson | null;
  members: ProjectMember[];
  canManage: boolean;
  canGrantManager: boolean;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const Avatar = ({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) => {
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
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200">
      {getInitials(name)}
    </div>
  );
};

const RoleSelectPopover = ({
  value,
  onChange,
  onRemove,
  prefix,
  roles
}: {
  value: AssignableProjectRole;
  onChange: (v: AssignableProjectRole) => void;
  onRemove?: () => void;
  prefix?: string;
  roles: AssignableProjectRole[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="flex w-full items-center justify-between text-sm font-normal" variant="outline">
          <div className="w-full overflow-hidden text-left">
            <p className="truncate">
              {prefix && <span className="text-muted-foreground">{prefix} </span>}
              {value}
            </p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[1000] p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        {roles.map((option) => (
          <div
            key={option}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
            className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
          >
            {option}
            {option === value && <Check size={14} className="text-muted-foreground" />}
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
  onRemove,
  roles
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AssignableProjectRole | "Owner";
  editable: boolean;
  onRoleChange?: (role: AssignableProjectRole) => void;
  onRemove?: () => void;
  roles: AssignableProjectRole[];
}) => (
  <div className="flex items-center gap-3">
    <Avatar name={name} avatarUrl={avatarUrl} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm text-zinc-200">{name}</p>
      <p className="truncate text-xs text-muted-foreground">{email}</p>
    </div>
    {role === "Owner" || !editable ? (
      <span className="w-36 shrink-0 text-right text-sm text-muted-foreground">{role}</span>
    ) : (
      <div className="w-36 shrink-0">
        <RoleSelectPopover
          value={role}
          onChange={(v) => onRoleChange?.(v)}
          onRemove={onRemove}
          roles={roles}
        />
      </div>
    )}
  </div>
);

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const refreshSceneAccess = () => {
  const { blockId, load } = useBlockMembersStore.getState();
  if (blockId) void load(blockId);
};

export function ShareModal({ open, onOpenChange, projectId }: ShareModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [owner, setOwner] = useState<ProjectPerson | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canGrantManager, setCanGrantManager] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProjectPerson[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [newUserRole, setNewUserRole] = useState<AssignableProjectRole>("Viewer");
  const [addError, setAddError] = useState<string | null>(null);

  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const loadSeq = useRef(0);

  const roleOptions = canGrantManager
    ? ASSIGNABLE_PROJECT_ROLES
    : ASSIGNABLE_PROJECT_ROLES.filter((r) => r !== "Manager");

  const load = async (silent = false) => {
    const seq = ++loadSeq.current;
    if (!silent) {
      setStatus("loading");
      setLoadError(null);
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data: ProjectAccess = await res.json();
      if (seq !== loadSeq.current) return; // a newer load or an edit superseded this one
      setOwner(data.owner);
      setMembers(data.members);
      setCanManage(data.canManage);
      setCanGrantManager(data.canGrantManager);
      setLoadError(null);
      setStatus("ready");
    } catch {
      if (seq !== loadSeq.current || silent) return; // background failures keep what's on screen
      setLoadError("Couldn't load project access");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);
  useEffect(() => {
    if (!open) return;

    let t: ReturnType<typeof setTimeout> | null = null;
    const off = onAccessChanged(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(true), 150);
    });
    const poll = setInterval(() => void load(true), 5_000);

    return () => {
      off();
      clearInterval(poll);
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const searchUsers = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q) {
          setSuggestions([]);
          setSearching(false);
          return;
        }
        try {
          const res = await fetch(
            `/api/projects/${projectId}/members/search?q=${encodeURIComponent(q)}`
          );
          if (!res.ok) throw new Error("search failed");
          const data: { results: ProjectPerson[] } = await res.json();
          setSuggestions(data.results);
        } catch {
          setSuggestions([]);
        } finally {
          setSearching(false);
        }
      }, 300),
    [projectId]
  );

  useEffect(() => {
    return () => searchUsers.cancel();
  }, [searchUsers]);

  // Radix Popover portals to document.body, which sits outside the Dialog's
  // own DOM subtree — the Dialog's scroll lock only allows scroll on its
  // descendants, so a portaled dropdown's internal scroll silently breaks.
  // This dropdown is a plain in-place div instead, so it stays scrollable.
  useEffect(() => {
    if (!suggestOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!searchWrapperRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [suggestOpen]);

  const handleAdd = async (person: ProjectPerson) => {
    setSuggestOpen(false);
    setQuery("");
    setSuggestions([]);

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: person.userId, role: newUserRole })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAddError(body.error ?? "Failed to add");
      return;
    }
    setAddError(null);
    await load();
    refreshSceneAccess();
  };

  // Enter adds the top match.
  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSuggestOpen(false);
      return;
    }
    if (e.key !== "Enter" || !suggestions[0]) return;
    handleAdd(suggestions[0]);
  };

  const hint =
    status !== "ready"
      ? null
      : !canManage
        ? "Only the project owner and managers can change who has access."
        : query.trim() && !searching && suggestions.length === 0
          ? "No matching users found."
          : null;

  const handleRoleChange = async (userId: string, role: AssignableProjectRole) => {
    loadSeq.current++;
    setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role })
    });
    if (!res.ok) void load();
    refreshSceneAccess();
  };

  const handleRemove = async (userId: string) => {
    loadSeq.current++;
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
    const res = await fetch(
      `/api/projects/${projectId}/members?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) void load();
    refreshSceneAccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[300] border bg-card px-2 py-8 gap-6 sm:max-w-lg">
        <DialogHeader className="px-6 -mt-0.75">
          <DialogTitle className="text-md font-semibold">Share</DialogTitle>
        </DialogHeader>

        <div className="px-6 flex flex-col gap-4">
          {canManage && (
            <div className="flex flex-col gap-3">
              <div className="relative" ref={searchWrapperRef}>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Add people by name or email"
                  className="pl-10"
                  value={query}
                  disabled={!canManage}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuery(v);
                    setSuggestOpen(true);
                    if (v.trim()) setSearching(true);
                    searchUsers(v.trim());
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onKeyDown={handleQueryKeyDown}
                />

                {suggestOpen && suggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full z-[1000] mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[200px]">
                      {suggestions.map((person) => (
                        <div
                          key={person.userId}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleAdd(person)}
                          className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-zinc-800/50"
                        >
                          <Avatar name={person.name} avatarUrl={person.avatarUrl} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-200">{person.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>

              <RoleSelectPopover
                prefix="Add as:"
                value={newUserRole}
                onChange={setNewUserRole}
                roles={roleOptions}
              />

              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
              {addError && <p className="text-xs text-red-500">{addError}</p>}
            </div>
          )}
          {status === "error" && <p className="text-xs text-red-500">{loadError}</p>}

          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[320px] -mx-8 px-8">
            <div className="flex flex-col gap-5">
              {status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
              {owner && (
                <UserRow
                  name={owner.name}
                  email={owner.email}
                  avatarUrl={owner.avatarUrl}
                  role="Owner"
                  editable={false}
                  roles={roleOptions}
                />
              )}
              {members.map((m) => (
                <UserRow
                  key={m.userId}
                  name={m.name}
                  email={m.email}
                  avatarUrl={m.avatarUrl}
                  role={m.role}
                  editable={canManage && (canGrantManager || m.role !== "Manager")}
                  onRoleChange={(role) => void handleRoleChange(m.userId, role)}
                  onRemove={() => void handleRemove(m.userId)}
                  roles={roleOptions}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareModal;