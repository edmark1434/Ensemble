// src/pages/user/3_teams/Teams.tsx
import { useState, useEffect } from "react";
import {
  Plus,
  UserPlus,
  X,
  Compass
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate } from "react-router-dom";

interface Team {
  id: number;
  name: string;
  memberCount: number;
  role: "owner" | "admin" | "member";
  banner: string;
  description?: string;
  pendingRequests?: number;
}

const myTeams: Team[] = [
  {
    id: 1,
    name: "RavenLabs Development",
    memberCount: 4,
    role: "owner",
    banner: "https://placehold.co/400x150/1e2130/4a6fa5?text=RavenLabs",
    description: "A team of creative developers building the future of video editing",
    pendingRequests: 2
  },
  {
    id: 2,
    name: "Creative Collective",
    memberCount: 12,
    role: "member",
    banner: "https://placehold.co/400x150/1e2130/4a6fa5?text=Creative+Collective",
    description: "A collective of video editors and content creators"
  }
];

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBrowseTeams, setShowBrowseTeams] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
    useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleTeamClick = (teamId: number) => {
    navigate(`/teams/${teamId}`);
  };

  const handleBrowseTeams = () => {
    setShowBrowseTeams(true);
  };

  const handleJoinWithCode = () => {
    if (joinCode.trim()) {
      console.log(`Joining team with code: ${joinCode}`);
      // Here you would verify the code and join the team
      setShowJoinModal(false);
      setJoinCode("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Teams" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-white/10" />
            <div className="mt-1 h-4 w-48 animate-pulse rounded-lg bg-white/5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="h-24 w-full animate-pulse bg-white/10" />
                <div className="p-4">
                  <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
                  <div className="mt-1 h-3 w-20 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle="Teams" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Teams
          </h1>
          <p className="text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Collaborate with your team members on projects
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="group flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 active:bg-gradient-to-r active:from-cyan-500 active:via-yellow-500 active:to-purple-600 active:text-white"
          >
            <UserPlus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            Join with Code
          </button>
          <button
            onClick={handleBrowseTeams}
            className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:border-white/30 hover:bg-white/10"
          >
            <Compass className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            Browse Teams
          </button>
          <button
            onClick={() => navigate("/teams/create")}
            className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:border-white/30 hover:bg-white/10"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            Create a Team
          </button>
        </div>

        {/* My Teams Section */}
        {!showBrowseTeams && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                My Teams
              </h2>
              <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Teams you're currently a member of
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleTeamClick(team.id)}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="relative h-24 w-full overflow-hidden">
                    <img
                      src={team.banner}
                      alt={team.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />
                    {team.pendingRequests && team.pendingRequests > 0 && (
                      <div className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {team.pendingRequests}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {team.name}
                        </h3>
                        <p className="text-xs text-zinc-500">{team.memberCount} members</p>
                      </div>
                      <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        team.role === "owner" 
                          ? "bg-yellow-500/20 text-yellow-400" 
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {team.role === "owner" ? "Owner" : "Member"}
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse Teams Section */}
        {showBrowseTeams && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Browse Teams
                </h2>
                <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Discover teams to join
                </p>
              </div>
              <button
                onClick={() => setShowBrowseTeams(false)}
                className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
              >
                <X className="h-4 w-4" />
                Back to My Teams
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { id: 3, name: "Film Masters", memberCount: 8, banner: "https://placehold.co/400x150/1e2130/4a6fa5?text=Film+Masters", description: "Professional film editors community" },
                { id: 4, name: "Motion Graphics Guild", memberCount: 6, banner: "https://placehold.co/400x150/1e2130/4a6fa5?text=Motion+Graphics", description: "Motion graphics and animation experts" },
                { id: 5, name: "Sound Design Studio", memberCount: 5, banner: "https://placehold.co/400x150/1e2130/4a6fa5?text=Sound+Design", description: "Audio professionals and sound designers" },
              ].map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleTeamClick(team.id)}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="relative h-24 w-full overflow-hidden">
                    <img
                      src={team.banner}
                      alt={team.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {team.name}
                    </h3>
                    <p className="text-xs text-zinc-500">{team.memberCount} members</p>
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{team.description}</p>
                    <button
                      className="mt-3 rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to team page where they can request to join
                        handleTeamClick(team.id);
                      }}
                    >
                      View Team
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Join with Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Join a Team
            </h3>
            <p className="text-sm text-zinc-400 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Enter the team invite code to join
            </p>

            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter invite code (e.g., abc-123-def)"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 mb-4"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />

            <div className="flex gap-3">
              <button
                onClick={handleJoinWithCode}
                disabled={!joinCode.trim()}
                className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Team
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode("");
                }}
                className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default Teams;