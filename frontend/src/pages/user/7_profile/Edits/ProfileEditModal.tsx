import React, { useState, useEffect, useRef } from "react";
import { X, Check, Search, MapPin, AlertCircle } from "lucide-react";
import api from "@/lib/axios.ts";
import { toast } from "react-hot-toast";

interface UserDetail {
  username: string;
  name: string;
  birthdate?: string;
  role?: any;
  roles?: string[];
  email_address: string;
  address: string;
  bio: string;
  tagline: string;
  country?: string;
  zipCode?: string;
  skills?: any[];
  social_links?: any[];
  avatar_file_id: number | null;
  avatar_preset_url?: string;
  joinedDate?: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UserDetail;
  onSave: (updatedData: UserDetail) => void;
}

type Place = {
  id: string;
  label: string;
  street_line_1: string;
  city: string;
  province_state: string;
  postal_code: string;
};

export default function ProfileEditModal({ 
  isOpen, 
  onClose, 
  data, 
  onSave
}: ProfileEditModalProps) {
  const [formData, setFormData] = useState<UserDetail & { firstName?: string; middleName?: string; lastName?: string; birthMonth?: string; birthDay?: string; birthYear?: string }>({
    username: "",
    name: "",
    firstName: "",
    middleName: "",
    lastName: "",
    birthdate: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    role: "Freelancer",
    roles: [],
    email_address: "",
    address: "",
    bio: "",
    tagline: "",
    country: "",
    zipCode: "",
    skills: [],
    social_links: [],
    avatar_file_id: null,
    avatar_preset_url: "",
    joinedDate: ""
  });
  
  const [originalFormData, setOriginalFormData] = useState<UserDetail>({
    username: "",
    name: "",
    birthdate: "",
    role: "Freelancer",
    roles: [],
    email_address: "",
    address: "",
    bio: "",
    tagline: "",
    country: "",
    zipCode: "",
    skills: [],
    social_links: [],
    avatar_file_id: null,
    avatar_preset_url: "",
    joinedDate: ""
  });
  
  const [places, setPlaces] = useState<Place[]>([]);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressStatus, setAddressStatus] = useState<"idle" | "typing" | "selected" | "manual">("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Reset form data when modal opens
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
        mName = nameParts.slice(1, -1).join(" ");
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

      const safeData = {
        username: data.username || "",
        name: data.name || "",
        firstName: fName,
        middleName: data.middleName || mName,
        lastName: lName,
        birthdate: data.birthdate || "",
        birthMonth: bMonth,
        birthDay: bDay,
        birthYear: bYear,
        role: data.role || "Freelancer",
        roles: Array.isArray(data.role) ? data.role.map((r: any) => r.role_name) : (data.roles || []),
        email_address: data.email_address || "",
        joinedDate: data.joinedDate || "",
        address: data.location || data.address || "",
        bio: data.bio || "",
        tagline: data.tagline || "",
        country: data.country || "",
        zipCode: data.zipCode || "",
        skills: data.skills || [],
        avatar_file_id: data.avatar_file_id || null,
        avatar_preset_url: data.avatar_preset_url || "",
        social_links: data.social_links || []
      };
      
      setFormData(safeData as any);
      setOriginalFormData(safeData);
      setIsInitialized(true);
      
      // Check if address exists and is from previous selection
      if (safeData.address) {
        setIsAddressSelected(true);
        setAddressStatus("selected");
      } else {
        setIsAddressSelected(false);
        setAddressStatus("idle");
      }
    } else {
      setIsInitialized(false);
    }
  }, [isOpen, data]);

  // Fetch places for address autocomplete
  useEffect(() => {
    if (!isOpen || !isInitialized) return;
    if (!formData.address || !formData.address.trim()) {
      setPlaces([]);
      setShowSuggestions(false);
      return;
    }
    
    // If address was selected from suggestions or pre-filled, don't fetch new ones
    if (isAddressSelected) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    setAddressStatus("typing");
    
    const timeout = setTimeout(async () => {
      try {
        const response = await api.get("/api/cashouts/address-suggestions", {
          params: { q: formData.address }
        });
        const suggestions = response.data.addresses || [];
        setPlaces(suggestions);
        if (suggestions.length === 0) {
          setAddressStatus("manual");
        }
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [formData.address, isOpen, isAddressSelected, isInitialized]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If user is typing in address field
    if (name === "address") {
      setIsAddressSelected(false);
      setAddressStatus("typing");
      setShowSuggestions(true);
      setFormData((prev) => ({ 
        ...prev, 
        address: value
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleToggle = (roleName: string) => {
    setFormData(prev => {
      const currentRoles = prev.roles || [];
      if (currentRoles.includes(roleName)) {
        return { ...prev, roles: currentRoles.filter(r => r !== roleName) };
      } else {
        return { ...prev, roles: [...currentRoles, roleName] };
      }
    });
  };

  const handleCountrySelect = (country: string) => {
    setFormData(prev => ({ ...prev, country }));
  };

  const handlePlaceSelect = (place: Place) => {
    const updatedData = {
      ...formData,
      address: place.label,
      country: "Philippines",
      zipCode: place.postal_code
    };
    
    setFormData(updatedData);
    
    setIsAddressSelected(true);
    setAddressStatus("selected");
    setPlaces([]);
    setShowSuggestions(false);
    
    // Focus back on input to show the selected value
    if (addressInputRef.current) {
      addressInputRef.current.focus();
    }
  };

  const handleAddressBlur = () => {
    // Hide suggestions after a delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      // If address has content but wasn't selected, mark as manual
      if (formData.address && !isAddressSelected) {
        setAddressStatus("manual");
      }
    }, 200);
  };

  const handleAddressFocus = () => {
    if (formData.address?.trim()) {
      if (!isAddressSelected) {
        setShowSuggestions(true);
        setAddressStatus("typing");
      } else {
        // If already selected, show indicator but not suggestions
        setAddressStatus("selected");
      }
    }
  };

  const handleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Prepare the payload with the correct structure
      // Your backend expects: { original: {...}, updates: {...} }
      const newDisplayName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
      const newBirthDate = (formData.birthYear && formData.birthMonth && formData.birthDay) 
        ? `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}` 
        : "";

      const original = {
        display_name: originalFormData.name || "",
        birth_date: originalFormData.birthdate || "",
        address: originalFormData.address || "",
        country: originalFormData.country || "",
        zip_code: originalFormData.zipCode || "",
        description: originalFormData.bio || "",
        tagline: originalFormData.tagline || "",
        roles: originalFormData.roles || []
      };
      
      const updates = {
        display_name: newDisplayName || "",
        birth_date: newBirthDate || "",
        address: formData.address || "",
        country: formData.country || "",
        zip_code: formData.zipCode || "",
        description: formData.bio || "",
        tagline: formData.tagline || "",
        roles: formData.roles || []
      };
      
      console.log("📊 Original:", JSON.stringify(original, null, 2));
      console.log("📊 Updates:", JSON.stringify(updates, null, 2));
      
      // Call the API with the correct payload structure
      const response = await api.put('/api/accounts/update-profile-details', {
        original: original,
        updates: updates
      });
      
      console.log("📊 API Response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        toast.success("Profile updated successfully");
        
        // Create updated data with all fields
        const updatedData: UserDetail = {
          ...formData,
          name: formData.name || "",
          birthdate: formData.birthdate || "",
          address: formData.address || "",
          country: formData.country || "",
          zipCode: formData.zipCode || "",
          bio: formData.bio || "",
          tagline: formData.tagline || "",
          joinedDate: formData.joinedDate || "",
        };
        
        // Pass the updated data to parent
        onSave(updatedData);
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Plus Jakarta Sans',sans-serif]">
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#080a12] p-6 shadow-2xl text-gray-900 dark:text-white transition-all duration-300 max-h-[90vh] overflow-y-auto">

        <button 
          onClick={onClose} 
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight mb-5">Edit Profile</h2>

        <div className="space-y-4">
          {/* Row 1: Username and Email (Locked) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Username</label>
              <input 
                type="text" 
                value={formData.username || ""} 
                readOnly
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-2 text-[13px] text-gray-500 dark:text-zinc-400 outline-none cursor-not-allowed" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Email</label>
              <input 
                type="email" 
                value={formData.email_address || ""} 
                readOnly
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-2 text-[13px] text-gray-500 dark:text-zinc-400 outline-none cursor-not-allowed" 
              />
            </div>
          </div>

          {/* Row 2: First Name, Middle Name, Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">First Name</label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName || ""} 
                onChange={handleInputChange} 
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Middle Name</label>
              <input 
                type="text" 
                name="middleName" 
                value={formData.middleName || ""} 
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
                value={formData.lastName || ""} 
                onChange={handleInputChange} 
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50" 
              />
            </div>
          </div>

          {/* Row 3: Birthdate (Dropdowns) */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Birthdate</label>
            <div className="grid grid-cols-3 gap-3">
              <select 
                name="birthMonth" 
                value={formData.birthMonth || ""} 
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
                value={formData.birthDay || ""} 
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
                value={formData.birthYear || ""} 
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

          {/* Row 3.5: Account Tags */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Account Tags</label>
            <div className="flex flex-wrap gap-2">
              {["Client", "Freelancer", "Casual"].map((roleName) => {
                const isSelected = (formData.roles || []).includes(roleName);
                return (
                  <button
                    key={roleName}
                    type="button"
                    onClick={() => handleRoleToggle(roleName)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                        : "bg-white dark:bg-white/5 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10"
                    }`}
                  >
                    {roleName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Address with Autocomplete - Pre-filled with existing address */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Street Address</label>
            
            <div className="relative">
              <input 
                ref={addressInputRef}
                type="text" 
                name="address" 
                value={formData.address || ""} 
                onChange={handleInputChange}
                onFocus={handleAddressFocus}
                onBlur={handleAddressBlur}
                disabled={isLoading}
                className={`w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none transition disabled:opacity-50 ${
                  addressStatus === "selected" 
                    ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5 pr-12 text-emerald-900 dark:text-white" 
                    : addressStatus === "manual"
                    ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-500/5 pr-12 text-yellow-900 dark:text-white"
                    : "border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 focus:border-blue-500/50"
                }`}
                placeholder="Start typing your address..."
              />
              
              {/* Address Status Indicator */}
              {formData.address && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {addressStatus === "selected" ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="h-4 w-4" />
                      <span className="text-[10px] font-medium">Verified</span>
                    </div>
                  ) : addressStatus === "manual" ? (
                    <div className="flex items-center gap-1.5 text-yellow-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[10px] font-medium">Manual</span>
                    </div>
                  ) : addressStatus === "typing" ? (
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <Search className="h-4 w-4 animate-pulse" />
                      <span className="text-[10px] font-medium">Searching...</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Address Status Message */}
            {formData.address && (
              <div className="mt-1.5 flex items-center gap-1.5">
                {addressStatus === "selected" ? (
                  <>
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">
                      ✓ Address verified • Country & ZIP auto-filled
                    </span>
                  </>
                ) : addressStatus === "manual" ? (
                  <>
                    <AlertCircle className="h-3 w-3 text-yellow-400" />
                    <span className="text-[10px] text-yellow-400">
                      ⚠️ Manual entry - Country & ZIP not auto-filled
                    </span>
                  </>
                ) : addressStatus === "typing" ? (
                  <>
                    <Search className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-zinc-400">
                      Type to search or select from suggestions below
                    </span>
                  </>
                ) : null}
              </div>
            )}

            {/* Places Autocomplete Dropdown */}
            {showSuggestions && places.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#13151f] border border-gray-200 dark:border-white/10 rounded-lg max-h-60 overflow-y-auto shadow-xl">
                <div className="sticky top-0 bg-gray-50 dark:bg-[#13151f] px-3 py-1.5 border-b border-gray-200 dark:border-white/5">
                  <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium uppercase tracking-wider">
                    Select location to auto-fill country & ZIP
                  </span>
                </div>
                {places.map((place) => (
                  <div
                    key={place.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handlePlaceSelect(place);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 group transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {place.street_line_1 || place.label}
                        {place.city && (
                          <span className="text-xs text-zinc-400 ml-1">
                            ({place.city})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {place.postal_code && (
                          <span className="ml-1 bg-white/5 px-2 py-0.5 rounded">
                            {place.postal_code}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {place.province_state} • Philippines
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {showSuggestions && formData.address?.trim() && places.length === 0 && addressStatus === "manual" && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#13151f] border border-yellow-500/20 rounded-lg p-3 shadow-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] text-gray-900 dark:text-zinc-300 font-medium">No locations found</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">
                      You can still save this address manually, but country and ZIP code won't be auto-filled.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Tagline</label>
            <input
              type="text"
              name="tagline"
              value={formData.tagline || ""}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none transition disabled:opacity-50"
              placeholder="e.g., Full-Stack Developer | UI/UX Designer"
            />
          </div>

          {/* Bio / About Me */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400 mb-1">Bio / About Me</label>
            <textarea
              name="bio"
              value={formData.bio || ""}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={4}
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[13px] focus:border-blue-500/50 outline-none resize-none leading-relaxed disabled:opacity-50"
              placeholder="Tell the community about yourself (max 120 characters)..."
            />
            <div className="text-right text-[10px] text-gray-500 dark:text-zinc-500 mt-1">
              {(formData.bio || "").length}/120
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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
