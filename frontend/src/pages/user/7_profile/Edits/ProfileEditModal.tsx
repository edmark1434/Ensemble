import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import api from "@/lib/axios.ts";
import { toast } from "react-hot-toast";

interface UserDetail {
  username: string;
  name: string;
  middleName?: string;
  suffix?: string;
  birthdate?: string;
  email_address: string;
  bio: string;
  // Other fields exist but aren't edited here, just passed along if needed.
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UserDetail;
  onSave: (updatedData: any) => void;
  highlightField?: string;
}

export default function ProfileEditModal({ 
  isOpen, 
  onClose, 
  data, 
  onSave,
  highlightField
}: ProfileEditModalProps) {
  const [formData, setFormData] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    birthMonth: string;
    birthDay: string;
    birthYear: string;
    bio: string;
  }>({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    bio: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && data) {
      const nameParts = (data.name || "").split(" ");
      let fName = "", mName = "", lName = "";
      if (nameParts.length === 1) {
        fName = nameParts[0];
      } else if (nameParts.length === 2) {
        fName = nameParts[0];
        lName = nameParts[1];
      } else if (nameParts.length > 2) {
        fName = nameParts[0];
        lName = nameParts[nameParts.length - 1];
        // Note: the backend uses display_name, but also there is middleName/suffix
        // If they exist in data we use those instead of guessing from nameParts
      }

      let bMonth = "", bDay = "", bYear = "";
      if (data.birthdate) {
        const d = new Date(data.birthdate);
        if (!isNaN(d.getTime())) {
          bMonth = String(d.getMonth() + 1);
          bDay = String(d.getDate());
          bYear = String(d.getFullYear());
        }
      }

      setFormData({
        firstName: fName,
        middleName: data.middleName || mName,
        lastName: lName,
        suffix: data.suffix || "",
        birthMonth: bMonth,
        birthDay: bDay,
        birthYear: bYear,
        bio: data.bio || "",
      });
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const newDisplayName = [formData.firstName, formData.lastName].filter(Boolean).join(" ");
      const newBirthDate = (formData.birthYear && formData.birthMonth && formData.birthDay)
        ? `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`
        : "";

      const original = {
        display_name: data.name || "",
        middleName: data.middleName || "",
        suffix: data.suffix || "",
        birth_date: data.birthdate || "",
        description: data.bio || "",
      };

      const updates = {
        display_name: newDisplayName || "",
        middleName: formData.middleName || "",
        suffix: formData.suffix || "",
        birth_date: newBirthDate || "",
        description: formData.bio || "",
      };

      const response = await api.put('/api/accounts/update-profile-details', {
        original: original,
        updates: updates
      });

      if (response.data.success) {
        toast.success("Profile updated successfully");
        const updatedData = {
          ...data,
          name: newDisplayName,
          middleName: formData.middleName,
          suffix: formData.suffix,
          birthdate: newBirthDate,
          bio: formData.bio,
        };
        onSave(updatedData);
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate age
  let calculatedAge = "";
  if (formData.birthYear && formData.birthMonth && formData.birthDay) {
    const bDate = new Date(Number(formData.birthYear), Number(formData.birthMonth) - 1, Number(formData.birthDay));
    if (!isNaN(bDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - bDate.getFullYear();
      const m = today.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
        age--;
      }
      calculatedAge = age.toString();
    }
  }

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Plus Jakarta Sans',sans-serif]">
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-6 shadow-2xl text-gray-900 dark:text-white transition-all duration-300 max-h-[90vh] overflow-y-auto">

        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight mb-5">Edit Profile</h2>

        <div className="space-y-4">
          {/* Read-only Account Info */}
          <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Account Credentials</span>
              <span className="text-[10px] bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full text-gray-600 dark:text-zinc-400">Locked 🔒</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-zinc-500 mb-1">Username</label>
                <div className="text-[13px] text-gray-700 dark:text-zinc-400 select-none">@{data.username}</div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-zinc-500 mb-1">Email</label>
                <div className="text-[13px] text-gray-700 dark:text-zinc-400 select-none flex items-center gap-2">
                  {data.email_address}
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-3 pt-2 border-t border-gray-200 dark:border-white/10">To change these details, please visit your Account Settings.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Suffix <span className="text-gray-400 font-normal">(e.g., Jr., III)</span></label>
              <input
                type="text"
                name="suffix"
                value={formData.suffix}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">Birthdate</label>
              {calculatedAge && (
                <span className="text-[11px] font-medium text-blue-500 dark:text-blue-400">Calculated Age: {calculatedAge}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select
                name="birthMonth"
                value={formData.birthMonth}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50 appearance-none"
              >
                <option value="">Month</option>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                name="birthDay"
                value={formData.birthDay}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50 appearance-none"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                name="birthYear"
                value={formData.birthYear}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50 appearance-none"
              >
                <option value="">Year</option>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Bio / About Me</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={4}
              maxLength={120}
              ref={(el) => { if (el && highlightField === "bio") { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); } }}
              className={`w-full rounded-lg border bg-white dark:bg-white/5 px-3 py-2 text-[13px] outline-none resize-none leading-relaxed disabled:opacity-50 transition ${
                highlightField === "bio" 
                  ? "border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-400/20" 
                  : "border-gray-300 dark:border-white/10 focus:border-blue-500/50"
              }`}
              placeholder="Tell the community about yourself (max 120 characters)..."
            />
            <div className="text-right text-[10px] text-gray-500 dark:text-zinc-500 mt-1">
              {(formData.bio || "").length}/120
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-200 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-zinc-400 text-xs font-semibold rounded-lg hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                Save Changes <Check className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}