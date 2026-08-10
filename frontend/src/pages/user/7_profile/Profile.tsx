import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Modularized Profile Sub-Components
import { TopSection_ProfileDisplay } from "./Displays/TopSection_ProfileDisplay.tsx";
import { MeritSection_ProfileDisplay } from "./Displays/MeritSection_ProfileDisplay.tsx";
import { BadgeSideSection_ProfileDisplay } from "./Displays/BadgeSideSection_ProfileDisplay.tsx";
import { SkillsSideSection_ProfileDisplay } from "./Displays/SkillsSideSection_ProfileDisplay.tsx";
import { SocialLinksSection_ProfileDisplay } from "./Displays/SocialLinksSection_ProfileDisplay.tsx";
import { MainBody } from "./Displays/Body/MainBody.tsx";
import type { TabType } from "./Displays/Body/MainBody.tsx";
import type { PortfolioItem } from "./Displays/Body/Profile_Portfolio.tsx";

// Badges Registry & Type Infrastructure
import { badgesRegistry } from "@/pages/user/7_profile/Utilities/BadgesRegistry.ts";
import type { BadgeMetadata } from "./Displays/BadgeSideSection_ProfileDisplay.tsx";

// System Modals
import AvatarEditModal from "@/pages/user/7_profile/Edits/AvatarEditModal.tsx";
import ProfileEditModal from "@/pages/user/7_profile/Edits/ProfileEditModal.tsx";
import { BadgeEditModal } from "./Edits/BadgeEditModal.tsx";
import SkillsEditModal from "@/pages/user/7_profile/Edits/SkillsEditModal.tsx";
import { FollowersModal } from "./Displays/FollowersModal.tsx";

// Chat Interface Context Types
import type { ChatTarget } from "@/components/ui/Layout";

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

interface ProfileAttachmentResponse {
  account_attachment_id: string;
  attachment_kind: "file" | "link";
  name: string;
  description?: string | null;
  external_url?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  created_at?: string;
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
  verification_status: boolean;
  bio: string;
  tagline: string;
  merit_score: number;
  avatar_file_id: number | null;
  avatar_preset_url?: string;
  skills?: SkillObject[];
  badges?: BadgeMetadata[];
  social_links?: SocialLink[];
  subscriptionType?: "Free" | "Premium" | "Business";
  followers_count?: number;
  following_count?: number;
}

const services = [
  { id: 1, title: "Professional Logo Design", description: "Unique, modern logo design with 3 concepts and unlimited revisions", price: 499, deliveryTime: "3 days", rating: 4.9, orders: 127 }
];

// Helper function to construct avatar URL
const constructAvatarUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;

  if (path.startsWith('http')) {
    return path;
  }

  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return path;

  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
};

interface Preset {
  file_id: number;
  path: string;
  name: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("portfolio");
  const { user } = useGlobalState();
  const { id: profileAccountId } = useParams<{ id?: string }>();
  const id = profileAccountId || user?.account_id;

  // Outlet context handler for global chat control
  const { openChatWithUser } = useOutletContext<{
    openChatWithUser: (target?: ChatTarget) => void;
  }>();

  const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
  const [availableSkills, setAvailableSkills] = useState<{ tag_id: number; name: string }[]>([]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  const [avatarPresets, setAvatarPresets] = useState<Preset[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<Preset | null>(null);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<"followers" | "following" | null>(null);

  const isOwner = id == user?.account_id;

  const mapAttachmentToPortfolioItem = (
    attachment: ProfileAttachmentResponse
  ): PortfolioItem => ({
    id: String(attachment.account_attachment_id),
    type: attachment.attachment_kind === "link" ? "link" : "document",
    title: attachment.name,
    description:
      attachment.description ||
      (attachment.attachment_kind === "link"
        ? attachment.external_url
        : attachment.file_name || "PDF document"),
    fileUrl: attachment.file_path
      ? constructAvatarUrl(attachment.file_path)
      : undefined,
    externalUrl: attachment.external_url || undefined,
    createdAt: attachment.created_at,
  });

  // Open Chat Trigger Handler
  const handleOpenChat = () => {
    if (!userDetails || !id) return;
    const fullName = [userDetails.name, userDetails.middleName, userDetails.suffix]
      .filter(Boolean)
      .join(" ");

    openChatWithUser({
      name: fullName || userDetails.username,
      avatarUrl: userDetails.avatar_preset_url,
      account_id: id
    });
  };

  const handleFollow = async () => {
    if (!id || !user) return;
    try {
      await api.post(`/api/accounts/${id}/follow`);
      setIsFollowing(true);
      setUserDetails(prev => prev ? { ...prev, followers_count: (Number(prev.followers_count) || 0) + 1 } : null);
      toast.success("Followed user!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to follow user");
    }
  };

  const handleUnfollow = async () => {
    if (!id || !user) return;
    try {
      await api.delete(`/api/accounts/${id}/follow`);
      setIsFollowing(false);
      setUserDetails(prev => prev ? { ...prev, followers_count: Math.max(0, (Number(prev.followers_count) || 1) - 1) } : null);
      toast.success("Unfollowed user!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to unfollow user");
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

        uploadResponse = await fetch(newUploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        key = newKey;
      }

      if (!uploadResponse.ok) {
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

  const handleUploadResume = async (file: File) => {
    if (!isOwner) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The PDF must not exceed 5 MB.");
      return;
    }

    const toastId = toast.loading("Uploading CV / resume...");
    try {
      const key = await uploadFile(file);
      const response = await api.post("/api/accounts/profile/attachments", {
        attachment_kind: "file",
        attachment_type: "cv_resume",
        name: file.name.replace(/\.pdf$/i, ""),
        description: "CV / Resume",
        file: {
          name: file.name,
          path: key,
          mime_type: file.type,
          size_bytes: file.size,
        },
      });
      setPortfolioItems((current) => [
        mapAttachmentToPortfolioItem(response.data.attachment),
        ...current,
      ]);
      toast.success("CV / resume added to your profile.", { id: toastId });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.message || "Unable to upload CV / resume.",
        { id: toastId }
      );
      throw error;
    }
  };

  const handleAddWebsite = async (data: {
    name: string;
    url: string;
    description: string;
  }) => {
    if (!isOwner) return;
    try {
      const response = await api.post("/api/accounts/profile/attachments", {
        attachment_kind: "link",
        attachment_type: "website",
        name: data.name,
        description: data.description,
        external_url: data.url,
      });
      setPortfolioItems((current) => [
        mapAttachmentToPortfolioItem(response.data.attachment),
        ...current,
      ]);
      toast.success("Website added to your profile.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to add website.");
      throw error;
    }
  };

  const handleDeletePortfolioItem = async (attachmentId: string) => {
    if (!isOwner || !window.confirm("Remove this profile attachment?")) return;
    try {
      await api.delete(`/api/accounts/profile/attachments/${attachmentId}`);
      setPortfolioItems((current) =>
        current.filter((item) => String(item.id) !== attachmentId)
      );
      toast.success("Profile attachment removed.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to remove attachment.");
    }
  };

  const fetchAvatarPresets = async () => {
    try {
      const presetsResponse = await api.get("/api/files/profile-presets");
      const presetFiles = presetsResponse.data.files || [];

      const currentAvatarResponse = await api.get(`/api/accounts/profile/avatars/${id}`);
      let currentAvatarData = currentAvatarResponse.data.data || currentAvatarResponse.data;

      let currentAvatarItems = [];
      if (Array.isArray(currentAvatarData)) {
        currentAvatarItems = currentAvatarData;
      } else if (currentAvatarData && typeof currentAvatarData === 'object') {
        currentAvatarItems = [currentAvatarData];
      }

      console.log("Fetched current avatar data:", currentAvatarItems);

      let combinedPresets = [...presetFiles];

      if (currentAvatarItems.length > 0) {
        for (const avatar of currentAvatarItems) {
          if (avatar && avatar.file_id) {
            const existsInPresets = presetFiles.some((p: Preset) => p.file_id === avatar.file_id);

            if (!existsInPresets) {
              const currentAvatarPreset: Preset = {
                file_id: avatar.file_id,
                path: avatar.path || avatar.avatar_preset_url || avatar.avatar_url || '',
                name: avatar.name || 'Current Avatar'
              };
              combinedPresets = [currentAvatarPreset, ...combinedPresets];
            }
          }
        }

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

  const saveAvatarEdit = async (fileOrPresetId: File | number, isPreset: boolean) => {
    try {
      if (isPreset) {
        const selectedPreset = avatarPresets.find(
          p => p.file_id === fileOrPresetId
        );

        if (!selectedPreset) {
          toast.error("Invalid preset selected.");
          return;
        }

        await api.put("/api/accounts/update-profile-id", {
          fileId: selectedPreset.file_id
        });

        const fullUrl = constructAvatarUrl(selectedPreset.path);
        setUserDetails(prev => prev ? {
          ...prev,
          avatar_preset_url: fullUrl,
          avatar_file_id: selectedPreset.file_id
        } : null);
        toast.success("Preset avatar updated successfully.");
      } else {
        const file = fileOrPresetId as File;
        const toastId = toast.loading('Uploading avatar...');

        try {
          const key = await uploadFile(file);
          const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
          const fullUrl = `${cloudfrontUrl}/${key}`;

          await api.post("/api/accounts/update-profile", {
            name: file.name,
            path: key,
            mime_type: file.type,
            size_bytes: file.size,
          });

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
      await fetchAvatarPresets();
    } catch (e) {
      console.error("Error saving avatar:", e);
    }
  };

  const saveProfileDetails = async (updatedData: any) => {
    try {
      setUserDetails({
        ...updatedData,
        joinedDate: updatedData.joinedDate || "",
        location: updatedData.address
      });
      setIsProfileModalOpen(false);
    } catch (e) {
      toast.error("Failed executing operations pipeline data push.");
    }
  };

  const saveSelectedBadges = async (updatedBadgesList: BadgeMetadata[]) => {
    try {
      const registryIds = updatedBadgesList.map(b => b.id);
      const response = await api.put('/api/accounts/profile/badges/curate', { registryIds });
      if (response.data.success) {
        // Update local user details state to reflect new display_order
        setUserDetails((prev) => {
          if (!prev) return prev;
          const newBadges = (prev.badges || []).map(b => ({ ...b, display_order: null }));
          registryIds.forEach((rid, index) => {
            const b = newBadges.find(x => x.id === rid);
            if (b) b.display_order = index + 1;
          });
          return { ...prev, badges: newBadges };
        });
        toast.success("Account showcase badge selection updated.");
        setIsBadgeModalOpen(false);
      } else {
        toast.error("Failed to update badges.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed executing operations pipeline data push.");
    }
  };
  const saveSkillsCuration = async (originalSkills: SkillObject[], updatedSkills: SkillObject[]) => {
    setIsSavingSkills(true);

    try {
      console.log("📊 Skills Save - Original Skills:", originalSkills);
      console.log("📊 Skills Save - Updated Skills:", updatedSkills);

      const response = await api.put('/api/tags/skills', {
        originalSkills: originalSkills,
        updatedSkills: updatedSkills
      });

      console.log("📊 API Response:", response.data);

      if (response.data.success) {
        setUserDetails((prev) => (prev ? { ...prev, skills: updatedSkills } : null));

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
      const originalLinks = userDetails?.social_links || [];

      const payload = {
        originalLinks: originalLinks.map(link => ({
          account_link_id: link.account_link_id,
          platform: link.platform,
          url: link.url
        })),
        updatedLinks: updatedLinksList.map(link => ({
          account_link_id: link.account_link_id || null,
          platform: link.platform,
          url: link.url
        }))
      };

      console.log("📊 Social Links Payload:", payload);

      const response = await api.put('/api/accounts/update-profile-social-media', payload);

      console.log("📊 API Response:", response.data);

      if (response.data.success) {
        const updatedLinksWithIds = response.data.result.updatedLinks || updatedLinksList;
        setUserDetails((prev) => (prev ? { ...prev, social_links: updatedLinksWithIds } : null));
        toast.success(`Social links updated successfully`);
      } else {
        toast.error(response.data.message || "Failed to update social links");
      }
    } catch (error: any) {
      console.error("Error saving social links:", error);
      toast.error(error.response?.data?.message || "Failed to synchronize social network pipeline configurations.");
    }
  };

  useEffect(() => {
    if (id) {
      fetchAvatarPresets();
    }
  }, [id]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const startTime = Date.now();

        const [isUser] = await Promise.all([api.get(`/api/accounts/check-user/${id}`)]);
        if (isUser.data.isUser === false) {
          toast.error("Profile not found.");
          navigate("/*");
          return;
        }

        const [profileResponse, tagsResponse, accountLinkResponse, attachmentsResponse] = await Promise.all([
          api.get(`/api/accounts/profile/${id}?t=${new Date().getTime()}`),
          api.get(`/api/tags/`),
          api.get(`api/accounts/links/${id}`),
          api.get(`/api/accounts/profile/${id}/attachments`),
        ]);
        
        if (!isOwner) {
          try {
             const followStatus = await api.get(`/api/accounts/${id}/follow-status`);
             setIsFollowing(followStatus.data.isFollowing);
             setIsFollowedBy(followStatus.data.isFollowedBy);
          } catch(e) {
             console.error('Error fetching follow status:', e);
          }
        }
        setPortfolioItems(
          (attachmentsResponse.data?.attachments || []).map(mapAttachmentToPortfolioItem)
        );

        const profilePayload =
          profileResponse.data?.data ??
          profileResponse.data?.profile ??
          profileResponse.data;
        const profileData = Array.isArray(profilePayload)
          ? profilePayload[0]
          : profilePayload;
        if (!profileData || typeof profileData !== "object") {
          throw new Error("Profile data was not returned by the server");
        }
        
        console.log("PROFILE DATA RECEIVED: ", profileData);

        const avatarUrl = constructAvatarUrl(profileData.avatar_preset_url);

        setAvailableSkills(tagsResponse.data.data || []);

        try {
          const userSkillsResponse = await api.get(`/api/tags/users/${id}/tags`);

          const compiledCompoundSkills: SkillObject[] = (userSkillsResponse.data.data || []).map((tag: any) => ({
            tag_id: tag.tag_id,
            name: tag.tag_name || tag.name,
            proficiency: tag.proficiency?.toLowerCase() || "beginner",
            years: tag.years || 0
          }));

          let avatarUrl = constructAvatarUrl(profileData.avatar_preset_url);

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
            subscriptionType: profileData.subscriptiontype || "Free",
            followers_count: Number(profileData.followers_count) || 0,
            following_count: Number(profileData.following_count) || 0
          });
        } catch (skillsError) {
          console.error("Error fetching user skills:", skillsError);

          try {
            const userId = user?.account_id || profileData.user_id;
            const userTagResponse = await api.get(`/api/tags/users/${userId}/tags`);

            const compiledCompoundSkills: SkillObject[] = (userTagResponse.data.tags || []).map((tag: any) => ({
              tag_id: tag.tag_id,
              name: tag.name,
              proficiency: tag.proficiency?.toLowerCase() || "beginner",
              years: tag.years || 0
            }));

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
              social_links: accountLinkResponse.data.links || accountLinkResponse.data || [],
              subscriptionType: profileData.subscriptiontype || "Free",
              followers_count: Number(profileData.followers_count) || 0,
              following_count: Number(profileData.following_count) || 0
            });
          } catch (fallbackError) {
            console.error("Error fetching user skills from fallback:", fallbackError);

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
              social_links: accountLinkResponse.data.links || accountLinkResponse.data || [],
              subscriptionType: profileData.subscriptiontype || "Free",
              followers_count: Number(profileData.followers_count) || 0,
              following_count: Number(profileData.following_count) || 0
            });
          }
        }

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
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12] font-['Plus Jakarta Sans',sans-serif] text-gray-900 dark:text-zinc-300 antialiased selection:bg-blue-500/30">
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
          birthdate={userDetails?.birthdate}
          verificationLevel={userDetails?.verification_status}
          subscriptionType={userDetails?.subscriptionType || "Free"}
          followersCount={userDetails?.followers_count}
          followingCount={userDetails?.following_count}
          isFollowing={isFollowing}
          isFollowedBy={isFollowedBy}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onFollowersClick={() => setFollowersModalType("followers")}
          onFollowingClick={() => setFollowersModalType("following")}
          onEditAvatar={() => setIsAvatarModalOpen(true)}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onChatClick={handleOpenChat}
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
              badges={(userDetails?.badges || [])
                .filter(b => b.display_order !== null)
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map(b => badgesRegistry.find(reg => reg.id === b.id))
                .filter(Boolean) as BadgeMetadata[]}
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
              isOwner={isOwner}
              onUploadPDF={handleUploadResume}
              onAddExternalLink={handleAddWebsite}
              onDeletePortfolioItem={handleDeletePortfolioItem}
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

      {followersModalType && id && (
        <FollowersModal
          isOpen={!!followersModalType}
          onClose={() => setFollowersModalType(null)}
          accountId={id}
          type={followersModalType}
        />
      )}

      <BadgeEditModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        unlockedBadges={(userDetails?.badges || []).map(b => badgesRegistry.find(reg => reg.id === b.id)).filter(Boolean) as BadgeMetadata[]}
        currentlyDisplayedBadges={(userDetails?.badges || [])
          .filter(b => b.display_order !== null)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map(b => badgesRegistry.find(reg => reg.id === b.id))
          .filter(Boolean) as BadgeMetadata[]}
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
