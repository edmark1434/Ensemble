// src/pages/user/4_forums/forum_modals/EditGroupPermissionsModal.tsx
import { useState, useEffect } from "react";
import { X, Save, Crown, Shield, User, AlertTriangle } from "lucide-react";

interface Member {
  id: number;
  name: string;
  role: string;
  avatar: string;
  permissions?: string[];
}

interface EditGroupPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSave: (members: Member[]) => void;
}

// Predefined roles with their permissions
const roles = [
  {
    id: "owner",
    name: "Owner",
    icon: <Crown className="h-4 w-4 text-yellow-500" />,
    description: "Full control over the group",
    permissions: ["edit_group", "edit_permissions", "remove_member"],
    canEdit: false,
  },
  {
    id: "moderator",
    name: "Moderator",
    icon: <Shield className="h-4 w-4 text-blue-400" />,
    description: "Can manage members and content",
    permissions: ["remove_member"],
    canEdit: true,
  },
  {
    id: "member",
    name: "Member",
    icon: <User className="h-4 w-4 text-zinc-400" />,
    description: "Regular group member",
    permissions: [],
    canEdit: true,
  },
];

const permissionLabels = {
  edit_group: "Can Edit Group",
  edit_permissions: "Can Edit Permissions",
  remove_member: "Can Remove Members",
};

const EditGroupPermissionsModal: React.FC<EditGroupPermissionsModalProps> = ({
  isOpen,
  onClose,
  members: initialMembers,
  onSave,
}) => {
  const [members, setMembers] = useState(initialMembers);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setMembers(initialMembers);
      setSelectedMemberId(null);
      setHasChanges(false);
    }
  }, [isOpen, initialMembers]);

  if (!isOpen) return null;

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const selectedRole = roles.find(r => r.name.toLowerCase() === selectedMember?.role?.toLowerCase());

  const handleMemberSelect = (memberId: number) => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    setSelectedMemberId(memberId);
  };

  const handleRoleChange = (roleName: string) => {
    if (!selectedMember || selectedMember.role === "owner") return;

    setMembers(prev => prev.map(m =>
      m.id === selectedMember.id ? { ...m, role: roleName } : m
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(members);
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal overflow-y-auto py-8">
        <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#0d0f1a] pb-2">
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Edit Member Roles
            </h3>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-zinc-400 mb-4">
            Assign roles to group members. Each role has preset permissions.
          </p>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Members List */}
            <div className="border-r border-white/10 pr-4">
              <h4 className="text-sm font-semibold text-white mb-3">Group Members</h4>
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
                      <div className="flex items-center gap-1">
                        {member.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                        {member.role === "moderator" && <Shield className="h-3 w-3 text-blue-400" />}
                        {member.role === "member" && <User className="h-3 w-3 text-zinc-400" />}
                        <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Role Assignment & Permissions */}
            <div>
              {selectedMember ? (
                <>
                  {/* Role Selection */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Assign Role</h4>
                    {selectedMember.role === "owner" ? (
                      <div className="rounded-lg bg-yellow-500/10 p-4 text-center">
                        <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-sm text-white">Owner Role</p>
                        <p className="text-xs text-zinc-400 mt-1">Owners have all permissions and cannot be changed</p>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        {roles.filter(r => r.name !== "Owner").map((role) => (
                          <button
                            key={role.id}
                            onClick={() => handleRoleChange(role.name)}
                            className={`flex-1 rounded-lg border p-3 text-center transition-all duration-200 ${
                              selectedMember.role === role.name
                                ? "border-blue-500 bg-blue-500/20"
                                : "border-white/15 bg-white/5 hover:border-white/30"
                            }`}
                          >
                            <div className="flex justify-center mb-1">{role.icon}</div>
                            <p className="text-sm font-medium text-white">{role.name}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{role.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Permissions Display */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Permissions</h4>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      {selectedRole?.permissions.map((permission) => (
                        <div key={permission} className="flex items-center gap-2 py-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          <span className="text-xs text-zinc-300">{permissionLabels[permission as keyof typeof permissionLabels]}</span>
                        </div>
                      ))}
                      {selectedRole?.permissions.length === 0 && (
                        <p className="text-xs text-zinc-500">No special permissions</p>
                      )}
                      {selectedMember.role === "owner" && (
                        <>
                          <div className="flex items-center gap-2 py-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                            <span className="text-xs text-zinc-300">Can Edit Group</span>
                          </div>
                          <div className="flex items-center gap-2 py-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                            <span className="text-xs text-zinc-300">Can Edit Permissions</span>
                          </div>
                          <div className="flex items-center gap-2 py-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                            <span className="text-xs text-zinc-300">Can Remove Members</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-white/5 p-8 text-center">
                  <p className="text-sm text-zinc-400">Select a member to manage their role</p>
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

export default EditGroupPermissionsModal;