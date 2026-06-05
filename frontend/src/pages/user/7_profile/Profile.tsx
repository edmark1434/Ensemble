import {
  User,
  Mail,
  MapPin,
  Calendar,
  Award,
  Star,
  ThumbsUp,
  Briefcase,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  ExternalLink,
  Edit2,
  CheckCircle,
  TrendingUp,
  Users,
  MessageCircle,
  Heart,
  Share2,
  MoreVertical,
  Clock,
  Filter,
  ChevronDown,
  X,
  PlusCircle,
  Globe,
  Link2,
  AtSign,
  Shield,
  Camera,
  Smartphone,
  IdCard,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalState from "@/lib/global_state";

// Types
type TabType = "portfolio" | "services" | "job-posts" | "projects" | "assets" | "history";

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  type: "image" | "video";
  thumbnail: string;
  likes: number;
  views: number;
}

interface ServiceItem {
  id: number;
  title: string;
  description: string;
  price: number;
  deliveryTime: string;
  rating: number;
  orders: number;
}

interface ProjectItem {
  id: number;
  title: string;
  client: string;
  status: "completed" | "in-progress" | "pending";
  budget: number;
  deadline: string;
}

interface AssetItem {
  id: number;
  title: string;
  type: "audio" | "image" | "video";
  credits: number;
  downloads: number;
  rating: number;
}

interface Review {
  id: number;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  date: string;
  type: "received" | "given";
  projectTitle?: string;
}

interface HistoryItem {
  id: number;
  action: string;
  date: string;
  amount: number;
  type: "credit" | "debit";
  status?: "completed" | "pending" | "failed";
}

// Mock Data
const portfolioItems: PortfolioItem[] = [
  {
    id: 1,
    title: "Corporate Brand Identity",
    description: "Complete brand identity design for a tech startup",
    type: "image",
    thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Brand+Identity",
    likes: 234,
    views: 1234,
  },
  {
    id: 2,
    title: "Motion Graphics Reel",
    description: "Showreel of motion graphics work for social media",
    type: "video",
    thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Motion+Graphics",
    likes: 567,
    views: 3456,
  },
  {
    id: 3,
    title: "Logo Design Collection",
    description: "Various logo designs for different industries",
    type: "image",
    thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Logo+Designs",
    likes: 892,
    views: 5678,
  },
  {
    id: 4,
    title: "Explainer Video",
    description: "2D animated explainer video for a mobile app",
    type: "video",
    thumbnail: "https://placehold.co/600x400/1e2130/4a6fa5?text=Explainer+Video",
    likes: 445,
    views: 7890,
  },
];

const services: ServiceItem[] = [
  {
    id: 1,
    title: "Professional Logo Design",
    description: "Unique, modern logo design with 3 concepts and unlimited revisions",
    price: 499,
    deliveryTime: "3 days",
    rating: 4.9,
    orders: 127,
  },
  {
    id: 2,
    title: "Complete Brand Identity",
    description: "Full brand package including logo, colors, typography, and guidelines",
    price: 1299,
    deliveryTime: "7 days",
    rating: 5.0,
    orders: 89,
  },
  {
    id: 3,
    title: "Motion Graphics Animation",
    description: "Custom motion graphics for social media or web",
    price: 799,
    deliveryTime: "5 days",
    rating: 4.8,
    orders: 56,
  },
];

const projects: ProjectItem[] = [
  {
    id: 1,
    title: "Tech Startup Branding",
    client: "InnovateTech",
    status: "completed",
    budget: 1500,
    deadline: "2024-12-15",
  },
  {
    id: 2,
    title: "E-commerce Website Design",
    client: "Shopify Store",
    status: "in-progress",
    budget: 2500,
    deadline: "2025-01-20",
  },
  {
    id: 3,
    title: "Social Media Campaign",
    client: "Fashion Brand",
    status: "pending",
    budget: 800,
    deadline: "2025-01-10",
  },
];

const assets: AssetItem[] = [
  {
    id: 1,
    title: "Premium Logo Templates",
    type: "image",
    credits: 299,
    downloads: 1234,
    rating: 4.8,
  },
  {
    id: 2,
    title: "Motion Graphics Pack",
    type: "video",
    credits: 499,
    downloads: 892,
    rating: 4.9,
  },
  {
    id: 3,
    title: "Sound Effects Library",
    type: "audio",
    credits: 199,
    downloads: 2341,
    rating: 4.7,
  },
];

const reviews: Review[] = [
  {
    id: 1,
    reviewerName: "Sarah Johnson",
    reviewerAvatar: "https://i.pravatar.cc/150?u=sarah",
    rating: 5,
    comment: "Excellent work! John delivered the logo designs ahead of schedule and exceeded my expectations.",
    date: "2024-12-15",
    type: "received",
    projectTitle: "Logo Design for Tech Startup",
  },
  {
    id: 2,
    reviewerName: "Michael Chen",
    reviewerAvatar: "https://i.pravatar.cc/150?u=michael",
    rating: 4.5,
    comment: "Great communication and quality work. Would recommend!",
    date: "2024-12-10",
    type: "received",
    projectTitle: "Brand Identity Package",
  },
  {
    id: 3,
    reviewerName: "Emily Rodriguez",
    reviewerAvatar: "https://i.pravatar.cc/150?u=emily",
    rating: 5,
    comment: "Amazing motion graphics work! Very professional.",
    date: "2024-12-05",
    type: "received",
    projectTitle: "Social Media Animation",
  },
  {
    id: 4,
    reviewerName: "You",
    reviewerAvatar: "https://i.pravatar.cc/150?u=john",
    rating: 5,
    comment: "Great client to work with! Clear requirements and prompt payment.",
    date: "2024-12-01",
    type: "given",
    projectTitle: "Website Design Project",
  },
];

const history: HistoryItem[] = [
  { id: 1, action: "Asset Purchase - Premium Templates", date: "2024-12-20", amount: 299, type: "debit", status: "completed" },
  { id: 2, action: "Service Sale - Logo Design", date: "2024-12-18", amount: 499, type: "credit", status: "completed" },
  { id: 3, action: "Project Payment - Brand Identity", date: "2024-12-15", amount: 1500, type: "credit", status: "completed" },
  { id: 4, action: "Asset Upload Fee", date: "2024-12-10", amount: 50, type: "debit", status: "completed" },
  { id: 5, action: "Withdrawal Request", date: "2024-12-08", amount: 500, type: "debit", status: "pending" },
];

const tabOptions: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "portfolio", label: "Portfolio", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  { key: "services", label: "Services", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "job-posts", label: "Job Posts", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "projects", label: "Projects", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "history", label: "History", icon: <Clock className="h-3.5 w-3.5" /> },
];

// Skeleton Components
const ProfileHeaderSkeleton = () => (
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
          <div className="h-4 w-32 animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);

const TabSkeleton = () => (
  <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
    ))}
  </div>
);

const CardSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="mb-3 h-40 w-full animate-pulse rounded-lg bg-white/10" />
    <div className="h-5 w-32 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-2 h-4 w-full animate-pulse rounded-lg bg-white/5" />
    <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-white/5" />
    <div className="mt-3 flex items-center justify-between">
      <div className="h-4 w-20 animate-pulse rounded-lg bg-white/5" />
      <div className="h-8 w-16 animate-pulse rounded-lg bg-white/10" />
    </div>
  </div>
);

// Edit Profile Modal Component
const EditProfileModal = ({ isOpen, onClose, profileData, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: profileData?.name || "John Paul Mahilom",
    email: profileData?.email || "jpmahilom24@gmail.com",
    location: profileData?.location || "Cebu, Philippines",
    bio: profileData?.bio || "Hi there! I'm Rexshimura, a professional Graphic Designer based in Cebu, Philippines. I specialize in designs that demand precision and a keen eye for detail.",
    skills: profileData?.skills || ["Problem Solving", "Graphic Designing", "Video Editing", "UI/UX Design", "Motion Graphics"],
    newSkill: "",
  });

  const [loading, setLoading] = useState(false);

  const addSkill = () => {
    if (formData.newSkill.trim() && !formData.skills.includes(formData.newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.newSkill.trim()],
        newSkill: "",
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s: string) => s !== skill),
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSave(formData);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0d0f1a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Edit Profile</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Bio</label>
            <textarea
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Skills</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills.map((skill: string) => (
                <span key={skill} className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.newSkill}
                onChange={(e) => setFormData({ ...formData, newSkill: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
                placeholder="Add a skill..."
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <button onClick={addSkill} className="rounded-lg bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600">
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Verification Modal Component
const VerificationModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState({
    email: "",
    phone: "",
    emailVerified: false,
    phoneVerified: false,
    idFile: null as File | null,
    idPreview: "",
    faceImage: null as File | null,
    facePreview: "",
  });

  const handleEmailVerification = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setVerificationData({ ...verificationData, emailVerified: true });
    setLoading(false);
  };

  const handlePhoneVerification = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setVerificationData({ ...verificationData, phoneVerified: true });
    setLoading(false);
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVerificationData({
        ...verificationData,
        idFile: file,
        idPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVerificationData({
        ...verificationData,
        faceImage: file,
        facePreview: URL.createObjectURL(file),
      });
    }
  };

  const handleSubmitVerification = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    onClose();
    // Show success message
    alert("Verification submitted successfully! We'll review your documents within 24-48 hours.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#0d0f1a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Identity Verification</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= s ? "bg-blue-500 text-white" : "bg-white/10 text-zinc-500"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 flex-1 ${step > s ? "bg-blue-500" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Email & Phone */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Email Verification</p>
                    <p className="text-xs text-zinc-500">john.doe@example.com</p>
                  </div>
                </div>
                {verificationData.emailVerified ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <button onClick={handleEmailVerification} disabled={loading} className="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                    Verify
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Phone Verification</p>
                    <p className="text-xs text-zinc-500">+63 XXX XXX 1234</p>
                  </div>
                </div>
                {verificationData.phoneVerified ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <button onClick={handlePhoneVerification} disabled={loading} className="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                    Verify
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!verificationData.emailVerified || !verificationData.phoneVerified}
              className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: ID Verification */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <label className="mb-2 block text-sm font-medium text-white">Upload Government ID</label>
              <div className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 p-6">
                {verificationData.idPreview ? (
                  <div className="relative">
                    <img src={verificationData.idPreview} alt="ID Preview" className="max-h-48 rounded-lg object-contain" />
                    <button
                      onClick={() => setVerificationData({ ...verificationData, idFile: null, idPreview: "" })}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <IdCard className="mb-2 h-8 w-8 text-zinc-500" />
                    <p className="text-sm text-zinc-400">Drag and drop or click to upload</p>
                    <p className="text-xs text-zinc-500">PNG, JPG up to 5MB</p>
                    <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" id="id-upload" />
                    <label htmlFor="id-upload" className="mt-2 cursor-pointer rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                      Select File
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                Back
              </button>
              <button onClick={() => setStep(3)} disabled={!verificationData.idFile} className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Face Liveliness Check */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <label className="mb-2 block text-sm font-medium text-white">Face Verification</label>
              <div className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 p-6">
                {verificationData.facePreview ? (
                  <div className="relative">
                    <img src={verificationData.facePreview} alt="Face Preview" className="max-h-48 rounded-lg object-contain" />
                    <button
                      onClick={() => setVerificationData({ ...verificationData, faceImage: null, facePreview: "" })}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera className="mb-2 h-8 w-8 text-zinc-500" />
                    <p className="text-center text-sm text-zinc-400">Take a selfie for liveliness check</p>
                    <p className="text-center text-xs text-zinc-500">Look straight at the camera</p>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFaceUpload} className="hidden" id="face-upload" />
                    <label htmlFor="face-upload" className="mt-2 cursor-pointer rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                      Take Photo
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                Back
              </button>
              <button onClick={handleSubmitVerification} disabled={!verificationData.faceImage || loading} className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50">
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit Verification"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Review History Component
const ReviewHistory = ({ reviews }: { reviews: Review[] }) => {
  const [filter, setFilter] = useState<"all" | "received" | "given">("all");

  const filteredReviews = reviews.filter(r => filter === "all" || r.type === filter);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3 w-3 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"}`} />
        ))}
        <span className="ml-1 text-xs text-zinc-400">{rating}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filter === "all" ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          All Reviews
        </button>
        <button
          onClick={() => setFilter("received")}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filter === "received" ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          Received
        </button>
        <button
          onClick={() => setFilter("given")}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filter === "given" ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          Given
        </button>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <MessageCircle className="mb-2 h-8 w-8 text-zinc-500" />
          <p className="text-sm text-zinc-400">No reviews yet</p>
        </div>
      ) : (
        filteredReviews.map((review) => (
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
        ))
      )}
    </div>
  );
};

// Main Component
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("portfolio");
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "John Paul Mahilom",
    email: "jpmahilom24@gmail.com",
    location: "Cebu, Philippines",
    bio: "Hi there! I'm Rexshimura, a professional Graphic Designer based in Cebu, Philippines. I specialize in designs that demand precision and a keen eye for detail.",
    skills: ["Problem Solving", "Graphic Designing", "Video Editing", "UI/UX Design", "Motion Graphics"],
    isVerified: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const getAssetIcon = (type: AssetItem["type"]) => {
    switch (type) {
      case "audio": return <Music className="h-3 w-3" />;
      case "image": return <ImageIcon className="h-3 w-3" />;
      case "video": return <Video className="h-3 w-3" />;
      default: return null;
    }
  };

  const getAssetColor = (type: AssetItem["type"]) => {
    switch (type) {
      case "audio": return "bg-purple-500/20 text-purple-400";
      case "image": return "bg-green-500/20 text-green-400";
      case "video": return "bg-red-500/20 text-red-400";
      default: return "bg-blue-500/20 text-blue-400";
    }
  };

  const getStatusColor = (status: ProjectItem["status"]) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-400";
      case "in-progress": return "bg-blue-500/20 text-blue-400";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getHistoryStatusColor = (status?: string) => {
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

  const handleSaveProfile = (data: any) => {
    setProfileData(data);
    // Show success toast here if you have one
    alert("Profile updated successfully!");
  };

  const handleVerifySuccess = () => {
    setProfileData({ ...profileData, isVerified: true });
    alert("Verification submitted! We'll review your documents.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Profile" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <ProfileHeaderSkeleton />
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
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 h-5 w-24 animate-pulse rounded bg-white/10" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <TabSkeleton />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate average rating
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
            {/* Avatar */}
            <div className="relative mx-auto md:mx-0">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-0.5">
                <div className="h-full w-full rounded-full bg-[#080a12] flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">JP</span>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute bottom-0 right-0 rounded-full bg-blue-500 p-1.5 text-white transition hover:bg-blue-600"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">{profileData.name}</h1>
                    {profileData.isVerified && (
                      <div className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">{profileData.email}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profileData.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined Since March 2025
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!profileData.isVerified && (
                    <button 
                      onClick={() => setIsVerifying(true)}
                      className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400 transition hover:bg-yellow-500/30"
                    >
                      <Shield className="h-3 w-3" />
                      Verify Profile
                    </button>
                  )}
                  <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                    Professional
                  </div>
                  <button className="rounded-full border border-white/15 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-sm text-zinc-300">{profileData.bio}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-7">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-xl font-bold text-white">100</div>
              <div className="text-xs text-zinc-500">Net Score</div>
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
            {/* Skills */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-400">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Badges</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-2">
                  <Award className="h-4 w-4 text-yellow-400" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-white">Certification & Credentials</p>
                    <p className="text-[10px] text-zinc-500">Verified Professional</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 p-2">
                  <CheckCircle className="h-4 w-4 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-white">Top Rated</p>
                    <p className="text-[10px] text-zinc-500">Top 10% of freelancers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating Breakdown */}
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

            {/* Social Links */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Social Links</h3>
              <div className="space-y-2">
                <a href="#" className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-blue-400">
                  <Globe className="h-3.5 w-3.5" />
                  facebook.com/john.mahilom.2024
                </a>
                <a href="#" className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-red-400">
                  <Video className="h-3.5 w-3.5" />
                  youtube.com/@getstartright16
                </a>
                <a href="#" className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-purple-400">
                  <Link2 className="h-3.5 w-3.5" />
                  github.com/neesh-mura
                </a>
                <a href="#" className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-pink-400">
                  <AtSign className="h-3.5 w-3.5" />
                  @rexshimura
                </a>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div>
            {/* Tabs */}
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

            {/* Portfolio Tab */}
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

            {/* Services Tab */}
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

            {/* Job Posts Tab */}
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

            {/* Projects Tab */}
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

            {/* Assets Tab */}
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

            {/* History Tab - Now includes Reviews and Transaction History */}
            {activeTab === "history" && (
              <div className="space-y-6">
                {/* Reviews Section */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-white">Reviews & Ratings</h3>
                  <ReviewHistory reviews={reviews} />
                </div>

                {/* Transaction History */}
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
                                {item.status === "completed" ? "✓ Completed" : item.status === "pending" ? "⏳ Pending" : "✗ Failed"}
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

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        profileData={profileData}
        onSave={handleSaveProfile}
      />

      <VerificationModal
        isOpen={isVerifying}
        onClose={() => setIsVerifying(false)}
      />
    </div>
  );
};

export default Profile;