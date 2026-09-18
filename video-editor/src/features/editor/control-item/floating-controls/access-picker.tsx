import React, { useState } from "react";
import { X, Search, ChevronDown, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import useLayoutStore from "../../store/use-layout-store";

type AccessRole = "Editor" | "Commenter" | "Viewer";

interface AccessUser {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
}

interface OwnerUser {
  name: string;
  email: string;
}

// Hardcoded for now — no wiring to real project membership yet.
const OWNER: OwnerUser = {
  name: "You",
  email: "you@example.com"
};

const INITIAL_USERS: AccessUser[] = [
  { id: "u1", name: "Alex Rivera", email: "alex.rivera@example.com", role: "Editor" },
  { id: "u2", name: "Jordan Lee", email: "jordan.lee@example.com", role: "Commenter" },
  { id: "u3", name: "Sam Patel", email: "sam.patel@example.com", role: "Viewer" }
];

const SUGGESTED_CONTACTS: { name: string; email: string }[] = [
  { name: "Taylor Kim", email: "taylor.kim@example.com" },
  { name: "Morgan Diaz", email: "morgan.diaz@example.com" },
  { name: "Casey Nguyen", email: "casey.nguyen@example.com" },
  { name: "Riley Brooks", email: "riley.brooks@example.com" }
];

const ROLE_OPTIONS: AccessRole[] = ["Editor", "Commenter", "Viewer"];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const RoleSelectPopover = ({
                             value,
                             onChange
                           }: {
  value: AccessRole;
  onChange: (v: AccessRole) => void;
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
            <p className="truncate">{value}</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[300] p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        {ROLE_OPTIONS.map((option) => (
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
      </PopoverContent>
    </Popover>
  );
};

const UserRow = ({
                   name,
                   email,
                   role,
                   onRoleChange
                 }: {
  name: string;
  email: string;
  role: AccessRole | "Owner";
  onRoleChange?: (role: AccessRole) => void;
}) => {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200">
        {getInitials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-200">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      {role === "Owner" ? (
        <span className="shrink-0 pr-1 text-xs text-muted-foreground">Owner</span>
      ) : (
        <div className="w-24 shrink-0">
          <RoleSelectPopover value={role} onChange={(v) => onRoleChange?.(v)} />
        </div>
      )}
    </div>
  );
};

export default function AccessPicker() {
  const { setFloatingControl } = useLayoutStore();

  // Hardcoded for now — no wiring to real project membership yet.
  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState<AccessRole>("Viewer");
  const [users, setUsers] = useState<AccessUser[]>(INITIAL_USERS);

  const filteredSuggestions = SUGGESTED_CONTACTS.filter((contact) => {
    const alreadyAdded = users.some((u) => u.email === contact.email);
    if (alreadyAdded) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      contact.name.toLowerCase().includes(q) ||
      contact.email.toLowerCase().includes(q)
    );
  });

  const addUser = (contact: { name: string; email: string }) => {
    setUsers((prev) => [
      ...prev,
      { id: contact.email, name: contact.name, email: contact.email, role: newUserRole }
    ]);
    setQuery("");
    setSuggestOpen(false);
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !query.trim()) return;
    addUser({ name: query.trim(), email: query.trim() });
  };

  const updateUserRole = (id: string, role: AccessRole) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <div className="w-xs bg-card border flex flex-col rounded-lg">
      {/* Header */}
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-semibold">People with access</p>
        <X
          className="h-4 w-4 cursor-pointer text-muted-foreground"
          onClick={() => setFloatingControl("")}
        />
      </div>

      {/* Add people */}
      <div className="px-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Popover open={suggestOpen && filteredSuggestions.length > 0} onOpenChange={setSuggestOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Add people by name or email"
                  className="pl-7"
                  value={query}
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
              <ScrollArea className="max-h-[200px]">
                {filteredSuggestions.map((contact) => (
                  <div
                    key={contact.email}
                    onClick={() => addUser(contact)}
                    className="cursor-pointer px-3 py-2 hover:bg-zinc-800/50"
                  >
                    <p className="truncate text-sm text-zinc-200">{contact.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                  </div>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-1/2 shrink-0">
          <RoleSelectPopover value={newUserRole} onChange={setNewUserRole} />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="max-h-[300px] w-full px-4 mt-3 mb-4">
        <UserRow name={OWNER.name} email={OWNER.email} role="Owner" />
        {users.map((u) => (
          <UserRow
            key={u.id}
            name={u.name}
            email={u.email}
            role={u.role}
            onRoleChange={(role) => updateUserRole(u.id, role)}
          />
        ))}
      </ScrollArea>
    </div>
  );
}