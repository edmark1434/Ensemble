import {
  User,
  Mail,
  MapPin,
  Calendar,
  Award,
  Star,
  Briefcase,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Edit2,
  CheckCircle,
  TrendingUp,
  Users,
  MessageCircle,
  Heart,
  Share2,
  MoreVertical,
  Clock,
  X,
  PlusCircle,
  Globe,
  Link2,
  AtSign,
  Shield,
  Tag,
  Search,
} from "lucide-react";
// Import Simple Icons for social media platforms
import {
  SiYoutube,
  SiTiktok,
  SiVimeo,
  SiInstagram,
  SiFacebook,
  SiTwitch,
  SiReddit,
  SiDiscord,
  SiGithub,
  SiDribbble,
  SiPinterest,
  SiSnapchat,
  SiSpotify,
  SiSoundcloud,
  SiFiverr,
  SiUpwork,
} from "@icons-pack/react-simple-icons";
import UserHeader from "@/components/nav/user_header";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import toast from "react-hot-toast";

type TabType = "portfolio" | "services" | "job-posts" | "projects" | "assets" | "history";

type Tag = {
  tag_id: number;
  name: string;
};

type SkillObject = {
  tag_id: number;
  name: string;
};

type SocialLink = {
  account_link_id?: number;
  platform: string;
  url: string;
};

type UserDetail = {
  name: string;
  email_address: string;
  location: string;
  joinedDate: string;
  verification_status: string;
  bio: string;
  tagline: string;
  merit_score: number;
  avatar_file_id: number | null;
  skills?: SkillObject[];
  badges?: { name: string; description: string; icon: string }[];
  social_links?: SocialLink[];
};

type EditSection = "full" | "bio" | "tagline" | "skills" | "profile-pic" | "social-links";

// Helper function for info toasts
const showInfoToast = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#1e293b',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
  });
};

// Skills Selector Component
const SkillsSelector = ({ 
  selectedSkills, 
  onSkillsChange,
  availableSkills = []
}: { 
  selectedSkills: SkillObject[]; 
  onSkillsChange: (skills: SkillObject[]) => void;
  availableSkills: Tag[];
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get skill names for display
  const selectedSkillNames = selectedSkills.map(s => s.name);
  
  // Filter skills based on search term
  const filteredSkills = availableSkills.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedSkillNames.includes(tag.name)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addSkill = (tag: Tag) => {
    if (!selectedSkillNames.includes(tag.name)) {
      onSkillsChange([...selectedSkills, { tag_id: tag.tag_id, name: tag.name }]);
      setSearchTerm("");
      setIsOpen(false);
    }
  };

  const removeSkill = (skillToRemove: SkillObject) => {
    onSkillsChange(selectedSkills.filter(skill => skill.tag_id !== skillToRemove.tag_id));
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search and add skills..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 pl-10 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#1a1d2e] shadow-xl">
          {filteredSkills.length > 0 ? (
            filteredSkills.map((tag) => (
              <button
                key={tag.tag_id}
                onClick={() => addSkill(tag)}
                className="flex w-full items-center px-4 py-2 text-sm text-white transition hover:bg-blue-500/20 hover:text-blue-400"
              >
                <PlusCircle className="mr-2 h-3.5 w-3.5 text-blue-400" />
                {tag.name}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-zinc-500">
              {searchTerm ? `No skills found matching "${searchTerm}"` : "Type to search for skills"}
            </div>
          )}
        </div>
      )}

      {/* Selected Skills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedSkills.length === 0 ? (
          <p className="text-sm text-zinc-500">No skills selected yet.</p>
        ) : (
          selectedSkills.map((skill) => (
            <span
              key={skill.tag_id}
              className="group flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-400"
            >
              {skill.name}
              <button
                onClick={() => removeSkill(skill)}
                className="ml-1 text-blue-300 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
};

// Social Media Platforms with proper icons (using Simple Icons)
const SOCIAL_PLATFORMS = [
  { value: "youtube", label: "YouTube", icon: SiYoutube },
  { value: "tiktok", label: "TikTok", icon: SiTiktok },
  { value: "vimeo", label: "Vimeo", icon: SiVimeo },
  { value: "twitter", label: "Twitter", icon: SiFacebook },
  { value: "instagram", label: "Instagram", icon: SiInstagram },
  { value: "facebook", label: "Facebook", icon: SiFacebook },
  { value: "twitch", label: "Twitch", icon: SiTwitch },
  { value: "reddit", label: "Reddit", icon: SiReddit },
  { value: "discord", label: "Discord", icon: SiDiscord },
  { value: "github", label: "GitHub", icon: SiGithub },
  { value: "linkedin", label: "LinkedIn", icon: SiSoundcloud },
  { value: "dribbble", label: "Dribbble", icon: SiDribbble },
  { value: "pinterest", label: "Pinterest", icon: SiPinterest },
  { value: "snapchat", label: "Snapchat", icon: SiSnapchat },
  { value: "spotify", label: "Spotify", icon: SiSpotify },
  { value: "soundcloud", label: "SoundCloud", icon: SiSoundcloud },
  { value: "fiverr", label: "Fiverr", icon: SiFiverr },
  { value: "upwork", label: "Upwork", icon: SiUpwork },
  { value: "other", label: "Other", icon: Link2 },
];

// Static Data - Only 1 item per tab
const portfolioItems = [
  {
    id: 1,
    title: "Corporate Brand Identity",
    description: "Complete brand identity design for a tech startup",
    type: "image" as const,
    thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Brand+Identity",
    likes: 234,
    views: 1234,
  },
];

const services = [
  {
    id: 1,
    title: "Professional Logo Design",
    description: "Unique, modern logo design with 3 concepts and unlimited revisions",
    price: 499,
    deliveryTime: "3 days",
    rating: 4.9,
    orders: 127,
  },
];

const projects = [
  {
    id: 1,
    title: "Tech Startup Branding",
    client: "InnovateTech",
    status: "completed" as const,
    budget: 1500,
    deadline: "2024-12-15",
  },
];

const assets = [
  {
    id: 1,
    title: "Premium Logo Templates",
    type: "image" as const,
    credits: 299,
    downloads: 1234,
    rating: 4.8,
  },
];

const reviews = [
  {
    id: 1,
    reviewerName: "Sarah Johnson",
    reviewerAvatar: "https://i.pravatar.cc/150?u=sarah",
    rating: 5,
    comment: "Excellent work! John delivered the logo designs ahead of schedule.",
    date: "2024-12-15",
    type: "received" as const,
    projectTitle: "Logo Design for Tech Startup",
  },
];

const history = [
  { 
    id: 1, 
    action: "Service Sale - Logo Design", 
    date: "2024-12-18", 
    amount: 499, 
    type: "credit" as const, 
    status: "completed" as const 
  },
];

const tabOptions: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "portfolio", label: "Portfolio", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  { key: "services", label: "Services", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "job-posts", label: "Job Posts", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "projects", label: "Projects", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "history", label: "History", icon: <Clock className="h-3.5 w-3.5" /> },
];

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("portfolio");
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const user = useGlobalState((state) => state.user);
  const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
  const id = useParams().id || user?.account_id;
  const [availableSkills, setAvailableSkills] = useState<Tag[]>([]);
  const originalSkillsRef = useRef<SkillObject[]>([]);
  const originalSocialLinksRef = useRef<SocialLink[]>([]);
  const originalProfileBioRef = useRef<string>("");
  const originalProfileTaglineRef = useRef<string>("");
  const originalProfilePicRef = useRef<number | null>(null);

  // Check if current user owns this profile
  const isOwner = id == user?.account_id;

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<EditSection>("full");
  const [editFormData, setEditFormData] = useState({
    bio: "",
    tagline: "",
    skills: [] as SkillObject[],
    profilePic: null as File | null,
    socialLinks: [] as SocialLink[],
  });
  const [newSkill, setNewSkill] = useState("");
  const [newSocialLink, setNewSocialLink] = useState({ platform: "", url: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [isUser, profileResponse, tagsResponse, accountLinkResponse] = await Promise.all([
          api.get(`/api/accounts/check-user/${id}`),
          api.get(`/api/accounts/profile/${id}`),
          api.get(`/api/tags/`),
          api.get(`api/accounts/links/${id}`)
        ]);
        const isCurrentUser = isUser.data.isUser;
        const profileData = profileResponse.data.profile;
        const tagsData = tagsResponse.data.tags;
        const accountLinks = accountLinkResponse.data.links;
        const userTagResponse = await api.get(`api/tags/users/${profileData.user_id}/tags`);
        const userTagsData = userTagResponse.data.tags;
        if (!isCurrentUser) { 
          toast.error("Profile not found."); 
          navigate("/*");
        }
        
        originalSkillsRef.current = userTagsData.map((tag: Tag) => ({ tag_id: tag.tag_id, name: tag.name }));
        originalSocialLinksRef.current = accountLinks || [];
        originalProfileBioRef.current = profileData.bio || "";
        originalProfileTaglineRef.current = profileData.tagline || "";
        originalProfilePicRef.current = profileData.profile_pic_id || null;
        
        // Set the available skills from the API
        setAvailableSkills(tagsData);
        
        // Convert user tags to SkillObject format
        const userSkills = userTagsData.map((tag: Tag) => ({ 
          tag_id: tag.tag_id, 
          name: tag.name 
        }));
        
        setUserDetails({
          ...profileData,
          joinedDate: profileData.created_at,
          skills: userSkills,
          badges: profileData.badges || [],
          social_links: accountLinks || []
        });

      } catch (err:any) {
        if(err.response && err.response.status === 404) {
          toast.error("Profile not found.");
          navigate("/*");
        } else {
          console.error('Error fetching profile:', err);
          toast.error("Failed to load profile. Please try again.");
        }
      }
    };
    fetchProfile();
  }, [id, user?.userId]);

  const handleEditClick = (section: EditSection = "full") => {
    if (userDetails) {
      setEditFormData({
        bio: userDetails.bio || "",
        tagline: userDetails.tagline || "",
        skills: userDetails.skills || [],
        profilePic: null,
        socialLinks: userDetails.social_links || [],
      });
      setEditSection(section);
      setIsEditModalOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !editFormData.skills.some(s => s.name === newSkill.trim())) {
      // Find the tag_id for this skill
      const foundTag = availableSkills.find(tag => tag.name.toLowerCase() === newSkill.trim().toLowerCase());
      const newSkillObj: SkillObject = {
        tag_id: foundTag?.tag_id || 0,
        name: newSkill.trim()
      };
      setEditFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkillObj]
      }));
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setEditFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.name !== skillToRemove)
    }));
  };

  const handleAddSocialLink = () => {
    if (newSocialLink.platform && newSocialLink.url.trim()) {
      // Check if platform already exists
      if (editFormData.socialLinks.some(link => link.platform.toLowerCase() === newSocialLink.platform.toLowerCase())) {
        toast.error("This platform is already added");
        return;
      }
      setEditFormData(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, { 
          platform: newSocialLink.platform, 
          url: newSocialLink.url.trim() 
        }]
      }));
      setNewSocialLink({ platform: "", url: "" });
    } else {
      toast.error("Please select a platform and enter a URL");
    }
  };

  const handleRemoveSocialLink = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    setEditFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditFormData(prev => ({
        ...prev,
        profilePic: e.target.files![0]
      }));
    }
  };

  // ============================================
  // INDIVIDUAL SAVE FUNCTIONS FOR EACH SECTION
  // ============================================

  // Save Bio Only
  const saveBio = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        bio: editFormData.bio,
        originalBio: originalProfileBioRef.current
      };
      
      const response = await api.put(`/api/accounts/profile/${id}`, payload);

      if (response.data.success) {
        if (response.data.message === 'No changes detected') {
          showInfoToast('No changes to save');
          setIsEditModalOpen(false);
          return;
        }
        
        originalProfileBioRef.current = editFormData.bio;
        setUserDetails(prev => ({ ...prev!, bio: editFormData.bio }));
        toast.success(response.data.message || "Bio updated successfully!");
        setIsEditModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to update bio");
      }
    } catch (error: any) {
      console.error("Error updating bio:", error);
      toast.error(error.response?.data?.message || "Failed to update bio. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Tagline Only
  const saveTagline = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        tagline: editFormData.tagline,
        originalTagline: originalProfileTaglineRef.current
      };
      
      const response = await api.put(`/api/accounts/profile/${id}`, payload);

      if (response.data.success) {
        if (response.data.message === 'No changes detected') {
          showInfoToast('No changes to save');
          setIsEditModalOpen(false);
          return;
        }
        
        originalProfileTaglineRef.current = editFormData.tagline;
        setUserDetails(prev => ({ ...prev!, tagline: editFormData.tagline }));
        toast.success(response.data.message || "Tagline updated successfully!");
        setIsEditModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to update tagline");
      }
    } catch (error: any) {
      console.error("Error updating tagline:", error);
      toast.error(error.response?.data?.message || "Failed to update tagline. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Skills Only
  const saveSkills = async () => {
    if (editFormData.skills.length === 0) {
      toast.error("Please add at least one skill");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        skills: editFormData.skills,
        originalSkills: originalSkillsRef.current
      };
      
      const response = await api.put(`/api/accounts/profile/${id}`, payload);

      if (response.data.success) {
        if (response.data.message === 'No changes detected') {
          showInfoToast('No changes to save');
          setIsEditModalOpen(false);
          return;
        }
        
        originalSkillsRef.current = editFormData.skills;
        setUserDetails(prev => ({ ...prev!, skills: editFormData.skills }));
        toast.success(response.data.message || "Skills updated successfully!");
        setIsEditModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to update skills");
      }
    } catch (error: any) {
      console.error("Error updating skills:", error);
      const errorMessage = error.response?.data?.message || "Failed to update skills. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Profile Picture Only
  const saveProfilePicture = async () => {
    if (!editFormData.profilePic) {
      toast.error("Please select a profile picture");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('profile_pic', editFormData.profilePic);
      formData.append('originalAvatarFileId', String(originalProfilePicRef.current || ''));
      
      const response = await api.put(`/api/accounts/profile/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        if (response.data.message === 'No changes detected') {
          showInfoToast('No changes to save');
          setIsEditModalOpen(false);
          return;
        }
        
        toast.success(response.data.message || "Profile picture updated successfully!");
        setIsEditModalOpen(false);
        // Refetch profile to update avatar
        const profileResponse = await api.get(`/api/accounts/profile/${id}`);
        const newAvatarId = profileResponse.data.profile.avatar_file_id;
        originalProfilePicRef.current = newAvatarId;
        setUserDetails(prev => ({
          ...prev!,
          avatar_file_id: newAvatarId
        }));
      } else {
        toast.error(response.data.message || "Failed to update profile picture");
      }
    } catch (error: any) {
      console.error("Error updating profile picture:", error);
      toast.error(error.response?.data?.message || "Failed to update profile picture. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Social Links Only
  const saveSocialLinks = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        social_links: editFormData.socialLinks,
        originalSocialMedia: originalSocialLinksRef.current
      };
      
      const response = await api.put(`/api/accounts/profile/${id}`, payload);

      if (response.data.success) {
        if (response.data.message === 'No changes detected') {
          showInfoToast('No changes to save');
          setIsEditModalOpen(false);
          return;
        }
        
        originalSocialLinksRef.current = editFormData.socialLinks;
        setUserDetails(prev => ({ ...prev!, social_links: editFormData.socialLinks }));
        toast.success(response.data.message || "Social links updated successfully!");
        setIsEditModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to update social links");
      }
    } catch (error: any) {
      console.error("Error updating social links:", error);
      
      // Check for URL validation errors
      const errorMessage = error.response?.data?.message || "";
      if (errorMessage.includes('Invalid URL') || 
          errorMessage.includes('URL is required') ||
          errorMessage.includes('Invalid domain')) {
        toast.error(errorMessage);
      } else {
        toast.error("Failed to update social links. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // MAIN SAVE FUNCTION FOR ALL FIELDS
  // ============================================
  const handleSubmitEdit = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        bio: editFormData.bio,
        originalBio: originalProfileBioRef.current,
        tagline: editFormData.tagline,
        originalTagline: originalProfileTaglineRef.current,
        skills: editFormData.skills,
        originalSkills: originalSkillsRef.current,
        social_links: editFormData.socialLinks,
        originalSocialMedia: originalSocialLinksRef.current
      };
      
      const response = await api.put(`/api/accounts/profile/${id}`, payload);

      if (response.data.success) {
        if (response.data.message === 'No changes detected') {
          showInfoToast('No changes to save');
          setIsEditModalOpen(false);
          return;
        }
        
        originalSkillsRef.current = editFormData.skills;
        originalSocialLinksRef.current = editFormData.socialLinks;
        originalProfileBioRef.current = editFormData.bio;
        originalProfileTaglineRef.current = editFormData.tagline;
        
        setUserDetails(prev => ({
          ...prev!,
          bio: editFormData.bio,
          tagline: editFormData.tagline,
          skills: editFormData.skills,
          social_links: editFormData.socialLinks,
        }));
        toast.success(response.data.message || "Profile updated successfully!");
        setIsEditModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage = error.response?.data?.message || "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // HANDLE SAVE BASED ON EDIT SECTION
  // ============================================
  const handleSave = () => {
    switch (editSection) {
      case "bio":
        saveBio();
        break;
      case "tagline":
        saveTagline();
        break;
      case "skills":
        saveSkills();
        break;
      case "profile-pic":
        saveProfilePicture();
        break;
      case "social-links":
        saveSocialLinks();
        break;
      case "full":
      default:
        handleSubmitEdit();
        break;
    }
  };

  const getModalTitle = () => {
    switch (editSection) {
      case "bio": return "Edit Bio";
      case "tagline": return "Edit Tagline";
      case "skills": return "Edit Skills";
      case "profile-pic": return "Edit Profile Picture";
      case "social-links": return "Edit Social Links";
      default: return "Edit Profile";
    }
  };

  const getPlatformIcon = (platform: string) => {
    const found = SOCIAL_PLATFORMS.find(p => p.value.toLowerCase() === platform.toLowerCase());
    if (found) {
      const IconComponent = found.icon;
      return <IconComponent className="h-3.5 w-3.5" />;
    }
    return <Link2 className="h-3.5 w-3.5" />;
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      youtube: "text-red-500",
      tiktok: "text-pink-500",
      vimeo: "text-blue-400",
      twitter: "text-blue-400",
      instagram: "text-pink-500",
      facebook: "text-blue-600",
      twitch: "text-purple-500",
      reddit: "text-orange-500",
      discord: "text-indigo-400",
      github: "text-gray-400",
      linkedin: "text-blue-500",
      dribbble: "text-pink-400",
      pinterest: "text-red-600",
      snapchat: "text-yellow-400",
      spotify: "text-green-400",
      soundcloud: "text-orange-400",
      fiverr: "text-green-500",
      upwork: "text-green-600",
    };
    return colors[platform.toLowerCase()] || "text-zinc-400";
  };

  const getAssetIcon = (type: "audio" | "image" | "video") => {
    switch (type) {
      case "audio": return <Music className="h-3 w-3" />;
      case "image": return <ImageIcon className="h-3 w-3" />;
      case "video": return <Video className="h-3 w-3" />;
      default: return null;
    }
  };

  const getAssetColor = (type: "audio" | "image" | "video") => {
    switch (type) {
      case "audio": return "bg-purple-500/20 text-purple-400";
      case "image": return "bg-green-500/20 text-green-400";
      case "video": return "bg-red-500/20 text-red-400";
      default: return "bg-blue-500/20 text-blue-400";
    }
  };

  const getStatusColor = (status: "completed" | "in-progress" | "pending") => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-400";
      case "in-progress": return "bg-blue-500/20 text-blue-400";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getHistoryStatusColor = (status?: "completed" | "pending" | "failed") => {
    switch (status) {
      case "completed": return "text-green-400";
      case "pending": return "text-yellow-400";
      case "failed": return "text-red-400";
      default: return "text-zinc-400";
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
        <span className="ml-1 text-xs text-zinc-400">{rating}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Profile" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="mx-auto md:mx-0">
                <div className="h-32 w-32 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
                <div className="h-4 w-64 animate-pulse rounded-lg bg-white/5" />
                <div className="flex flex-wrap gap-4">
                  <div className="h-4 w-32 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-4 w-32 animate-pulse rounded-lg bg-white/5" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 h-5 w-24 animate-pulse rounded bg-white/10" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-white/5" />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
                ))}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1].map((i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 h-40 w-full animate-pulse rounded-lg bg-white/10" />
                    <div className="h-5 w-32 animate-pulse rounded-lg bg-white/10" />
                    <div className="mt-2 h-4 w-full animate-pulse rounded-lg bg-white/5" />
                    <div className="mt-3 flex items-center justify-between">
                      <div className="h-4 w-20 animate-pulse rounded-lg bg-white/5" />
                      <div className="h-8 w-16 animate-pulse rounded-lg bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const receivedReviews = reviews.filter(r => r.type === "received");
  const avgRating = receivedReviews.length > 0 
    ? receivedReviews.reduce((sum, r) => sum + r.rating, 0) / receivedReviews.length 
    : 0;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle="Profile" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Profile Header */}
        <div className="group relative mb-6 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 transition-all duration-300 hover:border-white/20">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="relative mx-auto md:mx-0">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-0.5">
                <div className="h-full w-full rounded-full bg-[#080a12] flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {userDetails?.name?.charAt(0) || "U"}
                  </span>
                </div>
              </div>
              {isOwner && (
                <button 
                  onClick={() => handleEditClick("profile-pic")}
                  className="absolute bottom-0 right-0 rounded-full bg-blue-500 p-1.5 text-white transition hover:bg-blue-600"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">{userDetails?.name || "User"}</h1>
                    <div className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> 
                      {userDetails?.verification_status} 
                    </div>
                  </div>
                  
                  {/* Tagline Section */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-blue-400" />
                    <p className="text-sm text-blue-400 italic">
                      {userDetails?.tagline || "No Tagline Provided"}
                    </p>
                    {isOwner && (
                      <button 
                        onClick={() => handleEditClick("tagline")}
                        className="ml-1 text-blue-400/50 hover:text-blue-400 transition"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-sm text-zinc-400 mt-1">{userDetails?.email_address || "user@example.com"}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {userDetails?.location || "No location specified"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {userDetails?.joinedDate ? `Joined ${new Date(userDetails.joinedDate).toLocaleDateString()}` : "Join date unknown"}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400 transition hover:bg-yellow-500/30">
                      <Shield className="h-3 w-3" />
                      Verify Profile
                    </button>
                    <button className="rounded-full border border-white/15 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleEditClick("full")}
                      className="rounded-full border border-white/15 bg-white/5 p-2 text-blue-400 transition hover:bg-blue-500/20 hover:text-blue-300"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-zinc-300 flex-1">
                    {userDetails?.bio || "No bio provided."}
                  </p>
                  {isOwner && (
                    <button 
                      onClick={() => handleEditClick("bio")}
                      className="ml-2 text-blue-400/50 hover:text-blue-400 transition flex-shrink-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-7">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">{userDetails?.merit_score?.toFixed(1) || "0.0"}</div>
              <div className="text-xs text-zinc-500">Merit Score</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">{avgRating.toFixed(1)}</div>
              <div className="text-xs text-zinc-500">Rating</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">{receivedReviews.length}</div>
              <div className="text-xs text-zinc-500">Reviews</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">3</div>
              <div className="text-xs text-zinc-500">Upvoted Assets</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">3</div>
              <div className="text-xs text-zinc-500">As Client</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">3</div>
              <div className="text-xs text-zinc-500">As Freelancer</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">6</div>
              <div className="text-xs text-zinc-500">Total Jobs</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Skills</h3>
                {isOwner && (
                  <button 
                    onClick={() => handleEditClick("skills")}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(userDetails?.skills || []).length === 0 ? (
                  <p className="text-sm text-center text-zinc-500">No skills added.</p>
                ) : (
                  (userDetails?.skills || []).map((skill) => (
                    <span key={skill.tag_id} className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-400">
                      {skill.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Badges</h3>
              </div>
              <div className="space-y-2">
                {(userDetails?.badges || []).length === 0 ? (
                  <p className="text-sm text-center text-zinc-500">No badges earned yet.</p>
                ) : (
                  (userDetails?.badges || []).map((badge, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-2">
                      <Award className="h-4 w-4 text-yellow-400" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-white">{badge.name}</p>
                        <p className="text-[10px] text-zinc-500">{badge.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Rating Breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: "Communication", value: 4.8 },
                  { label: "Quality", value: 4.9 },
                  { label: "Delivery Time", value: 4.7 },
                  { label: "Value", value: 4.8 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white">{item.value}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Social Links</h3>
                {isOwner && (
                  <button 
                    onClick={() => handleEditClick("social-links")}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(userDetails?.social_links || []).length === 0 ? (
                  <p className="text-sm text-center text-zinc-500">No social links added.</p>
                ) : (
                  (userDetails?.social_links || []).map((link) => {
                    const platform = SOCIAL_PLATFORMS.find(p => 
                      p.value.toLowerCase() === link.platform.toLowerCase()
                    );
                    return (
                      <a 
                        key={link.account_link_id || link.platform}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs transition hover:text-blue-400 ${getPlatformColor(link.platform)}`}
                      >
                        {platform ? (
                          <platform.icon className="h-3.5 w-3.5" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        <span className="text-zinc-400 hover:text-inherit">{link.url}</span>
                      </a>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div>
            <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "portfolio" && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {portfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:scale-[1.02]"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />
                      
                      {item.type === "video" && (
                        <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                          <Video className="inline h-3 w-3 mr-1" />
                          Video
                        </div>
                      )}
                      
                      <button className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-zinc-400 transition hover:text-red-400 backdrop-blur-sm">
                        <Heart className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="p-4">
                      <h3 className="mb-1 text-sm font-semibold text-white">{item.title}</h3>
                      <p className="mb-3 text-xs text-zinc-400 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {item.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {item.views}
                          </span>
                        </div>
                        <button className="text-blue-400 hover:text-blue-300">View Details →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "services" && (
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{service.title}</h3>
                          {renderStars(service.rating)}
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{service.description}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                          <span>⏱️ {service.deliveryTime}</span>
                          <span>📦 {service.orders} orders</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{service.price} Credits</div>
                        <button className="mt-2 rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600">
                          Order Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "job-posts" && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                <Briefcase className="mb-3 h-8 w-8 text-zinc-500" />
                <h3 className="text-lg font-semibold text-white">No Job Posts Yet</h3>
                <p className="mt-1 text-sm text-zinc-400">You haven't posted any jobs yet.</p>
                <button className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600">
                  <PlusCircle className="inline h-4 w-4 mr-1" />
                  Post a Job
                </button>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{project.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">Client: {project.client}</p>
                        <p className="text-xs text-zinc-500">Deadline: {project.deadline}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{project.budget} Credits</div>
                        <button className="mt-2 text-xs text-blue-400 hover:text-blue-300">View Details →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "assets" && (
              <div className="space-y-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${getAssetColor(asset.type)}`}>
                          {getAssetIcon(asset.type)}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">{asset.title}</h3>
                          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                            <span>📥 {asset.downloads} downloads</span>
                            {renderStars(asset.rating)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{asset.credits} Credits</div>
                        <button className="mt-2 rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600">
                          Edit Asset
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-white">Reviews & Ratings</h3>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                        <div className="flex items-start gap-3">
                          <img src={review.reviewerAvatar} alt={review.reviewerName} className="h-10 w-10 rounded-full object-cover" />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-white">{review.reviewerName}</p>
                                <p className="text-xs text-zinc-500">{review.date}</p>
                              </div>
                              {renderStars(review.rating)}
                            </div>
                            {review.projectTitle && (
                              <p className="mt-1 text-xs text-blue-400">Project: {review.projectTitle}</p>
                            )}
                            <p className="mt-2 text-sm text-zinc-300">{review.comment}</p>
                            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] ${
                              review.type === "received" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"
                            }`}>
                              {review.type === "received" ? "Received Review" : "Given Review"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-white">Transaction History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-white/10">
                        <tr className="text-left text-xs text-zinc-500">
                          <th className="pb-3 font-medium">Action</th>
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item.id} className="border-b border-white/5">
                            <td className="py-3 text-sm text-white">{item.action}</td>
                            <td className="py-3 text-xs text-zinc-500">{item.date}</td>
                            <td className="py-3">
                              <span className={`text-xs font-medium ${getHistoryStatusColor(item.status)}`}>
                                {item.status === "completed" ? "✓ Completed" : "⏳ Pending"}
                              </span>
                            </td>
                            <td className={`py-3 text-right text-sm font-medium ${item.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                              {item.type === "credit" ? "+" : "-"}{item.amount} Credits
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#080a12] p-6 shadow-2xl">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-zinc-400 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-6 text-2xl font-bold text-white">{getModalTitle()}</h2>

            <div className="space-y-6">
              {/* Profile Picture - Only show for full edit or profile-pic section */}
              {(editSection === "full" || editSection === "profile-pic") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-0.5">
                      <div className="h-full w-full rounded-full bg-[#080a12] flex items-center justify-center">
                        {editFormData.profilePic ? (
                          <img 
                            src={URL.createObjectURL(editFormData.profilePic)} 
                            alt="Profile preview" 
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {userDetails?.name?.charAt(0) || "U"}
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-500/30"
                    >
                      Choose Image
                    </button>
                    {editFormData.profilePic && (
                      <button
                        onClick={() => setEditFormData(prev => ({ ...prev, profilePic: null }))}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tagline - Only show for full edit or tagline section */}
              {(editSection === "full" || editSection === "tagline") && (
                <div>
                  <label htmlFor="tagline" className="mb-2 block text-sm font-medium text-zinc-300">
                    Tagline
                  </label>
                  <input
                    type="text"
                    id="tagline"
                    name="tagline"
                    value={editFormData.tagline}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Creative Designer & Developer"
                  />
                </div>
              )}

              {/* Bio - Only show for full edit or bio section */}
              {(editSection === "full" || editSection === "bio") && (
                <div>
                  <label htmlFor="bio" className="mb-2 block text-sm font-medium text-zinc-300">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={editFormData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              )}

              {/* Skills - Using the SkillsSelector component with dynamic skills from API */}
              {(editSection === "full" || editSection === "skills") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Skills</label>
                  <SkillsSelector 
                    selectedSkills={editFormData.skills}
                    onSkillsChange={(skills) => setEditFormData(prev => ({ ...prev, skills }))}
                    availableSkills={availableSkills}
                  />
                </div>
              )}

              {/* Social Links - Only show for full edit or social-links section */}
              {(editSection === "full" || editSection === "social-links") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Social Links</label>
                  
                  {/* Add new social link */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <select
                      value={newSocialLink.platform}
                      onChange={(e) => setNewSocialLink(prev => ({ ...prev, platform: e.target.value }))}
                      className="flex-1 rounded-lg border border-white/10 bg-[#1a1d2e] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                      style={{
                        colorScheme: 'dark',
                      }}
                    >
                      <option value="" className="bg-[#1a1d2e] text-zinc-400">Select Platform</option>
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <option key={platform.value} value={platform.value} className="bg-[#1a1d2e] text-white">
                          {platform.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={newSocialLink.url}
                      onChange={(e) => setNewSocialLink(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddSocialLink}
                      className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600 whitespace-nowrap"
                    >
                      <PlusCircle className="h-4 w-4 inline mr-1" />
                      Add Link
                    </button>
                  </div>

                  {/* List of social links */}
                  <div className="space-y-2">
                    {editFormData.socialLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">No social links added yet.</p>
                    ) : (
                      editFormData.socialLinks.map((link, index) => {
                        const platform = SOCIAL_PLATFORMS.find(p => 
                          p.value.toLowerCase() === link.platform.toLowerCase()
                        );
                        return (
                          <div key={link.account_link_id || index} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`flex-shrink-0 ${getPlatformColor(link.platform)}`}>
                                {platform ? (
                                  <platform.icon className="h-4 w-4" />
                                ) : (
                                  <Link2 className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">
                                  {platform ? platform.label : link.platform}
                                </p>
                                <input
                                  type="text"
                                  value={link.url}
                                  onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                                  className="w-full mt-1 rounded-lg border border-white/10 bg-[#1a1d2e] px-2 py-1 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Enter URL..."
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveSocialLink(index)}
                              className="text-red-400 transition hover:text-red-300 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;