// src/components/modals/EditTeamPermissionModal.tsx
import { useState, useEffect } from "react";
import { X, Plus, Save, Crown, AlertTriangle } from "lucide-react";

interface Member {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isDefault?: boolean;
}

interface EditTeamPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSave: (members: Member[], roles: Role[]) => void;
}

const defaultPermissions = [
  { id: "post_job", label: "Can Post a Job" },
  { id: "post_gig", label: "Can Post a Gig" },
  { id: "post_asset", label: "Can Post an Asset" },
  { id: "edit_team", label: "Permission to Edit Team" },
  { id: "modify_permissions", label: "Permission to Modify Permissions" },
  { id: "remove_member", label: "Permission to Remove Member on Team" },
  { id: "manage_join_requests", label: "Can Accept / Reject Join Request" },
];

const defaultRoles: Role[] = [
  { id: "owner", name: "Owner", permissions: defaultPermissions.map(p => p.id), isDefault: true },
  { id: "admin", name: "Admin", permissions: ["post_job", "post_gig", "post_asset", "edit_team", "manage_join_requests"], isDefault: true },
  { id: "member", name: "Member", permissions: ["post_job", "post_gig", "post_asset"], isDefault: true },
];

const EditTeamPermissionModal: React.FC<EditTeamPermissionModalProps> = ({
  isOpen,
  onClose,
  members: initialMembers,
  onSave,
}) => {
  const [members, setMembers] = useState(initialMembers);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setMembers(initialMembers);
      setRoles(defaultRoles);
      setSelectedMemberId(null);
      setHasChanges(false);
    }
  }, [isOpen, initialMembers]);

  if (!isOpen) return null;

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const selectedRole = selectedMember ? roles.find(r => r.name === selectedMember.role) : null;

  const handleMemberSelect = (memberId: number) => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    setSelectedMemberId(memberId);
  };

  const handleRoleChange = (roleName: string) => {
    if (selectedMemberId) {
      setMembers(prev => prev.map(m =>
        m.id === selectedMemberId ? { ...m, role: roleName } : m
      ));
      setHasChanges(true);
    }
  };

  const handleAddRole = () => {
    if (newRoleName.trim()) {
      const newRole: Role = {
        id: Date.now().toString(),
        name: newRoleName,
        permissions: [],
      };
      setRoles([...roles, newRole]);
      setNewRoleName("");
      setHasChanges(true);
    }
  };

  // const handleDeleteRole = (roleId: string) => {
  //   if (roleId === "owner") return;
  //   setRoles(roles.filter(r => r.id !== roleId));
  //   setMembers(prev => prev.map(m =>
  //     m.role === roles.find(r => r.id === roleId)?.name ? { ...m, role: "Member" } : m
  //   ));
  //   setHasChanges(true);
  // };

  const handleTogglePermission = (permissionId: string) => {
    if (selectedRole && selectedRole.name !== "Owner" && selectedMemberId) {
      const newPermissions = selectedRole.permissions.includes(permissionId)
        ? selectedRole.permissions.filter(p => p !== permissionId)
        : [...selectedRole.permissions, permissionId];

      setRoles(prev => prev.map(role =>
        role.id === selectedRole.id ? { ...role, permissions: newPermissions } : role
      ));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    onSave(members, roles);
    setHasChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    setHasChanges(false);
    onClose();
  };

  // const getPermissionLabel = (permissionId: string) => {
  //   return defaultPermissions.find(p => p.id === permissionId)?.label || permissionId;
  // };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal overflow-y-auto py-8">
        <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#0d0f1a] pb-2">
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Edit Member Permissions
            </h3>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Members List */}
            <div className="border-r border-white/10 pr-4">
              <h4 className="text-sm font-semibold text-white mb-3">Team Members</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => handleMemberSelect(member.id)}
                    className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                      selectedMemberId === member.id
                        ? "bg-blue-500/20 border border-blue-500/50"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <img src={member.avatar} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{member.name}</p>
                      <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                    </div>
                    {member.role === "Owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Role Assignment */}
            <div className="border-r border-white/10 pr-4">
              <h4 className="text-sm font-semibold text-white mb-3">Role</h4>
              {selectedMember ? (
                <div>
                  {selectedMember.role === "Owner" ? (
                    <div className="rounded-lg bg-yellow-500/10 p-4 text-center">
                      <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm text-white">Owner Role</p>
                      <p className="text-xs text-zinc-400 mt-1">Owners have all permissions and cannot be modified</p>
                    </div>
                  ) : (
                    <select
                      value={selectedMember.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-[#1a1f2e] px-4 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.name} className="bg-[#1a1f2e] text-white">
                          {role.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-white/5 p-8 text-center">
                  <p className="text-sm text-zinc-400">Select a member to change their role</p>
                </div>
              )}
            </div>

            {/* Column 3: Permissions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white">Permissions</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="New role name"
                    className="rounded-lg border border-white/20 bg-[#1a1f2e] px-3 py-1 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none"
                  />
                  <button
                    onClick={handleAddRole}
                    className="rounded-lg bg-blue-500 p-1 text-white transition hover:bg-blue-600"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {selectedMember && selectedMember.role !== "Owner" && selectedRole ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  <div className="mb-3 pb-2 border-b border-white/10">
                    <p className="text-xs text-blue-400">Role: {selectedRole.name}</p>
                  </div>
                  {defaultPermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedRole.permissions.includes(permission.id)}
                        onChange={() => handleTogglePermission(permission.id)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-xs text-zinc-400">{permission.label}</span>
                    </label>
                  ))}
                </div>
              ) : selectedMember?.role === "Owner" ? (
                <div className="rounded-lg bg-white/5 p-8 text-center">
                  <p className="text-sm text-zinc-400">Owners have all permissions</p>
                </div>
              ) : (
                <div className="rounded-lg bg-white/5 p-8 text-center">
                  <p className="text-sm text-zinc-400">Select a member to view permissions</p>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:scale-105"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Unsaved Changes
              </h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmClose}
                className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
              >
                Discard Changes
              </button>
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditTeamPermissionModal;