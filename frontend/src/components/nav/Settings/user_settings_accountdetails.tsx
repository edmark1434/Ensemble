import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Calendar, Mail, MapPin, Camera, Lock, Save, ShieldCheck } from "lucide-react";

interface AccountDetailsProps {
  fullName: string;
  birthdate: string;
  username: string;
  setUsername: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  avatarUrl: string | null;
  onSave: (e: React.FormEvent) => void;
  onOpenEditModal: () => void;
  onOpenAvatarModal: () => void;
  initialValues: { username: string; address: string; email: string };
  setIsDirty: (isDirty: boolean) => void;
}

export const UserSettingsAccountDetails: React.FC<AccountDetailsProps> = ({
  fullName,
  birthdate,
  username,
  setUsername,
  address,
  setAddress,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  avatarUrl,
  onSave,
  onOpenAvatarModal,
  initialValues,
  setIsDirty,
}) => {
  const navigate = useNavigate();

  // Check if any editable field is modified
  React.useEffect(() => {
    const isChanged =
      username !== initialValues.username ||
      address !== initialValues.address ||
      email !== initialValues.email ||
      password !== "" ||
      confirmPassword !== "";

    setIsDirty(isChanged);
  }, [username, address, email, password, confirmPassword, initialValues, setIsDirty]);

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Account Details</h2>
        <p className="text-xs text-zinc-400 mt-1">Manage your identity and profile credentials.</p>
      </div>

      {/* Non-Changeable Information */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-amber-400" /> Fixed Account Info (Not Changeable)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-zinc-300">
              <User className="h-4 w-4 text-zinc-500" />
              {fullName}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Birthdate</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-zinc-300">
              <Calendar className="h-4 w-4 text-zinc-500" />
              {birthdate}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture & Verification Action */}
      <div className="flex items-center justify-between gap-4 py-2 flex-wrap border-b border-white/5 pb-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img
              src={avatarUrl || "https://i.pravatar.cc/150?u=user"}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 cursor-pointer"
              onClick={onOpenAvatarModal}
            />
            <button
              type="button"
              onClick={onOpenAvatarModal}
              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Profile Picture</p>
            <p className="text-xs text-zinc-400">Click on the avatar picture to update your avatar.</p>
          </div>
        </div>

        {/* View Verification Status Button */}
        <button
          type="button"
          onClick={() => navigate("/account-verification-status")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-semibold shadow-sm"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> View Verification Status
        </button>
      </div>

      {/* Editable Credentials */}
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Address / Location</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">New Password</label>
            <input
              type="password"
              placeholder="Leave blank to keep current"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 flex justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all shadow-lg hover:shadow-blue-500/20"
        >
          <Save className="h-4 w-4" /> Save Account Changes
        </button>
      </div>
    </form>
  );
};