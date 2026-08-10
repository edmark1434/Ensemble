import React, { useState, useEffect, useRef } from "react";
import { X, Check, Search, MapPin, AlertCircle } from "lucide-react";
import api from "@/lib/axios.ts";
import axios from "axios";
import { toast } from "react-hot-toast";

interface UserDetail {
  username: string;
  name: string;
  birthdate?: string;
  role: "Freelancer" | "Client" | "Freelancer & Client" | "Casual";
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
  properties: {
    osm_id: number;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

export default function ProfileEditModal({ 
  isOpen, 
  onClose, 
  data, 
  onSave
}: ProfileEditModalProps) {
  const [formData, setFormData] = useState<UserDetail>({
    username: "",
    name: "",
    birthdate: "",
    role: "Freelancer",
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
  const [countries, setCountries] = useState<string[]>([]);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressStatus, setAddressStatus] = useState<"idle" | "typing" | "selected" | "manual">("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Reset form data when modal opens
  useEffect(() => {
    if (isOpen && data) {
      const safeData = {
        username: data.username || "",
        name: data.name || "",
        birthdate: data.birthdate || "",
        role: data.role || "Freelancer",
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
      
      setFormData(safeData);
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

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/countries`);
        setCountries(response.data.countries || []);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);

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
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/places`, {
          params: { q: formData.address }
        });
        setPlaces(response.data.places || []);
        if (response.data.places?.length === 0) {
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

  const handlePlaceSelect = (place: Place) => {
    const formattedAddress = `${place.properties.name || ''}, ${place.properties.city ?? ''}, ${place.properties.state ?? ''}`.trim().replace(/,\s*$/, '');
    
    const updatedData = {
      ...formData,
      address: formattedAddress,
      country: place.properties.country || formData.country || "Philippines",
      zipCode: place.properties.postcode || formData.zipCode || ""
    };
    
    setFormData(updatedData);
    
    // CRITICAL FIX: Also update originalFormData to reflect the selected address
    // This ensures the original data matches the selected address data
    setOriginalFormData(prev => ({
      ...prev,
      address: formattedAddress,
      country: place.properties.country || prev.country || "Philippines",
      zipCode: place.properties.postcode || prev.zipCode || ""
    }));
    
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
      const original = {
        display_name: originalFormData.name || "",
        birth_date: originalFormData.birthdate || "",
        address: originalFormData.address || "",
        country: originalFormData.country || "",
        zip_code: originalFormData.zipCode || "",
        description: originalFormData.bio || "",
        tagline: originalFormData.tagline || ""
      };
      
      const updates = {
        display_name: formData.name || "",
        birth_date: formData.birthdate || "",
        address: formData.address || "",
        country: formData.country || "",
        zip_code: formData.zipCode || "",
        description: formData.bio || "",
        tagline: formData.tagline || ""
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Plus Jakarta Sans',sans-serif]">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#080a12] p-6 shadow-2xl text-white transition-all duration-300 max-h-[90vh] overflow-y-auto">

        <button 
          onClick={onClose} 
          disabled={isLoading}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white rounded-lg p-1.5 hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold tracking-tight mb-6">Edit Profile</h2>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name || ""} 
                onChange={handleInputChange} 
                disabled={isLoading}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition disabled:opacity-50" 
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email</label>
              <input 
                type="email" 
                name="email_address" 
                value={formData.email_address || ""} 
                onChange={handleInputChange} 
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition" 
                disabled
              />
            </div>
          </div>

          {/* Birthdate Field */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Birthdate</label>
            <input 
              type="date" 
              name="birthdate" 
              value={formData.birthdate ? formData.birthdate.split('T')[0] : ""} 
              onChange={handleInputChange} 
              disabled={isLoading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition disabled:opacity-50" 
            />
          </div>

          {/* Address with Autocomplete - Pre-filled with existing address */}
          <div className="relative">
            <label className="block text-xs text-zinc-400 mb-1">Street Address</label>
            
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
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition disabled:opacity-50 ${
                  addressStatus === "selected" 
                    ? "border-emerald-500/50 bg-emerald-500/5 pr-12" 
                    : addressStatus === "manual"
                    ? "border-yellow-500/50 bg-yellow-500/5 pr-12"
                    : "border-white/10 bg-white/5 focus:border-blue-500/50"
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
              <div className="absolute z-50 w-full mt-1 bg-[#13151f] border border-white/10 rounded-lg max-h-60 overflow-y-auto shadow-xl">
                <div className="sticky top-0 bg-[#13151f] px-3 py-1.5 border-b border-white/5">
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                    Select location to auto-fill country & ZIP
                  </span>
                </div>
                {places.map((place) => (
                  <div
                    key={place.properties.osm_id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handlePlaceSelect(place);
                    }}
                    className="px-3 py-2 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 group transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white group-hover:text-blue-400 transition-colors">
                        {place.properties.name || "Unnamed location"}
                        {place.properties.city && (
                          <span className="text-xs text-zinc-400 ml-1">
                            ({place.properties.city})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {place.properties.country && (
                          <span className="bg-white/5 px-2 py-0.5 rounded">
                            {place.properties.country}
                          </span>
                        )}
                        {place.properties.postcode && (
                          <span className="ml-1 bg-white/5 px-2 py-0.5 rounded">
                            {place.properties.postcode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {place.properties.state || ""}
                      {place.properties.state && place.properties.country && " • "}
                      {place.properties.country || ""}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {showSuggestions && formData.address?.trim() && places.length === 0 && addressStatus === "manual" && (
              <div className="absolute z-50 w-full mt-1 bg-[#13151f] border border-yellow-500/20 rounded-lg p-3 shadow-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-300">No locations found</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      You can still save this address manually, but country and ZIP code won't be auto-filled.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tagline</label>
            <input
              type="text"
              name="tagline"
              value={formData.tagline || ""}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition disabled:opacity-50"
              placeholder="e.g., Full-Stack Developer | UI/UX Designer"
            />
          </div>

          {/* Bio / About Me */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Bio / About Me</label>
            <textarea
              name="bio"
              value={formData.bio || ""}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={4}
              maxLength={120}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none resize-none leading-relaxed disabled:opacity-50"
              placeholder="Tell the community about yourself (max 120 characters)..."
            />
            <div className="text-right text-[10px] text-zinc-500 mt-1">
              {(formData.bio || "").length}/120
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 border-t border-white/10 pt-4">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isLoading}
            className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white transition disabled:opacity-50"
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