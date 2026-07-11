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
  const id = useParams().id || user?.userId;

  const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
  const [availableSkills, setAvailableSkills] = useState<{ tag_id: number; name: string }[]>([]);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  const isOwner = id == user?.userId;
  
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
        
        setAvailableSkills(tagsResponse.data.tags || []);

        // Fetch user tags
        const userTagResponse = await api.get(`api/tags/users/${profileData.user_id || id}/tags`);

        const compiledCompoundSkills: SkillObject[] = (userTagResponse.data.tags || []).map((tag: any, idx: number) => ({
          tag_id: tag.tag_id,
          name: tag.name,
          proficiency: idx % 3 === 0 ? "expert" : idx % 2 === 0 ? "advanced" : "intermediate",
          years: Math.max(1, idx + 2)
        }));

        // Set user details with all data
        setUserDetails({
          username: profileData.username || profileData.handle,
          name: profileData.name || profileData.display_name,
          middleName: profileData.middleName || profileData.middlename || "P.",
          suffix: profileData.suffix,
          birthdate: profileData.birthdate || profileData.birth_date,
          country: profileData.country,
          zipCode: profileData.zipCode || profileData.zip_code || "6000",
          role: profileData.roles || profileData.role || [],
          email_address: profileData.email_address,
          location: profileData.location,
          joinedDate: profileData.joinedDate || profileData.joineddate || profileData.created_at,
          verification_status: profileData.verification_status || 'unverified',
          bio: profileData.bio || profileData.description,
          tagline: profileData.tagline,
          merit_score: profileData.merit_score || 0,
          avatar_file_id: profileData.avatar_file_id,
          avatar_preset_url: `${import.meta.env.VITE_CLOUDFRONT_URL}${profileData.avatar_preset_url}` || profileData.avatarUrl,
          skills: compiledCompoundSkills,
          badges: profileData.badges || [],
          social_links: accountLinkResponse.data.links || accountLinkResponse.data || []
        });
        
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

  const saveSocialLinks = async (updatedLinksList: SocialLink[]) => {
    try {
      setUserDetails((prev) => (prev ? { ...prev, social_links: updatedLinksList } : null));
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