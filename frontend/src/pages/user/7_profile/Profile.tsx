import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import socket from "@/lib/socket";

// Modularized Profile Sub-Components
import { TopSection_ProfileDisplay } from "./Displays/TopSection_ProfileDisplay.tsx";
import { MeritSection_ProfileDisplay } from "./Displays/MeritSection_ProfileDisplay.tsx";
import { BadgeSideSection_ProfileDisplay } from "./Displays/BadgeSideSection_ProfileDisplay.tsx";
import { SkillsSideSection_ProfileDisplay } from "./Displays/SkillsSideSection_ProfileDisplay.tsx";
import { SocialLinksSection_ProfileDisplay } from "./Displays/SocialLinksSection_ProfileDisplay.tsx";
import { MainBody } from "./Displays/Body/MainBody.tsx";
import type { TabType } from "./Displays/Body/MainBody.tsx";

// Badges Registry & Type Infrastructure
import { badgesRegistry } from "@/pages/user/7_profile/Utilities/BadgesRegistry.ts";
import type { BadgeMetadata } from "./Displays/BadgeSideSection_ProfileDisplay.tsx";

// System Modals
import AvatarEditModal from "@/pages/user/7_profile/Edits/AvatarEditModal.tsx";
import ProfileEditModal from "@/pages/user/7_profile/Edits/ProfileEditModal.tsx";
import { BadgeEditModal } from "./Edits/BadgeEditModal.tsx";
import SkillsEditModal from "@/pages/user/7_profile/Edits/SkillsEditModal.tsx";

interface SkillObject {
  tag_id: number | string;
  name: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  years: number;
}

interface SocialLink {
  account_link_id?: number;
  platform: string;
  url: string;
}

interface UserDetail {
  username: string;
  name: string;
  middleName?: string;
  suffix?: string;
  birthdate?: string;
  country?: string;
  zipCode?: string;
  role: {
    role_id: number;
    role_name: "Freelancer" | "Client"| "Casual";
  }[];
  email_address: string;
  location: string;
  joinedDate: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  bio: string;
  tagline: string;
  merit_score: number;
  avatar_file_id: number | null;
  avatar_preset_url?: string;
  skills?: SkillObject[];
  badges?: BadgeMetadata[];
  social_links?: SocialLink[];
  subscriptionType?: "Free" | "Premium" | "Business";
}

const portfolioItems = [
  { id: 1, title: "Corporate Brand Identity", description: "Complete brand identity design for a tech startup", type: "image" as const, thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Brand+Identity", likes: 234, views: 1234 }
];

const services = [
  { id: 1, title: "Professional Logo Design", description: "Unique, modern logo design with 3 concepts and unlimited revisions", price: 499, deliveryTime: "3 days", rating: 4.9, orders: 127 }
];

// Helper function to construct avatar URL
const constructAvatarUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  
  // If it's already a full URL (starts with http), return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return path;
  
  // Remove leading slash from path if it exists, then add it back with cloudfront URL
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
};

// Preset interface
interface Preset {
  file_id: number;
  path: string;
  name: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("portfolio");
  const user = useGlobalState((state) => state.user);
  const id = useParams().id || user?.account_id;

  const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
  const [availableSkills, setAvailableSkills] = useState<{ tag_id: number; name: string }[]>([]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  
  // State for avatar upload
  const [avatarPresets, setAvatarPresets] = useState<Preset[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<Preset | null>(null);

  const isOwner = id == user?.account_id;

  // Upload file using pre-signed URL
  const uploadFile = async (file: File): Promise<string> => {
    try {
      // 1. Get pre-signed URL from server
      const response = await api.post("/api/files/upload-url", {
        folder: "profile",
        filename: file.name,
        contentType: file.type,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get upload URL');
      }

      let { uploadUrl, key, expiresIn, maxFileSize } = response.data;
      
      console.log('📤 Upload URL received:', {
        key,
        expiresIn: `${expiresIn} seconds`,
        maxFileSize: `${maxFileSize / 1024 / 1024}MB`
      });

      // 2. Upload directly to S3 using fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      let uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 3. If URL expired (403), get a new one and retry
      if (uploadResponse.status === 403) {
        console.log("⚠️ Upload URL expired, requesting new one...");
        
        const newResponse = await api.post("/api/files/upload-url", {
          folder: "profile",
          filename: file.name,
          contentType: file.type,
        });

        if (!newResponse.data.success) {
          throw new Error(newResponse.data.message || 'Failed to get new upload URL');
        }

        const { uploadUrl: newUploadUrl, key: newKey } = newResponse.data;

        // Retry the upload with new URL
        uploadResponse = await fetch(newUploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        key = newKey;
      }

      // 4. Check if upload succeeded
      if (!uploadResponse.ok) {
        // Handle specific S3 errors
        if (uploadResponse.status === 413) {
          throw new Error('File is too large. Maximum size is 5MB.');
        }
        if (uploadResponse.status === 415) {
          throw new Error('File type not supported.');
        }
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      console.log('✅ File uploaded successfully:', key);
      return key;

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      // Handle specific errors
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again.');
      }
      if (error.response?.status === 401) {
        throw new Error('Please log in to upload files.');
      }
      if (error.response?.status === 429) {
        throw new Error('Too many upload attempts. Please try again later.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid file or folder.');
      }
      
      throw new Error(error.message || 'Failed to upload image. Please try again.');
    }
  };

  // Fetch avatar presets - combines presets with current avatar
  const fetchAvatarPresets = async () => {
    try {
      // Fetch preset avatars
      const presetsResponse = await api.get("/api/files/profile-presets");
      const presetFiles = presetsResponse.data.files || [];
      
      // Fetch current user's avatar(s)
      const currentAvatarResponse = await api.get(`/api/accounts/profile/avatars/${id}`);
      let currentAvatarData = currentAvatarResponse.data.data || currentAvatarResponse.data;
      
      // Handle if the response is an array
      let currentAvatarItems = [];
      if (Array.isArray(currentAvatarData)) {
        currentAvatarItems = currentAvatarData;
      } else if (currentAvatarData && typeof currentAvatarData === 'object') {
        // If it's a single object, wrap it in an array
        currentAvatarItems = [currentAvatarData];
      }
      
      console.log("Fetched current avatar data:", currentAvatarItems);
      
      // Combine presets with current avatars
      let combinedPresets = [...presetFiles];
      
      // Process each current avatar item
      if (currentAvatarItems.length > 0) {
        for (const avatar of currentAvatarItems) {
          if (avatar && avatar.file_id) {
            // Check if the current avatar is already in the presets
            const existsInPresets = presetFiles.some((p: Preset) => p.file_id === avatar.file_id);
            
            if (!existsInPresets) {
              // Add current avatar to the list
              const currentAvatarPreset: Preset = {
                file_id: avatar.file_id,
                path: avatar.path || avatar.avatar_preset_url || avatar.avatar_url || '',
                name: avatar.name || 'Current Avatar'
              };
              combinedPresets = [currentAvatarPreset, ...combinedPresets];
            }
          }
        }
        
        // Store the first avatar as the current avatar for reference
        const firstAvatar = currentAvatarItems[0];
        if (firstAvatar && firstAvatar.file_id) {
          setCurrentAvatar({
            file_id: firstAvatar.file_id,
            path: firstAvatar.path || firstAvatar.avatar_preset_url || firstAvatar.avatar_url || '',
            name: firstAvatar.name || 'Current Avatar'
          });
        }
      }
      
      setAvatarPresets(combinedPresets);
      return combinedPresets;
    } catch (error) {
      console.error("Error fetching presets:", error);
      toast.error("Failed to load avatar presets");
      return [];
    }
  };

  // Save avatar edit
  const saveAvatarEdit = async (fileOrPresetId: File | number, isPreset: boolean) => {
    try {
      if (isPreset) {
        // Same logic as UploadImage: find preset by ID
        const selectedPreset = avatarPresets.find(
          p => p.file_id === fileOrPresetId
        );

        if (!selectedPreset) {
          toast.error("Invalid preset selected.");
          return;
        }

        // Same API call as UploadImage
        await api.put("/api/accounts/update-profile-id", {
          fileId: selectedPreset.file_id
        });
        
        // Update local state with the full URL
        const fullUrl = constructAvatarUrl(selectedPreset.path);
        setUserDetails(prev => prev ? { 
          ...prev, 
          avatar_preset_url: fullUrl, 
          avatar_file_id: selectedPreset.file_id 
        } : null);
        toast.success("Preset avatar updated successfully.");
      } else {
        // Upload custom file
        const file = fileOrPresetId as File;
        
        // Show uploading toast
        const toastId = toast.loading('Uploading avatar...');
        
        try {
          const key = await uploadFile(file);
          
          // Get the full URL from CloudFront
          const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
          const fullUrl = `${cloudfrontUrl}/${key}`;
          
          // Update profile with the uploaded file
          await api.post("/api/accounts/update-profile", {
            name: file.name,
            path: key,
            mime_type: file.type,
            size_bytes: file.size,
          });

          // Update local state
          setUserDetails(prev => prev ? { 
            ...prev, 
            avatar_preset_url: fullUrl, 
            avatar_file_id: null 
          } : null);
          
          toast.success("Custom avatar uploaded successfully.", { id: toastId });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to upload avatar.", { id: toastId });
          throw error;
        }
      }
      
      setIsAvatarModalOpen(false);
      // Refresh presets after update
      await fetchAvatarPresets();
    } catch (e) {
      console.error("Error saving avatar:", e);
      // Error already handled above
    }
  };

  const saveProfileDetails = async (updatedData: any) => {
    try {
      setUserDetails(updatedData);
      setIsProfileModalOpen(false);
    } catch (e) {
      toast.error("Failed executing operations pipeline data push.");
    }
  };

  const saveSelectedBadges = (updatedBadgesList: BadgeMetadata[]) => {
    setUserDetails((prev) => (prev ? { ...prev, badges: updatedBadgesList } : null));
    toast.success("Account showcase badge selection updated.");
    setIsBadgeModalOpen(false);
  };

  // Updated skills save function with API call to /api/tags/skills
  const saveSkillsCuration = async (originalSkills: SkillObject[], updatedSkills: SkillObject[]) => {
    setIsSavingSkills(true);
    
    try {
      console.log("📊 Skills Save - Original Skills:", originalSkills);
      console.log("📊 Skills Save - Updated Skills:", updatedSkills);
      
      // Call the API to update skills - matches PUT /api/tags/skills route
      const response = await api.put('/api/tags/skills', {
        originalSkills: originalSkills,
        updatedSkills: updatedSkills
      });

      console.log("📊 API Response:", response.data);

      if (response.data.success) {
        // Update local state
        setUserDetails((prev) => (prev ? { ...prev, skills: updatedSkills } : null));
        
        // Show success message with details
        const { added, removed, modified, totalSkills } = response.data.data;
        toast.success(
          `Skills updated: ${added} added, ${removed} removed, ${modified} modified. Total: ${totalSkills} skills`
        );
        
        setIsSkillsModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to update skills");
      }
    } catch (error: any) {
      console.error("Error saving skills:", error);
      toast.error(error.response?.data?.message || "Failed to update skills. Please try again.");
    } finally {
      setIsSavingSkills(false);
    }
  };

  const saveSocialLinks = async (updatedLinksList: SocialLink[]) => {
    try {
      // Get original links from current state
      const originalLinks = userDetails?.social_links || [];
      
      // Prepare payload for API
      const payload = {
        originalLinks: originalLinks.map(link => ({
          account_link_id: link.account_link_id,
          platform: link.platform,
          url: link.url
        })),
        updatedLinks: updatedLinksList.map(link => ({
          account_link_id: link.account_link_id || null, // null for new links
          platform: link.platform,
          url: link.url
        }))
      };
      
      console.log("📊 Social Links Payload:", payload);
      
      // Call API to update social links
      const response = await api.put('/api/accounts/update-profile-social-media', payload);
      
      console.log("📊 API Response:", response.data);
      
      if (response.data.success) {
        // Update local state with the response data (which includes IDs for new links)
        const updatedLinksWithIds = response.data.result.updatedLinks || updatedLinksList;
        setUserDetails((prev) => (prev ? { ...prev, social_links: updatedLinksWithIds } : null));
        
        // Show success message with details
        toast.success(`Social links updated successfully`);
      } else {
        toast.error(response.data.message || "Failed to update social links");
      }
    } catch (error: any) {
      console.error("Error saving social links:", error);
      toast.error(error.response?.data?.message || "Failed to synchronize social network pipeline configurations.");
    }
  };

  // Fetch presets on component mount
  useEffect(() => {
    if (id) {
      fetchAvatarPresets();
    }
  }, [id]);

  useEffect(() => {
    socket.connect();
    return () => { socket.off("connect"); };
  }, []);

  // Combined fetch profile effect
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const startTime = Date.now();

        // Check if user exists
        const [isUser] = await Promise.all([api.get(`/api/accounts/check-user/${id}`)]);
        if (isUser.data.isUser === false) {
          toast.error("Profile not found.");
          navigate("/*");
          return;
        }

        // Fetch all data in parallel
        const [profileResponse, tagsResponse, accountLinkResponse] = await Promise.all([
          api.get(`/api/accounts/profile/${id}`),
          api.get(`/api/tags/`),
          api.get(`api/accounts/links/${id}`)
        ]);

        const profileData = profileResponse.data.data || profileResponse.data.profile;
        console.log("Fetched profile data:", profileData);
        
        setAvailableSkills(tagsResponse.data.data || []);

        // Fetch user skills using the new GET /api/tags/skills endpoint
        try {
          const userSkillsResponse = await api.get(`/api/tags/users/${id}/tags`);
          
          const compiledCompoundSkills: SkillObject[] = (userSkillsResponse.data.data || []).map((tag: any) => ({
            tag_id: tag.tag_id,
            name: tag.tag_name || tag.name,
            proficiency: tag.proficiency?.toLowerCase() || "beginner",
            years: tag.years || 0
          }));

          // Determine avatar URL
          let avatarUrl = constructAvatarUrl(profileData.avatar_preset_url);
          
          // Set user details with all data
          setUserDetails({
            username: profileData.username || profileData.handle,
            name: profileData.name || profileData.display_name,
            middleName: profileData.middleName || profileData.middlename,
            suffix: profileData.suffix,
            birthdate: profileData.birthdate || profileData.birth_date,
            country: profileData.country,
            zipCode: profileData.zipcode || profileData.zip_code,
            role: profileData.roles || profileData.role || [],
            email_address: profileData.email_address,
            location: profileData.location,
            joinedDate: profileData.joinedDate || profileData.joineddate || profileData.created_at,
            verification_status: profileData.verification_status,
            bio: profileData.bio || profileData.description,
            tagline: profileData.tagline,
            merit_score: profileData.merit_score || 0,
            avatar_file_id: profileData.avatar_file_id,
            avatar_preset_url: avatarUrl,
            skills: compiledCompoundSkills,
            badges: profileData.badges || [],
            social_links: accountLinkResponse.data.links || accountLinkResponse.data || [],
            subscriptionType: profileData.subscriptionType || "Free"
          });
        } catch (skillsError) {
          console.error("Error fetching user skills:", skillsError);
          
          // Fallback: try the old endpoint /api/tags/users/:userId/tags
          try {
            // Get the current user ID from session or use profileData
            const userId = user?.account_id || profileData.user_id;
            const userTagResponse = await api.get(`/api/tags/users/${userId}/tags`);
            
            const compiledCompoundSkills: SkillObject[] = (userTagResponse.data.tags || []).map((tag: any) => ({
              tag_id: tag.tag_id,
              name: tag.name,
              proficiency: tag.proficiency?.toLowerCase() || "beginner",
              years: tag.years || 0
            }));

            // Determine avatar URL
            let avatarUrl = constructAvatarUrl(profileData.avatar_preset_url);

            setUserDetails({
              username: profileData.username || profileData.handle,
              name: profileData.name || profileData.display_name,
              middleName: profileData.middleName || profileData.middlename,
              suffix: profileData.suffix,
              birthdate: profileData.birthdate || profileData.birth_date,
              country: profileData.country,
              zipCode: profileData.zipCode || profileData.zip_code,
              role: profileData.roles || profileData.role || [],
              email_address: profileData.email_address,
              location: profileData.location,
              joinedDate: profileData.joinedDate || profileData.joineddate || profileData.created_at,
              verification_status: profileData.verification_status,
              bio: profileData.bio || profileData.description,
              tagline: profileData.tagline,
              merit_score: profileData.merit_score || 0,
              avatar_file_id: profileData.avatar_file_id,
              avatar_preset_url: avatarUrl,
              skills: compiledCompoundSkills,
              badges: profileData.badges || [],
              social_links: accountLinkResponse.data.links || accountLinkResponse.data || []
            });
          } catch (fallbackError) {
            console.error("Error fetching user skills from fallback:", fallbackError);
            
            // Set user details without skills
            let avatarUrl = constructAvatarUrl(profileData.avatar_preset_url);

            setUserDetails({
              username: profileData.username || profileData.handle,
              name: profileData.name || profileData.display_name,
              middleName: profileData.middleName || profileData.middlename,
              suffix: profileData.suffix,
              birthdate: profileData.birthdate || profileData.birth_date,
              country: profileData.country,
              zipCode: profileData.zipCode || profileData.zip_code,
              role: profileData.roles || profileData.role || [],
              email_address: profileData.email_address,
              location: profileData.location,
              joinedDate: profileData.joinedDate || profileData.joineddate || profileData.created_at,
              verification_status: profileData.verification_status,
              bio: profileData.bio || profileData.description,
              tagline: profileData.tagline,
              merit_score: profileData.merit_score || 0,
              avatar_file_id: profileData.avatar_file_id,
              avatar_preset_url: avatarUrl,
              skills: [],
              badges: profileData.badges || [],
              social_links: accountLinkResponse.data.links || accountLinkResponse.data || []
            });
          }
        }
        
        // Minimum loading time for smooth UX
        const minimumDelay = 800;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minimumDelay - elapsedTime);

        setTimeout(() => {
          setLoading(false);
        }, remainingTime);

      } catch (err) {
        console.error('Error loading profile:', err);
        toast.error("Failed to load profile data");
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProfile();
    }
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-[#080a12] font-['Plus Jakarta Sans',sans-serif] text-zinc-300 antialiased selection:bg-blue-500/30">
      <UserHeader pageTitle="Profile" credits={1250} />

      <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-5">

        {/* Top Personal Banner Details */}
        <TopSection_ProfileDisplay
          loading={loading}
          username={userDetails?.username}
          name={userDetails?.name}
          middleName={userDetails?.middleName}
          suffix={userDetails?.suffix}
          role={userDetails?.role}
          tagline={userDetails?.tagline}
          location={userDetails?.location}
          emailAddress={userDetails?.email_address}
          joinedDate={userDetails?.joinedDate}
          country={userDetails?.country}
          zipCode={userDetails?.zipCode}
          bio={userDetails?.bio}
          avatarUrl={userDetails?.avatar_preset_url}
          isOwner={isOwner}
          verificationLevel={userDetails?.verification_status === 'verified' ? 2 : 1}
          subscriptionType={userDetails?.subscriptionType || "Free"}
          onEditAvatar={() => setIsAvatarModalOpen(true)}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onChatClick={() => toast.success("Communications synchronization protocol initiated.")}
          onVerificationClick={() => navigate("/account-verification-status")}
        />

        {/* Merit Performance & Reviews Section */}
        <MeritSection_ProfileDisplay
          loading={loading}
          meritScore={userDetails?.merit_score}
          avgRating={4.8}
          totalReviews={portfolioItems.length}
          clientRating={4.9}
          freelancerRating={4.8}
          assetRating={4.7}
          successfulJobsCount={6}
        />

        {/* Layout Matrix Grid Panels Split */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">

          {/* Left Sidebar Column */}
          <div className="space-y-4 h-fit">
            <BadgeSideSection_ProfileDisplay
              loading={loading}
              badges={userDetails?.badges}
              isOwner={isOwner}
              onEditClick={() => setIsBadgeModalOpen(true)}
            />
            <SkillsSideSection_ProfileDisplay
              loading={loading}
              skills={userDetails?.skills}
              onEditClick={isOwner ? () => setIsSkillsModalOpen(true) : undefined}
            />
            <SocialLinksSection_ProfileDisplay
              loading={loading}
              socialLinks={userDetails?.social_links}
              onSaveLinks={isOwner ? saveSocialLinks : undefined}
            />
          </div>

          {/* Right Main Activity Feeds Panels */}
          <div className="space-y-4">
            <MainBody
              loading={loading}
              activeTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab)}
              portfolioItems={portfolioItems}
              services={services}
            />
          </div>

        </div>
      </div>

      {/* System Parameter Modals */}
      <AvatarEditModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={saveAvatarEdit}
        currentAvatarName={userDetails?.name}
        presets={avatarPresets}
        currentAvatarUrl={userDetails?.avatar_preset_url}
      />

      {userDetails && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          data={userDetails}
          onSave={saveProfileDetails}
          availableSkillsList={availableSkills}
        />
      )}

      <BadgeEditModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        currentlyDisplayedBadges={userDetails?.badges || []}
        onSave={saveSelectedBadges}
      />

      <SkillsEditModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        currentSkills={userDetails?.skills || []}
        onSave={saveSkillsCuration}
        availableSkillsList={availableSkills}
      />
    </div>
  );
}