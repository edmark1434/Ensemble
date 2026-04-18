// src/pages/user/3_teams/SelectedTeam.tsx
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  MessageCircle,
  UserPlus,
  MoreVertical,
  ArrowLeft,
  Calendar,
  Info,
  Briefcase,
  Megaphone,
  Image,
  Star,
  LogOut,
  Shield,
  Flag,
  Copy,
  Check,
  Bell,
  Edit3,
  UserMinus
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useEffect } from "react";
import EditTeamModal from "@/pages/user/3_teams/team_modals/EditTeamModal.tsx";
import EditTeamPermissionModal from "@/pages/user/3_teams/team_modals/EditTeamPermissionModal.tsx";
import ReportTeamModal from "@/pages/user/3_teams/team_modals/ReportTeamModal.tsx";
import LeaveTeamModal from "@/pages/user/3_teams/team_modals/LeaveTeamModal.tsx";
import RemoveMemberModal from "@/pages/user/3_teams/team_modals/RemoveMemberModal.tsx";
import ReportMemberModal from "@/pages/user/3_teams/team_modals/ReportMemberModal.tsx";
import JoinRequestsModal from "@/pages/user/3_teams/team_modals/JoinRequestsModal.tsx";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  permissions?: string[];
}

interface TeamPost {
  id: number;
  title: string;
  content: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  type: "job" | "gig" | "asset" | "announcement";
  likes: number;
  comments: number;
}

interface JoinRequest {
  id: number;
  name: string;
  avatar: string;
  requestedAt: string;
}

const teamData: Record<string, {
  id: string;
  name: string;
  banner: string;
  description: string;
  memberCount: number;
  createdAt: string;
  userRole: "owner" | "admin" | "member" | "visitor";
  userStatus?: "pending" | "joined";
  members: TeamMember[];
  posts: TeamPost[];
  joinRequests?: JoinRequest[];
  inviteCode: string;
}> = {
  "1": {
    id: "1",
    name: "RavenLabs Development",
    banner: "https://placehold.co/1200x300/1e2130/4a6fa5?text=RavenLabs+Banner",
    description: "A team of creative developers building the future of video editing technology. We focus on innovation and collaboration.",
    memberCount: 4,
    createdAt: "Jan 2024",
    userRole: "owner",
    members: [
      { id: 1, name: "John Paul Mahilom", role: "Owner", avatar: "https://i.pravatar.cc/150?u=john", permissions: ["invite", "manage", "post"] },
      { id: 2, name: "Sarah Chen", role: "Admin", avatar: "https://i.pravatar.cc/150?u=sarah", permissions: ["invite", "post"] },
      { id: 3, name: "Marcus Thompson", role: "Member", avatar: "https://i.pravatar.cc/150?u=marcus", permissions: ["post"] },
      { id: 4, name: "Emma Watson", role: "Member", avatar: "https://i.pravatar.cc/150?u=emma", permissions: ["post"] },
    ],
    posts: [
      { id: 1, title: "Looking for Video Editor", content: "Need an experienced video editor for a commercial project. Remote position.", author: "John Paul Mahilom", authorAvatar: "https://i.pravatar.cc/150?u=john", createdAt: "2 days ago", type: "job", likes: 5, comments: 3 },
      { id: 2, title: "Motion Graphics Template Pack", content: "Premium motion graphics templates available for team members.", author: "Sarah Chen", authorAvatar: "https://i.pravatar.cc/150?u=sarah", createdAt: "5 days ago", type: "asset", likes: 12, comments: 4 },
      { id: 3, title: "Weekly Team Meeting", content: "Join our weekly sync to discuss ongoing projects.", author: "John Paul Mahilom", authorAvatar: "https://i.pravatar.cc/150?u=john", createdAt: "1 week ago", type: "announcement", likes: 8, comments: 2 },
    ],
    joinRequests: [
      { id: 1, name: "Alex Johnson", avatar: "https://i.pravatar.cc/150?u=alex", requestedAt: "2 hours ago" },
      { id: 2, name: "Maria Garcia", avatar: "https://i.pravatar.cc/150?u=maria", requestedAt: "1 day ago" },
    ],
    inviteCode: "RAVEN-ABC-123"
  },
  "2": {
    id: "2",
    name: "Creative Collective",
    banner: "https://placehold.co/1200x300/1e2130/4a6fa5?text=Creative+Collective+Banner",
    description: "A collective of video editors and content creators sharing resources and collaborating.",
    memberCount: 12,
    createdAt: "Feb 2024",
    userRole: "member",
    members: [
      { id: 1, name: "Jessica Martinez", role: "Owner", avatar: "https://i.pravatar.cc/150?u=jessica", permissions: ["invite", "manage", "post"] },
      { id: 2, name: "John Paul Mahilom", role: "Member", avatar: "https://i.pravatar.cc/150?u=john", permissions: ["post"] },
      { id: 3, name: "David Kim", role: "Member", avatar: "https://i.pravatar.cc/150?u=david", permissions: ["post"] },
    ],
    posts: [
      { id: 1, title: "Gig: Thumbnail Designer Needed", content: "Looking for a thumbnail designer for YouTube channel. Paid gig.", author: "Jessica Martinez", authorAvatar: "https://i.pravatar.cc/150?u=jessica", createdAt: "1 day ago", type: "gig", likes: 15, comments: 6 },
      { id: 2, title: "Free Stock Footage Collection", content: "Sharing my collection of 4K stock footage with the team.", author: "David Kim", authorAvatar: "https://i.pravatar.cc/150?u=david", createdAt: "3 days ago", type: "asset", likes: 23, comments: 7 },
    ],
    inviteCode: "CREATIVE-XYZ-789"
  }
};

const SelectedTeam: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"about" | "jobs" | "gigs" | "assets" | "reviews" | "members">("about");
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJoinRequestSent, setShowJoinRequestSent] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<number | null>(null);

  // Modal states
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [showReportTeamModal, setShowReportTeamModal] = useState(false);
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [showReportMemberModal, setShowReportMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const team = id ? teamData[id] : null;

  const getPostTypeIcon = (type: string) => {
    switch(type) {
      case "job": return <Briefcase className="h-4 w-4 text-blue-400" />;
      case "gig": return <Megaphone className="h-4 w-4 text-green-400" />;
      case "asset": return <Image className="h-4 w-4 text-purple-400" />;
      default: return <MessageCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredPosts = team?.posts.filter(post => {
    if (activeTab === "jobs") return post.type === "job";
    if (activeTab === "gigs") return post.type === "gig";
    if (activeTab === "assets") return post.type === "asset";
    return false;
  }) || [];

  if (!team) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Team Not Found" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Team not found</h1>
          <button
            onClick={() => navigate("/teams")}
            className="mt-4 rounded-full bg-white px-6 py-2 text-black"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  const isMember = team.userRole !== "visitor";
  const canInvite = team.userRole === "owner" || team.userRole === "admin";
  const canPost = isMember;
  const canManage = team.userRole === "owner";
  const canEditTeam = team.userRole === "owner";
  const canModifyPermissions = team.userRole === "owner";

  const handleEditTeam = (newName: string, newBanner: string) => {
    console.log("Updating team:", { name: newName, banner: newBanner });
    // Here you would make an API call to update the team
  };

  const handleEditPermissions = (updatedMembers: TeamMember[], updatedRoles: any[]) => {
    console.log("Updating permissions:", { members: updatedMembers, roles: updatedRoles });
    // Here you would make an API call to update permissions
  };

  const handleReportTeam = (reason: string, description: string) => {
    console.log("Reporting team:", { reason, description });
    // Here you would make an API call to submit the report
  };

  const handleLeaveTeam = () => {
    console.log("Leaving team:", team.name);
    // Here you would make an API call to leave the team
    navigate("/teams");
  };

  const handleRemoveMember = (reason: string) => {
    console.log("Removing member:", selectedMember?.name, "Reason:", reason);
    // Here you would make an API call to remove the member
    setSelectedMember(null);
  };

  const handleReportMember = (reason: string, description: string) => {
    console.log("Reporting member:", selectedMember?.name, { reason, description });
    // Here you would make an API call to report the member
    setSelectedMember(null);
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestToJoin = () => {
    setShowJoinRequestSent(true);
    setTimeout(() => setShowJoinRequestSent(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle={team.name} credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="h-48 w-full animate-pulse rounded-xl bg-white/10" />
          <div className="mt-6 h-8 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-6 h-10 w-32 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle={team.name} credits={1250} />

      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={team.banner}
          alt={team.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => navigate("/teams")}
          className="absolute top-4 left-4 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Invite Button for Members with permission */}
        {isMember && canInvite && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={handleCopyInviteCode}
              className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Invite Code"}
            </button>
            <button
              onClick={() => setShowJoinRequestsModal(true)}
              className="relative rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <Bell className="h-5 w-5" />
              {team.joinRequests && team.joinRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                  {team.joinRequests.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Ask to Join Button for Visitors */}
        {!isMember && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={handleRequestToJoin}
              className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              <UserPlus className="h-4 w-4" />
              Ask to Join
            </button>
          </div>
        )}
      </div>

      {/* Join Request Sent Notification */}
      {showJoinRequestSent && (
        <div className="fixed top-20 right-4 z-50 rounded-lg bg-green-500 px-4 py-2 text-white shadow-lg animate-fade-in">
          Join request sent! The team owner will review your request.
        </div>
      )}

      {/* Modals */}
      <EditTeamModal
        isOpen={showEditTeamModal}
        onClose={() => setShowEditTeamModal(false)}
        teamName={team.name}
        teamBanner={team.banner}
        onSave={handleEditTeam}
      />

      <EditTeamPermissionModal
        isOpen={showEditPermissionsModal}
        onClose={() => setShowEditPermissionsModal(false)}
        members={team.members}
        onSave={handleEditPermissions}
      />

      <ReportTeamModal
        isOpen={showReportTeamModal}
        onClose={() => setShowReportTeamModal(false)}
        teamName={team.name}
        onSubmit={handleReportTeam}
      />

      <LeaveTeamModal
        isOpen={showLeaveTeamModal}
        onClose={() => setShowLeaveTeamModal(false)}
        teamName={team.name}
        onConfirm={handleLeaveTeam}
      />

      <RemoveMemberModal
        isOpen={showRemoveMemberModal}
        onClose={() => {
          setShowRemoveMemberModal(false);
          setSelectedMember(null);
        }}
        memberName={selectedMember?.name || ""}
        onConfirm={handleRemoveMember}
      />

      <ReportMemberModal
        isOpen={showReportMemberModal}
        onClose={() => {
          setShowReportMemberModal(false);
          setSelectedMember(null);
        }}
        memberName={selectedMember?.name || ""}
        onSubmit={handleReportMember}
      />

     <JoinRequestsModal
  isOpen={showJoinRequestsModal}
  onClose={() => setShowJoinRequestsModal(false)}
  requests={team.joinRequests || []}
  onAccept={(id) => {
    console.log("Accepting request:", id);
    // Here you would make an API call to accept the join request
  }}
  onReject={(id) => {
    console.log("Rejecting request:", id);
    // Here you would make an API call to reject the join request
  }}
/>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Team Info with 3-dot menu on the same row */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {team.name}
              </h1>
            </div>

            {/* Three Dots Menu - Now on the same row as team name */}
            {isMember && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden z-20">
                    <div className="p-2">
                      {canEditTeam && (
                        <button
                          onClick={() => {
                            setShowEditTeamModal(true);
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit Team
                        </button>
                      )}
                      {canModifyPermissions && (
                        <button
                          onClick={() => {
                            setShowEditPermissionsModal(true);
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                        >
                          <Shield className="h-4 w-4" />
                          Edit Member Permissions
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowReportTeamModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                      >
                        <Flag className="h-4 w-4" />
                        Report Team
                      </button>
                      <button
                        onClick={() => {
                          setShowLeaveTeamModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Leave Team
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-2 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {team.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{team.memberCount} members</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {team.createdAt}</span>
            </div>
            {isMember && (
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${team.userRole === "owner" ? "bg-yellow-500" : "bg-green-500"}`} />
                <span className="capitalize">{team.userRole}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 border-b border-white/10">
          <button
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "about"
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Info className="h-4 w-4" />
            About
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "jobs"
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Job Posts
          </button>
          <button
            onClick={() => setActiveTab("gigs")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "gigs"
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Gig Posts
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "assets"
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Image className="h-4 w-4" />
            Assets
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "reviews"
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Star className="h-4 w-4" />
            Reviews
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "members"
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="h-4 w-4" />
            Members
          </button>
        </div>

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <h3 className="text-lg font-semibold text-white mb-2">About this team</h3>
              <p className="text-zinc-400">{team.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
                <Calendar className="h-4 w-4" />
                <span>Founded {team.createdAt}</span>
              </div>
            </div>

            {isMember && canPost && (
              <button className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-zinc-400 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white">
                + Create a new post
              </button>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/10"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{member.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                </div>
                {/* Three-dot menu for members (only for owners/admins and not for self/owner) */}
                {canManage && member.role !== "Owner" && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberMenu(showMemberMenu === member.id ? null : member.id);
                      }}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {showMemberMenu === member.id && (
                      <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden z-20">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setShowRemoveMemberModal(true);
                              setShowMemberMenu(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove Member
                          </button>
                          <button
                            onClick={() => {
                              setShowReportMemberModal(true);
                              setShowMemberMenu(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                          >
                            <Flag className="h-4 w-4" />
                            Report Member
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Posts Tabs (Jobs, Gigs, Assets) */}
        {(activeTab === "jobs" || activeTab === "gigs" || activeTab === "assets") && (
          <div className="space-y-4">
            {canPost && (
              <button className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-zinc-400 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white">
                + Create a new {activeTab === "jobs" ? "job post" : activeTab === "gigs" ? "gig post" : "asset"}
              </button>
            )}

            {filteredPosts.map((post) => (
              <div key={post.id} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition-all duration-300 hover:border-white/20">
                <div className="flex items-start gap-3">
                  <img src={post.authorAvatar} alt={post.author} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPostTypeIcon(post.type)}
                      <p className="text-sm font-medium text-white">{post.author}</p>
                      <span className="text-xs text-zinc-500">{post.createdAt}</span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-white">{post.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <button className="flex items-center gap-1 text-zinc-500 transition hover:text-white">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {post.comments} comments
                      </button>
                      <button className="flex items-center gap-1 text-zinc-500 transition hover:text-white">
                        <Star className="h-3.5 w-3.5" />
                        {post.likes} likes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredPosts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                <p className="text-zinc-400">No {activeTab} posts yet</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <Star className="mb-3 h-12 w-12 text-zinc-500" />
            <h3 className="text-lg font-semibold text-white">No reviews yet</h3>
            <p className="mt-1 text-sm text-zinc-400">Be the first to leave a review for this team</p>
            {isMember && (
              <button className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600">
                Write a Review
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-modal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-fade-in-modal { animation: fade-in-modal 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default SelectedTeam;