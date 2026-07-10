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
  role: "Freelancer" | "Client" | "Freelancer & Client" | "Casual";
  email_address: string;
  location: string;
  joinedDate: string;
  verification_status: string;
  bio: string;
  tagline: string;
  merit_score: number;
  avatar_file_id: number | null;
  avatar_preset_url?: string;
  skills?: SkillObject[];
  badges?: BadgeMetadata[];
  social_links?: SocialLink[];
}

const portfolioItems = [
  { id: 1, title: "Corporate Brand Identity", description: "Complete brand identity design for a tech startup", type: "image" as const, thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Brand+Identity", likes: 234, views: 1234 }
];

const services = [
  { id: 1, title: "Professional Logo Design", description: "Unique, modern logo design with 3 concepts and unlimited revisions", price: 499, deliveryTime: "3 days", rating: 4.9, orders: 127 }
];

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

  const isOwner = id == user?.account_id;

  useEffect(() => {
    socket.connect();
    return () => { socket.off("connect"); };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const startTime = Date.now();

        const [isUser] = await Promise.all([api.get(`/api/accounts/check-user/${id}`)]);
        if (isUser.data.isUser === false) {
          toast.error("Profile not found.");
          navigate("/*");
          return;
        }

        const [profileResponse, tagsResponse, accountLinkResponse] = await Promise.all([
          api.get(`/api/accounts/profile/${id}`),
          api.get(`/api/tags/`),
          api.get(`api/accounts/links/${id}`)
        ]);

        const profileData = profileResponse.data.profile;
        setAvailableSkills(tagsResponse.data.tags || []);

        const userTagResponse = await api.get(`api/tags/users/${profileData.user_id}/tags`);

        const compiledCompoundSkills: SkillObject[] = (userTagResponse.data.tags || []).map((tag: any, idx: number) => ({
          tag_id: tag.tag_id,
          name: tag.name,
          proficiency: idx % 3 === 0 ? "expert" : idx % 2 === 0 ? "advanced" : "intermediate",
          years: Math.max(1, idx + 2)
        }));

        setUserDetails({
          ...profileData,
          username: profileData.username || "rexshimura",
          middleName: profileData.middle_name || "P.",
          suffix: profileData.suffix || "",
          birthdate: profileData.birthdate || "2006-06-24",
          country: profileData.country || "Philippines",
          zipCode: profileData.zip_code || "6000",
          role: profileData.role || "Freelancer",
          joinedDate: profileData.created_at,
          skills: compiledCompoundSkills,

          badges: profileData.badges && profileData.badges.length > 0
            ? profileData.badges
            : badgesRegistry,

          social_links: accountLinkResponse.data.links || [],
          avatar_preset_url: profileData.avatar_preset_url || "/profile_presets/p1.png"
        });

        const minimumDelay = 800;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minimumDelay - elapsedTime);

        setTimeout(() => {
          setLoading(false);
        }, remainingTime);

      } catch (err) {
        console.error('Error loading component configuration profiles:', err);
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, navigate, user?.account_id]);

  const saveAvatarEdit = async (fileOrPresetUrl: File | string, isPreset: boolean) => {
    try {
      if (isPreset) {
        setUserDetails(prev => prev ? { ...prev, avatar_preset_url: fileOrPresetUrl as string, avatar_file_id: null } : null);
        toast.success("Preset updated successfully.");
      } else {
        const formData = new FormData();
        formData.append('profile_pic', fileOrPresetUrl);
        const response = await api.put(`/api/accounts/profile/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data.success) {
          toast.success("Custom profile asset saved.");
        }
      }
      setIsAvatarModalOpen(false);
    } catch (e) {
      toast.error("Failed to commit network update for avatar image.");
    }
  };

  const saveProfileDetails = async (updatedData: any) => {
    try {
      setUserDetails(updatedData);
      toast.success("Ecosystem metrics updated locally.");
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

  const saveSkillsCuration = (updatedSkillsList: SkillObject[]) => {
    setUserDetails((prev) => (prev ? { ...prev, skills: updatedSkillsList } : null));
    toast.success("Capabilities matrix configuration updated.");
    setIsSkillsModalOpen(false);
  };

  // ADDED: Callback method to save updated social links payload
  const saveSocialLinks = async (updatedLinksList: SocialLink[]) => {
    try {
      // 1. Persist mutation changes to local runtime state layout first
      setUserDetails((prev) => (prev ? { ...prev, social_links: updatedLinksList } : null));

      // 2. Optional API payload sync backend channel if required:
      // await api.put(`/api/accounts/links/${id}`, { links: updatedLinksList });

      toast.success("Network integration routing configurations updated.");
    } catch (e) {
      toast.error("Failed to synchronize social network pipeline configurations.");
    }
  };

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
              onEditClick={() => setIsBadgeModalOpen(true)}
            />
            <SkillsSideSection_ProfileDisplay
              loading={loading}
              skills={userDetails?.skills}
              onEditClick={isOwner ? () => setIsSkillsModalOpen(true) : undefined}
            />
            {/* FIXED: Attached saveSocialLinks callback and user validation wrapper */}
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

      {/* Active Curation Selector Hub Modal Overlay Layout Block */}
      <BadgeEditModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        currentlyDisplayedBadges={userDetails?.badges || []}
        onSave={saveSelectedBadges}
      />

      {/* Standalone Skills Matrix Curation Modal Overlay */}
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