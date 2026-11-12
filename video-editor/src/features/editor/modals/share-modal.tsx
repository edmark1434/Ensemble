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
import { ChevronDown, Check, Search, Link, LayoutTemplate, Loader2 } from "lucide-react";
import * as Y from "yjs";
import { debounce } from "lodash";
import useBlockMembersStore from "@/features/editor/store/use-block-members-store";
import { useAccessRefresh } from "@/features/editor/hooks/use-access-refresh";
import { Avatar } from "@/components/user-avatar";
import { Separator } from "@/components/ui/separator";
import type { CollaborativeProjectAllowance } from "@/lib/db/collaborative-projects";

type AssignableProjectRole = "Manager" | "Editor" | "Commenter" | "Viewer";
const ASSIGNABLE_PROJECT_ROLES: AssignableProjectRole[] = ["Manager", "Editor", "Commenter", "Viewer"];
const SHARE_ACCESS_LABELS: Record<AssignableProjectRole, string> = {
  Viewer: "view-only", Commenter: "comment-only", Editor: "edit access", Manager: "manager access",
};

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
  collaboration: CollaborativeProjectAllowance | null;
}

const ROLE_DESCRIPTIONS: Record<AssignableProjectRole, string> = {
  Manager: "Can edit, and manage who has access",
  Editor: "Can edit the project",
  Commenter: "Can view and leave comments",
  Viewer: "Can only view"
};

const RoleSelectPopover = ({
  value,
  onChange,
  onRemove,
  prefix,
  roles = ASSIGNABLE_PROJECT_ROLES,
  showDescriptions,
}: {
  value: AssignableProjectRole;
  onChange: (v: AssignableProjectRole) => void;
  onRemove?: () => void;
  prefix?: string;
  roles?: AssignableProjectRole[];
  showDescriptions?: boolean;
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
            className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-zinc-200 hover:bg-zinc-800/50"
          >
            <div className="min-w-0">
              <div className="text-sm">{option}</div>
              {showDescriptions && (
                <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[option]}</div>
              )}
            </div>
            {option === value && <Check size={14} className="shrink-0 text-muted-foreground" />}
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
  roles,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AssignableProjectRole | "Owner";
  editable: boolean;
  onRoleChange?: (role: AssignableProjectRole) => void;
  onRemove?: () => void;
  roles?: AssignableProjectRole[];
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
  templateSource?: { doc: Y.Doc; blockId?: string };
}

const refreshSceneAccess = () => {
  const { blockId, load } = useBlockMembersStore.getState();
  if (blockId) void load(blockId);
};

export function ShareModal({ open, onOpenChange, projectId, templateSource }: ShareModalProps) {
  const [copying, setCopying] = useState(false);
  const [copiedRole, setCopiedRole] = useState<AssignableProjectRole | null>(null);
  const [preparingTemplate, setPreparingTemplate] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [owner, setOwner] = useState<ProjectPerson | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canGrantManager, setCanGrantManager] = useState(false);
  const [collaboration, setCollaboration] = useState<CollaborativeProjectAllowance | null>(null);
  const canShare = status === "ready" && canManage && collaboration?.canShare === true;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProjectPerson[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [settledQuery, setSettledQuery] = useState<string | null>(null);
  const [newUserRole, setNewUserRole] = useState<AssignableProjectRole>("Viewer");
  const [addError, setAddError] = useState<string | null>(null);

  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const loadSeq = useRef(0);
  const searchSeq = useRef(0);

  const roleOptions = canGrantManager
    ? ASSIGNABLE_PROJECT_ROLES
    : ASSIGNABLE_PROJECT_ROLES.filter((r) => r !== "Manager");

  useEffect(() => { setCopiedRole(null); setShareError(null); setTemplateUrl(null); }, [open, projectId, newUserRole]);

  const copyShareLink = async () => {
    if (copying || !canShare) return;
    setCopying(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/share-link`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newUserRole }),
      });
      const data = await res.json();
      if (data.code === "COLLABORATIVE_PROJECT_LIMIT") setCollaboration(data.collaboration);
      if (!res.ok) throw new Error(data.error || "Could not create a share link");
      await navigator.clipboard.writeText(data.url);
      setCopiedRole(newUserRole);
    } catch (error) { setShareError(error instanceof Error ? error.message : "Could not copy the link"); }
    finally { setCopying(false); }
  };

  const shareAsTemplate = async () => {
    if (!templateSource || preparingTemplate) return;
    // Open during the click so browsers don't block the tab after compaction finishes.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setPreparingTemplate(true);
    setShareError(null);
    try {
      const params = new URLSearchParams();
      if (templateSource.blockId) params.set("blockId", templateSource.blockId);
      const update = Y.encodeStateAsUpdate(templateSource.doc);
      const res = await fetch(`/api/projects/${projectId}/template-snapshot?${params}`, {
        method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(update).buffer,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not prepare the template");
      if (tab && !tab.closed) tab.location.replace(data.url);
      else setTemplateUrl(data.url);
    } catch (error) {
      tab?.close();
      setShareError(error instanceof Error ? error.message : "Could not prepare the template");
    } finally { setPreparingTemplate(false); }
  };

  const load = async (silent = false) => {
    const seq = ++loadSeq.current;
    if (!silent) {
      setStatus("loading");
      setLoadError(null);
      setCanManage(false);
      setCollaboration(null);
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
      setCollaboration(data.collaboration);
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

  useAccessRefresh(open, () => void load(true));

  useEffect(() => {
    if (!canShare) {
      searchSeq.current++;
      setSuggestOpen(false);
      setSuggestions([]);
      setSearching(false);
      setCopiedRole(null);
    }
  }, [canShare]);

  // lost the right to grant Manager while "Add as: Manager" was selected
  useEffect(() => {
    if (!canGrantManager && newUserRole === "Manager") setNewUserRole("Viewer");
  }, [canGrantManager, newUserRole]);

  const searchUsers = useMemo(
    () =>
      debounce(async (q: string, seq: number) => {
        if (seq !== searchSeq.current) return;
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
          if (seq !== searchSeq.current) return;
          setSuggestions(data.results);
          setSettledQuery(q);
        } catch {
          if (seq !== searchSeq.current) return;
          setSuggestions([]);
        } finally {
          if (seq === searchSeq.current) setSearching(false);
        }
      }, 500),
    [projectId]
  );

  useEffect(() => {
    setQuery("");
    setSuggestions([]);
    setSearching(false);
    setSettledQuery(null);
    return () => {
      searchSeq.current++;
      searchUsers.cancel();
    };
  }, [open, searchUsers]);

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
    if (!canShare) return;
    searchSeq.current++;
    searchUsers.cancel();
    setSearching(false);
    setSettledQuery(null);
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
      if (body.code === "COLLABORATIVE_PROJECT_LIMIT") setCollaboration(body.collaboration);
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
        : query.trim() && settledQuery === query.trim() && !searching && suggestions.length === 0
          ? query.includes("@")
            ? "No user found with that email."
            : "Enter their full email address."
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
          {canManage && collaboration && !collaboration.canShare && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4" role="status">
              <p className="text-sm font-medium">Collaborative project limit reached</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {canGrantManager ? "You've" : "The project owner has"} reached the limit of {collaboration.limit} collaborative projects ({collaboration.used} shared).
                {" "}{canGrantManager ? "Upgrade your plan to share this project with people." : "Ask the owner to upgrade their plan to share this project with people."}
              </p>
              <Button asChild className="w-full">
                <a href={collaboration.upgradeUrl} target="_blank" rel="noopener noreferrer">Upgrade plan</a>
              </Button>
            </div>
          )}
          {canShare && (
            <div className="flex flex-col gap-3">
              <div className="relative" ref={searchWrapperRef}>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Add people by their email"
                  className="pl-10"
                  value={query}
                  disabled={!canShare}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuery(v);
                    setSuggestOpen(true);
                    setSettledQuery(null);
                    setSuggestions([]);
                    setSearching(!!v.trim());
                    const seq = ++searchSeq.current;
                    searchUsers.cancel();
                    if (v.trim()) searchUsers(v.trim(), seq);
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
                showDescriptions
              />
              <Button className="w-full justify-center gap-2" disabled={copying} onClick={() => void copyShareLink()}>
                {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : copiedRole === newUserRole ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                {copiedRole === newUserRole ? "Link copied" : `Copy ${SHARE_ACCESS_LABELS[newUserRole]} share link`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Anyone with this link can sign in to join. Links expire after 30 days.</p>

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
          {canManage && <div className="space-y-4">
            <div className="relative flex h-5 items-center justify-center text-xs text-muted-foreground">
              <Separator className="absolute inset-x-0 top-1/2" />
              <span className="relative bg-card px-2">or</span>
            </div>
            <Button variant="outline" className="w-full gap-2" disabled={preparingTemplate || !templateSource} onClick={() => void shareAsTemplate()}>
              {preparingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
              {preparingTemplate ? "Preparing template…" : "Share as template in the Asset Library"}
            </Button>
            {templateUrl && <a href={templateUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm underline">Open template in the Asset Library</a>}
          </div>}
          {shareError && <p role="alert" className="text-xs text-red-500">{shareError}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareModal;
