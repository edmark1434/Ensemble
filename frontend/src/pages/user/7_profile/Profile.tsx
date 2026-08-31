import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import { ProfileSetupWidget } from "./Displays/ProfileSetupWidget.tsx";
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
  avg_rating?: string | number;
  total_reviews?: string | number;
  client_rating?: string | number;
  freelancer_rating?: string | number;
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
}

const services = [
  { id: 1, title: "Professional Logo Design", description: "Unique, modern logo design with 3 concepts and unlimited revisions", price: 499, deliveryTime: "3 days", rating: 4.9, orders: 127 }
];

const constructAvatarUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
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
    if (confirmedProfileId === id && isUuid(id)) {
      fetchAvatarPresets();
    }
  }, [id, confirmedProfileId]);

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
            merit_score: profileData.merit_score || 0,
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
            client_job_count: profileData.client_job_count
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
            merit_score: profileData.merit_score || 0,
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
            client_job_count: profileData.client_job_count
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
      check: !!userDetails?.avatar_preset_url && !userDetails.avatar_preset_url.includes('default'),
      label: 'Upload an Avatar',
      action: () => setIsAvatarModalOpen(true)
    },
    {
      check: !!userDetails?.tagline && !!userDetails?.bio,
      label: 'Add Tagline & Bio',
      action: () => openModalWithHighlight("tagline-and-bio")
    },
    {
      check: !!userDetails?.introduction,
      label: 'Add an Introduction',
      action: () => { setActiveTab('introduction'); window.scrollTo({ top: 300, behavior: 'smooth' }); }
    },
    {
      check: !!userDetails?.skills && userDetails.skills.length > 0,
      label: 'Add Skills',
      action: () => setIsSkillsModalOpen(true)
    },
    {
      check: portfolioItems.length > 0,
      label: 'Add a Portfolio item',
      action: () => { setActiveTab('portfolio'); window.scrollTo({ top: 300, behavior: 'smooth' }); }
    }
  ];

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
    if (completionScore === 100 && isOwner) {
      if (!hasCompletedProfileSetup) {
        setShowCongrats(true);
        setHasCompletedProfileSetup(true);
        localStorage.setItem(`profileSetupCompleted_${user?.account_id}`, 'true');
        window.dispatchEvent(new Event('profileSetupStatusUpdate'));
      }

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

        {isOwner && !hasCompletedProfileSetup && (
          <ProfileSetupWidget
            completionScore={completionScore}
            completionSteps={completionSteps}
            nextStep={nextStep}
            getProgressColor={getProgressColor}
          />
        )}

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

        {confirmedProfileId === id && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">

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
            
            <MeritSection_ProfileDisplay
              loading={loading}
              meritScore={userDetails?.merit_score}
              avgRating={userDetails?.avg_rating ? Number(parseFloat(userDetails.avg_rating as string).toFixed(1)) : 0.0}
              totalReviews={userDetails?.total_reviews ? Number(userDetails.total_reviews) : 0}
              clientRating={userDetails?.client_rating ? Number(parseFloat(userDetails.client_rating as string).toFixed(1)) : 0.0}
              freelancerRating={userDetails?.freelancer_rating ? Number(parseFloat(userDetails.freelancer_rating as string).toFixed(1)) : 0.0}
              assetRating={userDetails?.asset_rating ? Number(parseFloat(userDetails.asset_rating as string).toFixed(1)) : 0.0}
              successfulJobsCount={userDetails?.successful_jobs_count ? Number(userDetails.successful_jobs_count) : 0}
              freelancerServiceRating={userDetails?.freelancer_service_rating ? Number(parseFloat(userDetails.freelancer_service_rating as string).toFixed(1)) : 0.0}
              freelancerServiceCount={userDetails?.freelancer_service_count ? Number(userDetails.freelancer_service_count) : 0}
              freelancerJobRating={userDetails?.freelancer_job_rating ? Number(parseFloat(userDetails.freelancer_job_rating as string).toFixed(1)) : 0.0}
              freelancerJobCount={userDetails?.freelancer_job_count ? Number(userDetails.freelancer_job_count) : 0}
              clientServiceRating={userDetails?.client_service_rating ? Number(parseFloat(userDetails.client_service_rating as string).toFixed(1)) : 0.0}
              clientServiceCount={userDetails?.client_service_count ? Number(userDetails.client_service_count) : 0}
              clientJobRating={userDetails?.client_job_rating ? Number(parseFloat(userDetails.client_job_rating as string).toFixed(1)) : 0.0}
              clientJobCount={userDetails?.client_job_count ? Number(userDetails.client_job_count) : 0}
              viewMode="merit"
              isOwner={isOwner}
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
                  if (!userDetails?.badges?.some(b => b.id === "setup-profile")) {
                    api.post('/api/accounts/grant-badge', { badgeId: 'setup-profile' }).catch(() => {});
                  }
                  window.location.reload();
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