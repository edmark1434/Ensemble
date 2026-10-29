import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import toast from "react-hot-toast";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { ReportUserModal } from "./ReportUserModal";
import DiscoveryFlipCardModal from "@/components/ui/DiscoveryFlipCardModal";
import { InviteToJobModal } from "@/components/ui/InviteToJobModal";
import { getFallbackAvatarUrl } from "@/lib/accountAvatars";

// Modularized Profile Sub-Components
import { TopSection_ProfileDisplay } from "./Displays/TopSection_ProfileDisplay.tsx";
import { type PublicProfileDispute } from "./Displays/RatingsSection_ProfileDisplay.tsx";
import type { PublicStanding } from "./Displays/AccountStanding.tsx";
import { DEFAULT_MERIT } from "@/lib/merit";
import { BadgeSideSection_ProfileDisplay } from "./Displays/BadgeSideSection_ProfileDisplay.tsx";
import { RatingsBudgetSideSection_ProfileDisplay } from "./Displays/RatingsBudgetSideSection_ProfileDisplay.tsx";
import { SkillsSideSection_ProfileDisplay } from "./Displays/SkillsSideSection_ProfileDisplay.tsx";
import { SocialLinksSection_ProfileDisplay } from "./Displays/SocialLinksSection_ProfileDisplay.tsx";
import { ProfileSetupWidget } from "./Displays/ProfileSetupWidget.tsx";
import { MainBody } from "./Displays/Body/MainBody.tsx";
import confetti from "canvas-confetti";
import { Award } from "lucide-react";
import type { TabType } from "./Displays/Body/MainBody.tsx";
import type { PortfolioItem } from "./Displays/Body/Profile_Portfolio.tsx";

// Badges Registry & Type Infrastructure
import { badgesRegistry } from "@/pages/user/7_profile/Utilities/BadgesRegistry.ts";
import type { BadgeMetadata } from "./Displays/BadgeSideSection_ProfileDisplay.tsx";

// System Modals
import AvatarEditModal from "@/pages/user/7_profile/Edits/AvatarEditModal.tsx";
import BannerEditModal from "@/pages/user/7_profile/Edits/BannerEditModal.tsx";
import ProfileEditModal from "@/pages/user/7_profile/Edits/ProfileEditModal.tsx";
import TaglineEditModal from "@/pages/user/7_profile/Edits/TaglineEditModal.tsx";
import AccountTagsEditModal from "@/pages/user/7_profile/Edits/AccountTagsEditModal.tsx";
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
    role_name: "Freelancer" | "Client"| "Enthusiast";
  }[];
  email_address: string;
  location: string;
  joinedDate: string;
  verification_status: boolean;
  bio: string;
  tagline: string;
  introduction?: string;
  avatar_file_id: number | null;
  avatar_preset_url?: string;
  skills?: SkillObject[];
  badges?: BadgeMetadata[];
  social_links?: SocialLink[];
  subscriptionType?: "Free" | "Premium" | "Business";
  followers_count?: number;
  following_count?: number;
  avg_rating?: string | number;
  total_reviews?: string | number;
  client_rating?: string | number;
  freelancer_rating?: string | number;
  budget_credits?: number | null;
  banner_preset?: string | null;
  asset_rating?: string | number;
  successful_jobs_count?: string | number;
  freelancer_service_rating?: string | number;
  freelancer_service_count?: string | number;
  freelancer_job_rating?: string | number;
  freelancer_job_count?: string | number;
  client_service_rating?: string | number;
  client_service_count?: string | number;
  client_job_rating?: string | number;
  client_job_count?: string | number;
  standing?: PublicStanding | null;
  disputes?: PublicProfileDispute[];
}

const services = [
  { id: 1, title: "Professional Logo Design", description: "Unique, modern logo design with 3 concepts and unlimited revisions", price: 499, deliveryTime: "3 days", rating: 4.9, orders: 127 }
];

const constructAvatarUrl = (path: string | undefined, name?: string): string | undefined => {
  if (!path || path.trim() === '') return name ? getFallbackAvatarUrl(name) : undefined;
  if (path.startsWith('http')) return path;
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
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

const ID_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\d+)$/i;

const isUuid = (value: string | undefined): value is string =>
  Boolean(value && ID_PATTERN.test(value));

function standingWithMerit(standing?: PublicStanding | null): PublicStanding {
  const merit = Number(standing?.merit);
  return {
    ...(standing || {}),
    merit: Number.isFinite(merit) ? Math.min(Math.max(merit, 0), 100) : DEFAULT_MERIT,
  };
}

export default function Profile({ validatedProfileId }: ProfileProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const locationHook = useLocation(); const [activeTab, setActiveTab] = useState<TabType>((new URLSearchParams(locationHook.search).get("tab") as TabType) || "introduction");

  const { user } = useGlobalState();
  const { id: profileAccountId } = useParams<{ id?: string }>();
  const id = profileAccountId || user?.account_id;
  const hasInvalidProfileId = Boolean(profileAccountId && !isUuid(profileAccountId));

  const { openChatWithUser } = useOutletContext<{
    openChatWithUser: (target?: ChatTarget) => void;
  }>();

  const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
  const [availableSkills, setAvailableSkills] = useState<{ tag_id: number; name: string }[]>([]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTaglineModalOpen, setIsTaglineModalOpen] = useState(false);
  const [isAccountTagsModalOpen, setIsAccountTagsModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [galleryCount, setGalleryCount] = useState(0);

  const [avatarPresets, setAvatarPresets] = useState<Preset[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<Preset | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isFlipCardOpen, setIsFlipCardOpen] = useState(false);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
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
    } catch (error: any) {
      console.error('❌ Upload error:', error);
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

  const fetchAvatarPresets = async (latestAvatarUrl?: string) => {
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

      let newCustomPresets: Preset[] = [];

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
              newCustomPresets.push(currentAvatarPreset);
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

      let combinedPresets = [...newCustomPresets.slice(0, 3), ...presetFiles];

      // Ensure the actively used avatar (e.g. newly uploaded) is always present in the history list
      const activeUrl = latestAvatarUrl || userDetails?.avatar_preset_url;

      if (activeUrl) {
        const exists = combinedPresets.some(p => p.path === activeUrl || constructAvatarUrl(p.path) === constructAvatarUrl(activeUrl));
        if (!exists) {
          combinedPresets.unshift({
            file_id: latestAvatarUrl ? -1 : (userDetails?.avatar_file_id || -1), // Use its real ID if it has one, otherwise UI-only marker
            path: activeUrl,
            name: 'Current Avatar'
          });
          // Ensure we still respect the custom history limit of 3 by keeping max 3 non-preset items
          const sysPresetsStart = combinedPresets.findIndex(p => presetFiles.some(pf => pf.file_id === p.file_id));
          if (sysPresetsStart > 3) {
             combinedPresets.splice(3, sysPresetsStart - 3);
          }
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
      let newAvatarUrl: string | undefined = undefined;

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
        newAvatarUrl = fullUrl;
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
          newAvatarUrl = fullUrl;

          const updateResponse = await api.post("/api/accounts/update-profile", {
            name: file.name,
            path: key,
            mime_type: file.type,
            size_bytes: file.size,
          });

          const newFileId = updateResponse?.data?.file || null;

          setUserDetails(prev => prev ? {
            ...prev,
            avatar_preset_url: fullUrl,
            avatar_file_id: newFileId
          } : null);

          toast.success("Custom avatar uploaded successfully.", { id: toastId });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to upload avatar.", { id: toastId });
          throw error;
        }
      }

      setIsAvatarModalOpen(false);
      await fetchAvatarPresets(newAvatarUrl);
    } catch (e) {
      console.error("Error saving avatar:", e);
      throw e;
    }
  };

  const saveProfileDetails = async (updatedData: any) => {
    try {
      setUserDetails({
        ...updatedData,
        joinedDate: updatedData.joinedDate || "",
      });
      setIsProfileModalOpen(false);
    } catch (e) {
      toast.error("Failed executing operations pipeline data push.");
    }
  };

  const saveTaglineEdit = (newTagline: string) => {
    setUserDetails((prev) => (prev ? { ...prev, tagline: newTagline } : null));
  };

  const saveAccountTagsEdit = (newRoles: string[]) => {
    setUserDetails((prev) => {
      if (!prev) return prev;
      const formattedRoles = newRoles.map((r) => ({ role_id: 0, role_name: r as any }));
      return { ...prev, role: formattedRoles };
    });
  };

  const saveSelectedBadges = async (updatedBadgesList: BadgeMetadata[]) => {
    try {
      const registryIds = updatedBadgesList.map(b => b.id);
      const response = await api.put('/api/accounts/profile/badges/curate', { registryIds });
      if (response.data.success) {
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
      const response = await api.put('/api/tags/skills', {
        originalSkills: originalSkills,
        updatedSkills: updatedSkills
      });

      if (response.data.success) {
        setUserDetails((prev) => (prev ? { ...prev, skills: updatedSkills } : null));
        const { added, removed, modified } = response.data.data;
        const label = (n: number) => `${n} ${n === 1 ? "skill has" : "skills have"}`;
        if (added > 0) toast.success(`${label(added)} been added!`);
        if (modified > 0) toast.success(`${label(modified)} been updated`);
        if (removed > 0) toast.success(`${label(removed)} been removed`);
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

      const response = await api.put('/api/accounts/update-profile-social-media', payload);

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
    if (confirmedProfileId === id && isUuid(id) && isOwner) {
      fetchAvatarPresets();
    }
  }, [id, confirmedProfileId, userDetails?.avatar_preset_url]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

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
            avatar_file_id: profileData.avatar_file_id,
            avatar_preset_url: avatarUrl,
            skills: compiledCompoundSkills,
            badges: profileData.badges || [],
            social_links: accountLinkResponse.data.links || accountLinkResponse.data || [],
            subscriptionType: profileData.subscriptiontype || "Free",
            followers_count: Number(profileData.followers_count) || 0,
            following_count: Number(profileData.following_count) || 0,
            avg_rating: profileData.avg_rating,
            total_reviews: profileData.total_reviews,
            freelancer_rating: profileData.freelancer_rating,
            budget_credits: profileData.budget_credits ?? null,
            banner_preset: profileData.banner_preset ?? null,
            client_rating: profileData.client_rating,
            asset_rating: profileData.asset_rating,
            successful_jobs_count: profileData.successful_jobs_count,
            freelancer_service_rating: profileData.freelancer_service_rating,
            freelancer_service_count: profileData.freelancer_service_count,
            freelancer_job_rating: profileData.freelancer_job_rating,
            freelancer_job_count: profileData.freelancer_job_count,
            client_service_rating: profileData.client_service_rating,
            client_service_count: profileData.client_service_count,
            client_job_rating: profileData.client_job_rating,
            client_job_count: profileData.client_job_count,
            standing: standingWithMerit(profileData.standing),
            disputes: profileData.disputes || [],
          });
        } catch (skillsError) {
          console.error("Error fetching user skills:", skillsError);
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
            avatar_file_id: profileData.avatar_file_id,
            avatar_preset_url: avatarUrl,
            skills: [],
            badges: profileData.badges || [],
            social_links: accountLinkResponse.data.links || accountLinkResponse.data || [],
            subscriptionType: profileData.subscriptiontype || "Free",
            followers_count: Number(profileData.followers_count) || 0,
            following_count: Number(profileData.following_count) || 0,
            avg_rating: profileData.avg_rating,
            total_reviews: profileData.total_reviews,
            freelancer_rating: profileData.freelancer_rating,
            budget_credits: profileData.budget_credits ?? null,
            banner_preset: profileData.banner_preset ?? null,
            client_rating: profileData.client_rating,
            asset_rating: profileData.asset_rating,
            successful_jobs_count: profileData.successful_jobs_count,
            freelancer_service_rating: profileData.freelancer_service_rating,
            freelancer_service_count: profileData.freelancer_service_count,
            freelancer_job_rating: profileData.freelancer_job_rating,
            freelancer_job_count: profileData.freelancer_job_count,
            client_service_rating: profileData.client_service_rating,
            client_service_count: profileData.client_service_count,
            client_job_rating: profileData.client_job_rating,
            client_job_count: profileData.client_job_count,
            standing: standingWithMerit(profileData.standing),
            disputes: profileData.disputes || [],
          });
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

  const [highlightField, setHighlightField] = useState<"bio" | "tagline" | "tagline-and-bio" | undefined>();

  const openModalWithHighlight = (field: "bio" | "tagline" | "tagline-and-bio") => {
    setHighlightField(field);
    setIsProfileModalOpen(true);
  };

  const completionSteps = [
    {
      id: "avatar",
      label: "Set Avatar",
      description: "Upload a profile photo or select an avatar preset",
      category: "identity" as const,
      check: Boolean(
        (userDetails?.avatar_preset_url && !userDetails.avatar_preset_url.includes('default')) ||
        userDetails?.avatar_file_id
      ),
      action: () => setIsAvatarModalOpen(true)
    },
    {
      id: "banner",
      label: "Set Banner",
      description: "Customize your profile banner or select an artistic preset",
      category: "identity" as const,
      check: Boolean(
        (userDetails?.banner_preset && userDetails.banner_preset.trim().length > 0) ||
        (userDetails?.banner_preset_url && userDetails.banner_preset_url.trim().length > 0) ||
        (userDetails?.banner_file_path && userDetails.banner_file_path.trim().length > 0)
      ),
      action: () => setIsBannerModalOpen(true)
    },
    {
      id: "tagline",
      label: "Set Tagline",
      description: "Add a crisp professional tagline under your name",
      category: "identity" as const,
      check: Boolean(userDetails?.tagline && userDetails.tagline.trim().length > 0),
      action: () => setIsTaglineModalOpen(true)
    },
    {
      id: "bio",
      label: "Set Bio",
      description: "Write a summary describing your background and experience",
      category: "identity" as const,
      check: Boolean(userDetails?.bio && userDetails.bio.trim().length > 0),
      action: () => openModalWithHighlight("bio")
    },
    {
      id: "budget",
      label: "Set Budget",
      description: userDetails?.budget_credits ? `Target budget: ${Number(userDetails.budget_credits).toLocaleString()} Credits` : "Set your planned project budget allocation",
      category: "experience" as const,
      check: Boolean(userDetails?.budget_credits !== null && userDetails?.budget_credits !== undefined && Number(userDetails.budget_credits) > 0),
      action: () => {
        const el = document.querySelector('[data-tour="profile-budget"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    {
      id: "introduction",
      label: "Set Introduction",
      description: "Provide a comprehensive introduction story on your profile",
      category: "experience" as const,
      check: Boolean(userDetails?.introduction && userDetails.introduction.trim().length > 0),
      action: () => { 
        setActiveTab('introduction'); 
        window.scrollTo({ top: 350, behavior: 'smooth' }); 
        setTimeout(() => {
          const editBtn = document.querySelector<HTMLButtonElement>('[data-tour="profile-intro-edit"]');
          if (editBtn) editBtn.click();
        }, 300);
      }
    },
    {
      id: "skills",
      label: "Set at least 3 Skills",
      description: `Curate at least 3 skills (${userDetails?.skills?.length || 0}/3 currently selected)`,
      category: "experience" as const,
      check: Boolean(userDetails?.skills && userDetails.skills.length >= 3),
      action: () => setIsSkillsModalOpen(true)
    },
    {
      id: "portfolio",
      label: "Add a Portfolio",
      description: `Upload portfolio items or showcase past work (${portfolioItems.length} added)`,
      category: "experience" as const,
      check: Boolean(portfolioItems && portfolioItems.length > 0),
      action: () => { setActiveTab('portfolio'); window.scrollTo({ top: 350, behavior: 'smooth' }); }
    }
  ];

  const setupBadgeRequestedRef = useRef(false);
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
      try {
        await api.put(`/api/accounts/update-profile-details`, { original: { tagline: userDetails?.tagline || "" }, updates: { tagline: "" } });
        setUserDetails(prev => {
          if (!prev) return prev;
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
    if (!showCongrats) {
      confetti.reset();
      return;
    }

    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 99999,
    };

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    return () => {
      confetti.reset();
    };
  }, [showCongrats]);

  useEffect(() => {
    if (completionScore === 100 && isOwner) {
      if (!hasCompletedProfileSetup) {
        setShowCongrats(true);
        setHasCompletedProfileSetup(true);
        localStorage.setItem(`profileSetupCompleted_${user?.account_id}`, 'true');
        window.dispatchEvent(new Event('profileSetupStatusUpdate'));
      }

      if (userDetails && !setupBadgeRequestedRef.current && !userDetails.badges?.some(b => b.id === "setup-profile")) {
        setupBadgeRequestedRef.current = true;
        api.post('/api/accounts/grant-badge', { badgeId: 'setup-profile' }).catch(() => {});
      }
    }
  }, [completionScore, hasCompletedProfileSetup, isOwner, user?.account_id, userDetails]);

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
      <UserHeader pageTitle="Profile" />

      <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-5">

        {String(userDetails?.status || "").toLowerCase() === "deactivated" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Deactivated
            </span>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Hidden from member search and public profiles. Staff can still view this account.
            </p>
          </div>
        )}

        {isOwner && !hasCompletedProfileSetup && (
          <ProfileSetupWidget
            completionScore={completionScore}
            completionSteps={completionSteps}
            getProgressColor={getProgressColor}
            onSaveBudget={async (budgetCredits) => {
              const { data } = await api.put("/api/accounts/profile/budget", { budget_credits: budgetCredits });
              const saved = data?.data?.budget_credits ?? null;
              setUserDetails(prev => (prev ? { ...prev, budget_credits: saved } : prev));
            }}
            currentBudget={userDetails?.budget_credits ?? null}
            onWalkthroughComplete={() => {
              if (completionScore === 100) {
                setShowCongrats(true);
              }
            }}
          />
        )}

        <TopSection_ProfileDisplay
          loading={loading}
          avgRating={userDetails?.avg_rating ? Number(parseFloat(userDetails.avg_rating as string).toFixed(1)) : 0.0}
          freelancerRating={userDetails?.freelancer_rating ? Number(parseFloat(userDetails.freelancer_rating as string).toFixed(1)) : 0.0}
          totalReviews={userDetails?.total_reviews ? Number(userDetails.total_reviews) : 0}
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
            onOpenFlipCard={() => setIsFlipCardOpen(true)}
          subscriptionType={userDetails?.subscriptionType || "Free"}
          followersCount={userDetails?.followers_count}
          followingCount={userDetails?.following_count}
          isFollowing={isFollowing}
          isFollowedBy={isFollowedBy}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onFollowersClick={() => setFollowersModalType("followers")}
          onFollowingClick={() => setFollowersModalType("following")}
            onInviteToJobClick={() => {
                if (!user) return setIsGuestModalOpen(true);
                setIsInviteModalOpen(true);
              }}
              onReportClick={() => {
                if (!user) return setIsGuestModalOpen(true);
                setIsReportModalOpen(true);
              }}
          onEditAvatar={() => setIsAvatarModalOpen(true)}
          bannerPreset={userDetails?.banner_preset ?? null}
          onEditBanner={() => setIsBannerModalOpen(true)}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onEditTagline={() => setIsTaglineModalOpen(true)}
          onEditAccountTags={() => setIsAccountTagsModalOpen(true)}
          onChatClick={handleOpenChat}
          onVerificationClick={() => navigate("/account-verification-status")}
          standing={userDetails?.standing}
        />

        {confirmedProfileId === id && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">

          <div className="space-y-4 h-fit">
            <RatingsBudgetSideSection_ProfileDisplay
              loading={loading}
              isOwner={isOwner}
              meritScore={userDetails?.standing?.merit ?? DEFAULT_MERIT}
              avgRating={userDetails?.avg_rating ? Number(parseFloat(userDetails.avg_rating as string).toFixed(1)) : 0}
              totalReviews={userDetails?.total_reviews ? Number(userDetails.total_reviews) : 0}
              freelancerRating={userDetails?.freelancer_rating ? Number(parseFloat(userDetails.freelancer_rating as string).toFixed(1)) : 0}
              freelancerReviews={Number(userDetails?.freelancer_service_count || 0) + Number(userDetails?.freelancer_job_count || 0)}
              budgetCredits={userDetails?.budget_credits ?? null}
              onSaveBudget={async (budgetCredits) => {
                const { data } = await api.put("/api/accounts/profile/budget", { budget_credits: budgetCredits });
                const saved = data?.data?.budget_credits ?? null;
                setUserDetails(prev => (prev ? { ...prev, budget_credits: saved } : prev));
              }}
            />
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

      <AvatarEditModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSave={saveAvatarEdit}
        currentAvatarName={userDetails?.name}
        presets={avatarPresets}
        currentAvatarUrl={userDetails?.avatar_preset_url}
      />

      <BannerEditModal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        currentBanner={userDetails?.banner_preset ?? null}
        ownedBadgeIds={(userDetails?.badges || []).map(b => String(b.id))}
        userName={userDetails?.name}
        userHandle={userDetails?.username}
        userAvatar={userDetails?.avatar_preset_url}
        userRole={userDetails?.role?.role_name || (typeof userDetails?.role === 'string' ? userDetails?.role : undefined)}
        userTagline={userDetails?.tagline}
        onSave={async (bannerPreset) => {
          const { data } = await api.put("/api/accounts/profile/banner", { banner_preset: bannerPreset });
          const saved = data?.data?.banner_preset ?? null;
          setUserDetails(prev => (prev ? { ...prev, banner_preset: saved } : prev));
          toast.success(saved ? "Profile banner updated successfully." : "Profile banner removed.");
        }}
      />

      {userDetails && (
        <>
          <ProfileEditModal
            isOpen={isProfileModalOpen}
            onClose={() => { setIsProfileModalOpen(false); setHighlightField(undefined); }}
            data={userDetails}
            onSave={saveProfileDetails}
            highlightField={highlightField}
          />

          <TaglineEditModal
            isOpen={isTaglineModalOpen}
            onClose={() => setIsTaglineModalOpen(false)}
            currentTagline={userDetails.tagline || ""}
            subscriptionType={userDetails.subscriptionType}
            onSave={saveTaglineEdit}
          />

          <AccountTagsEditModal
            isOpen={isAccountTagsModalOpen}
            onClose={() => setIsAccountTagsModalOpen(false)}
            currentRoles={userDetails.role?.map((r) => r.role_name) || []}
            onSave={saveAccountTagsEdit}
          />
        </>
      )}

      
      {isFlipCardOpen && userDetails && (
        <DiscoveryFlipCardModal
          user={{
            id: id || "",
            name: userDetails.name || "",
            username: userDetails.username || "",
            avatar: constructAvatarUrl(userDetails.avatar_preset_url, userDetails.name),
            bio: userDetails.bio || "",
            skills: (userDetails.skills || []).map((s: any) => s.name || s), // fallback string map
            rawSkills: userDetails.skills || [],
            verified: !!userDetails.verification_status,
            starRating: parseFloat(String(userDetails.avg_rating ?? 0)) > 0
              ? parseFloat(String(userDetails.avg_rating)).toFixed(1)
              : "No Rating",
            followersCount: userDetails.followers_count || 0,
            roles: userDetails.role || [],
            subscriptionType: userDetails.subscriptionType || "Free",
            badges: userDetails.badges || [],
            bannerPreset: userDetails.banner_preset ?? null,
            tagline: userDetails.tagline || "",
            totalJobs: userDetails.total_jobs || 0,
            totalServices: userDetails.total_services || 0,
            totalAssets: userDetails.total_assets || 0,
            joinedDate: userDetails.joinedDate || "",
            email: userDetails.email_address || ""
          } as any}
          onClose={() => setIsFlipCardOpen(false)}
          onInvite={() => {
            setIsFlipCardOpen(false);
            if (!user) return setIsGuestModalOpen(true);
            setIsInviteModalOpen(true);
          }}
          hideActions={true}
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
              {/* Profile Complete Badge Display with Emerald Pulse */}
              <div className="relative w-28 h-28 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <div className="relative w-24 h-24 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-emerald-500 shadow-xl p-2 flex items-center justify-center">
                  <img
                    src="/icons/badges/setup-profile.png"
                    alt="Profile Complete Badge"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 mb-3">
                <Award className="w-3.5 h-3.5" />
                Badge Unlocked
              </div>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1.5 tracking-tight">Congratulations!</h2>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                You've earned the Profile Complete Badge!
              </p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mb-6 leading-relaxed">
                You have successfully completed all 8 profile setup milestones. Your profile is now 100% complete and ready to stand out across the community!
              </p>
              <button
                onClick={() => {
                  setShowCongrats(false);
                  window.location.reload();
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 cursor-pointer"
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
        onClose={() => !isSavingSkills && setIsSkillsModalOpen(false)}
        currentSkills={userDetails?.skills || []}
        onSave={saveSkillsCuration}
        availableSkillsList={availableSkills}
        isSaving={isSavingSkills}
      />
      <InviteToJobModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        freelancerId={id || ""} 
        freelancerName={userDetails?.name || userDetails?.username || "Freelancer"} 
      />

      <ReportUserModal
        isOpen={isReportModalOpen}
        accountId={String(id || "")}
        displayName={userDetails?.name || userDetails?.username || "this user"}
        onClose={() => setIsReportModalOpen(false)}
      />
      <GuestLoginModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        title="Login Required"
        message="You need to be logged in to invite freelancers to jobs. Log in now to access your workspace."
      />
    </div>
  );
}
