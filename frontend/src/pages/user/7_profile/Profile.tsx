import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
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
import NotFound from "@/pages/user/0_misc/NotFound.tsx";

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
  introduction?: string;
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

interface ProfileProps {
  validatedProfileId?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined): value is string =>
  Boolean(value && UUID_PATTERN.test(value));

export default function Profile({ validatedProfileId }: ProfileProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("introduction");

  const { user } = useGlobalState();
  const { id: profileAccountId } = useParams<{ id?: string }>();
  const id = profileAccountId || user?.account_id;
  const hasInvalidProfileId = Boolean(profileAccountId && !isUuid(profileAccountId));

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
  const [galleryCount, setGalleryCount] = useState(0);

  const [avatarPresets, setAvatarPresets] = useState<Preset[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<Preset | null>(null);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<"followers" | "following" | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(hasInvalidProfileId);
  const [confirmedProfileId, setConfirmedProfileId] = useState<string | null>(null);

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

  const uploadFile = async (file: File, folder: "profile" | "documents" = "profile"): Promise<string> => {
    try {
      return (await uploadFileWithIntent(file, folder)).key;
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
    if (file.size > 25 * 1024 * 1024) {
      toast.error("The PDF must not exceed 25 MB.");
      return;
    }

    const toastId = toast.loading("Uploading CV / resume...");
    try {
      const uploaded = await uploadFileWithIntent(file, "documents");
      const response = await api.post("/api/accounts/profile/attachments", {
        attachment_kind: "file",
        attachment_type: "cv_resume",
        name: file.name.replace(/\.pdf$/i, ""),
        description: "CV / Resume",
        file_id: uploaded.fileId,
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
      const formattedRoles = updatedData.roles 
        ? updatedData.roles.map((r: string) => ({ role_id: 0, role_name: r }))
        : updatedData.role;

      setUserDetails({
        ...updatedData,
        role: formattedRoles,
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
    if (confirmedProfileId === id && isUuid(id)) {
      fetchAvatarPresets();
    }
  }, [id, confirmedProfileId]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) {
        return;
      }

      if (!isUuid(id)) {
        setProfileNotFound(true);
        setConfirmedProfileId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setProfileNotFound(false);
        setConfirmedProfileId(null);
        const startTime = Date.now();

        if (validatedProfileId !== id) {
          const isUser = await api.get(`/api/accounts/check-user/${id}`);
          if (isUser.data.isUser === false) {
            setProfileNotFound(true);
            setLoading(false);
            return;
          }
        }

        setConfirmedProfileId(id);

        const [profileResponse, tagsResponse, accountLinkResponse, attachmentsResponse, galleriesResponse] = await Promise.all([
          api.get(`/api/accounts/profile/${id}?t=${new Date().getTime()}`),
          api.get(`/api/tags/`),
          api.get(`api/accounts/links/${id}`),
          api.get(`/api/accounts/profile/${id}/attachments`),
          api.get(`/api/accounts/${id}/galleries`)
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
        setGalleryCount(galleriesResponse.data?.length || 0);

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
            introduction: profileData.introduction,
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
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 400 || status === 404) {
          setProfileNotFound(true);
          setConfirmedProfileId(null);
        } else {
          toast.error("Failed to load profile data");
        }
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [id, validatedProfileId]);

  const [highlightField, setHighlightField] = useState<"bio" | "tagline" | undefined>();

  const openModalWithHighlight = (field: "bio" | "tagline") => {
    setHighlightField(field);
    setIsProfileModalOpen(true);
  };

  const completionSteps = [
    { check: !!userDetails?.avatar_preset_url && !userDetails.avatar_preset_url.includes('default'), label: 'Upload an Avatar', action: () => setIsAvatarModalOpen(true) },
    { check: !!userDetails?.tagline, label: 'Add a Tagline', action: () => openModalWithHighlight("tagline") },
    { check: !!userDetails?.bio, label: 'Add a Bio', action: () => openModalWithHighlight("bio") },
    { check: !!userDetails?.introduction, label: 'Add an Introduction', action: () => { setActiveTab('introduction'); window.scrollTo({ top: 300, behavior: 'smooth' }); } },
    { check: !!userDetails?.skills && userDetails.skills.length > 0, label: 'Add Skills', action: () => setIsSkillsModalOpen(true) },
    { check: portfolioItems.length > 0, label: 'Add a Portfolio item', action: () => { setActiveTab('portfolio'); window.scrollTo({ top: 300, behavior: 'smooth' }); } }
  ];

  const [isProfileSetupExpanded, setIsProfileSetupExpanded] = useState(true);
  
  const [hasCompletedProfileSetup, setHasCompletedProfileSetup] = useState(() => {
    return localStorage.getItem(`profileSetupCompleted_${user?.account_id}`) === 'true';
  });
  const [showCongrats, setShowCongrats] = useState(false);

  const getProgressColor = (score: number) => {
    if (score < 33) return "bg-red-500";
    if (score < 66) return "bg-orange-500";
    if (score < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  const completionScore = Math.round((completionSteps.filter(step => step.check).length / completionSteps.length) * 100);
  const nextStep = completionSteps.find(step => !step.check);

  useEffect(() => {
    const handleProfileReset = async () => {
      setHasCompletedProfileSetup(false);
      localStorage.removeItem(`profileSetupCompleted_${user?.account_id}`);
      // Reset tagline to trigger incomplete state
      try {
        await api.put(`/api/accounts/update-profile-details`, { original: { tagline: userDetails?.tagline || "" }, updates: { tagline: "" } });
        setUserDetails(prev => {
          if (!prev) return prev;
          // ALSO remove the badge so we can earn it again!
          const newBadges = (prev.badges || []).filter(b => b.id !== "setup-profile");
          return { ...prev, tagline: "", badges: newBadges };
        });
      } catch (e) {
        console.error("Failed to reset tagline", e);
      }
    };
    
    const handleShowCongrats = () => setShowCongrats(true);
    
    window.addEventListener('profileSetupReset', handleProfileReset);
    window.addEventListener('profileSetupShowCongrats', handleShowCongrats);
    return () => {
      window.removeEventListener('profileSetupReset', handleProfileReset);
      window.removeEventListener('profileSetupShowCongrats', handleShowCongrats);
    };
  }, [user?.account_id, userDetails?.tagline]);

  useEffect(() => {
    if (completionScore === 100 && isOwner) {
      // 1. Show congrats modal if they just completed it
      if (!hasCompletedProfileSetup) {
        setShowCongrats(true);
        setHasCompletedProfileSetup(true);
        localStorage.setItem(`profileSetupCompleted_${user?.account_id}`, 'true');
        window.dispatchEvent(new Event('profileSetupStatusUpdate'));
      }
      
      // 2. Retroactively grant the badge if they are at 100% but missing it
      if (userDetails && !userDetails.badges?.some(b => b.id === "setup-profile")) {
        setUserDetails(prev => {
          if (!prev) return prev;
          if (prev.badges?.some(b => b.id === "setup-profile")) return prev;
          
          const nextOrder = Math.max(-1, ...(prev.badges || []).filter(b => b.display_order !== null).map(b => b.display_order!)) + 1;
          const newBadges = [...(prev.badges || []), { id: "setup-profile", display_order: nextOrder }];
          return { ...prev, badges: newBadges };
        });
        api.post('/api/accounts/grant-badge', { badgeId: 'setup-profile' }).catch(() => {});
      }
    }
  }, [completionScore, hasCompletedProfileSetup, isOwner, user?.account_id, userDetails]);

  // Synchronize global user subscription changes (from testing widget) to the local profile view
  useEffect(() => {
    if (isOwner && user?.subscription_type && userDetails) {
      if (userDetails.subscriptionType !== user.subscription_type) {
        setUserDetails(prev => {
          if (!prev) return prev;
          return { ...prev, subscriptionType: user.subscription_type as any };
        });
      }
    }
  }, [user?.subscription_type, isOwner]);

  if (hasInvalidProfileId || profileNotFound) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base font-['Plus Jakarta Sans',sans-serif] text-gray-900 dark:text-zinc-300 antialiased selection:bg-blue-500/30">
      <UserHeader pageTitle="Profile" credits={1250} />

      <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-5">
        
        {/* Profile Completion Widget (Owner Only) */}
        {!loading && isOwner && !hasCompletedProfileSetup && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col gap-4 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center gap-6 w-full">
              <div className="flex-1 w-full">
                <div 
                  className="flex items-center justify-between mb-2 cursor-pointer group"
                  onClick={() => setIsProfileSetupExpanded(!isProfileSetupExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">Profile Setup ({completionScore}%)</h3>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isProfileSetupExpanded ? "rotate-180" : ""}`} />
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {nextStep ? `Next: ${nextStep.label}` : 'All done!'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${getProgressColor(completionScore)}`}
                    style={{ width: `${completionScore}%` }}
                  />
                </div>
              </div>
              {nextStep && (
                <button 
                  onClick={nextStep.action}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-colors whitespace-nowrap shadow-sm w-full md:w-auto"
                >
                  Complete Now
                </button>
              )}
            </div>
            
            {/* Collapsible Checklist */}
            <div 
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 border-gray-100 dark:border-white/10 transition-all duration-300 overflow-hidden ${
                isProfileSetupExpanded ? "border-t pt-4 mt-2 opacity-100 max-h-[500px]" : "max-h-0 opacity-0 border-transparent m-0 p-0"
              }`}
            >
              {completionSteps.map((step, idx) => (
                <button 
                  key={idx} 
                  onClick={!step.check ? step.action : undefined}
                  className={`flex items-center gap-2 text-sm font-medium text-left transition-colors ${
                    step.check 
                      ? 'text-green-600 dark:text-green-400 cursor-default' 
                      : 'text-gray-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 p-1 -ml-1 rounded'
                  }`}
                  title={!step.check ? 'Click to complete this step' : 'Completed'}
                >
                  {step.check ? (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="truncate">{step.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
        {/* These data-dependent sections are intentionally not mounted until the
            profile lookup succeeds. Their child components fetch galleries. */}
        {!loading && confirmedProfileId === id && (
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
              onTabChange={(tab) => {
                setActiveTab(tab);
              }}
              portfolioItems={portfolioItems}
              services={services}
              isOwner={isOwner}
              onUploadPDF={handleUploadResume}
              onAddExternalLink={handleAddWebsite}
              onDeletePortfolioItem={handleDeletePortfolioItem}
              onUpdateIntroduction={(intro) => {
                setUserDetails(prev => prev ? { ...prev, introduction: intro } : null);
              }}
              userDetails={userDetails}
              accountId={id}
            />
          </div>

        </div>
        )}
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
          onClose={() => { setIsProfileModalOpen(false); setHighlightField(undefined); }}
          data={userDetails}
          onSave={saveProfileDetails}
          availableSkillsList={availableSkills}
          highlightField={highlightField}
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

      {/* Congratulations Modal */}
      <AnimatePresence>
        {showCongrats && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100 dark:border-white/10"
            >
              <div className="w-24 h-24 mx-auto bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <span className="text-5xl drop-shadow-md">🎉</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Congratulations!</h2>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mb-8 leading-relaxed">
                You've successfully completed your Profile Setup. Your profile is now 100% ready to stand out in the community!
              </p>
              <button
                onClick={() => {
                  setShowCongrats(false);
                  
                  // Grant the setup-profile badge locally if not already owned
                  if (!userDetails?.badges?.some(b => b.id === "setup-profile")) {
                    toast.success("You earned the Profile Complete Badge! 🏅");
                    // Attempt API call if backend supports it (Optional)
                    api.post('/api/accounts/grant-badge', { badgeId: 'setup-profile' }).catch(() => {});
                    
                    setUserDetails(prev => {
                      if (!prev) return prev;
                      
                      // Auto-display it by giving it the next available display_order
                      const nextOrder = Math.max(-1, ...(prev.badges || []).filter(b => b.display_order !== null).map(b => b.display_order!)) + 1;
                      
                      const newBadges = [...(prev.badges || []), { id: "setup-profile", display_order: nextOrder }];
                      return { ...prev, badges: newBadges };
                    });
                  }
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
              >
                Awesome! Let's Go
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
