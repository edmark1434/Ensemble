import React from "react";
import { X, Star, Tag } from "lucide-react";
import FlipCard from "./FlipCard";
import { useNavigate } from "react-router-dom";

export interface DiscoveryFlipCardUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  skills: string[];
  rawSkills?: { name: string; proficiency: string; years: number }[];
  verified: boolean;
  meritScore: string;
  followersCount: number;
  roles?: { role_name: string }[];
  subscriptionType?: string;
  tagline?: string;
  totalJobs?: number;
  totalServices?: number;
  totalAssets?: number;
  joinedDate?: string;
  email?: string;
}

interface DiscoveryFlipCardModalProps {
  user: DiscoveryFlipCardUser;
  onClose: () => void;
  onInvite?: () => void;
  hideActions?: boolean;
}

export const DiscoveryFlipCardModal: React.FC<DiscoveryFlipCardModalProps> = ({ user, onClose, onInvite, hideActions }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative flex flex-col items-center">
        <button onClick={onClose} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md z-50">
          <X className="w-5 h-5" />
        </button>
        <FlipCard
          width={340}
          height={520}
          shadow={false}
          front={
            <div className="w-full h-full flex flex-col p-8 items-center justify-center bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 relative overflow-hidden rounded-[22px]">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
              
              <img src={user.avatar} className="w-28 h-28 rounded-full object-cover border-4 border-zinc-100 dark:border-white/10 mb-5 z-10 shadow-sm" alt="Avatar" />
              <h2 className="text-2xl font-bold z-10 text-center">{user.name}</h2>
              <p className="text-xs text-zinc-500 font-mono mt-1 z-10">@{user.username}</p>
              
              {user.tagline && (
                <div className="mt-3 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold ${user.subscriptionType === 'Business' ? 'animate-rainbow' : user.subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}>
                    <Tag className="w-3.5 h-3.5" />
                    {user.tagline}
                  </span>
                </div>
              )}

              <div className="mt-4 px-3 py-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest z-10 text-center line-clamp-1 max-w-full text-zinc-500 dark:text-zinc-400 shadow-sm">
                {user.roles && user.roles.length > 0 
                  ? user.roles.map((r: any) => r.role_name).join(" | ") 
                  : "Freelancer"}
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-8 z-10 w-full px-4 mb-2">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Followers</div>
                  <div className="font-bold text-xl">{user.followersCount}</div>
                </div>
                <div className="w-px h-8 bg-zinc-200 dark:bg-white/10" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Rating</div>
                  <div className="font-bold text-xl flex items-center justify-center gap-1">
                    {user.meritScore !== "No Rating" ? <><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {user.meritScore}</> : <span className="text-sm">New</span>}
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-5 text-[10px] text-zinc-400 uppercase tracking-widest font-mono animate-pulse">
                Click to flip
              </div>
            </div>
          }
          back={
            <div className="w-full h-full flex flex-col p-7 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 rounded-[22px]">
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {user.email && (
                  <div className="mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Email</h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{user.email}</p>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Bio</h3>
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-4">{user.bio || "No bio provided."}</p>
                </div>
                
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Stats</h3>
                <div className="grid grid-cols-2 gap-1.5 mb-4 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
                    <div className="font-bold text-zinc-900 dark:text-white text-base">{user.totalJobs || 0}</div>
                    <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Job Posts</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
                    <div className="font-bold text-zinc-900 dark:text-white text-base">{user.totalServices || 0}</div>
                    <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Services</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
                    <div className="font-bold text-zinc-900 dark:text-white text-base">{user.totalAssets || 0}</div>
                    <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Assets</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 flex flex-col justify-center">
                    <div className="font-bold text-zinc-900 dark:text-white text-[11px] leading-tight">{user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : 'N/A'}</div>
                    <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Joined</div>
                  </div>
                </div>

                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Skills</h3>
                <div className="flex flex-col gap-1.5 mb-2">
                  {user.rawSkills && user.rawSkills.length > 0 ? (
                    <>
                      {user.rawSkills.slice(0, 3).map((s: any, idx) => (
                        <div key={idx} className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-white/10">
                          <span className="truncate mr-2">{s.name}</span>
                          <span className="text-zinc-400 font-normal shrink-0 whitespace-nowrap">{s.proficiency} &bull; {s.years}y</span>
                        </div>
                      ))}
                      {user.rawSkills.length > 3 && (
                        <div className="text-center text-[9px] font-bold tracking-widest text-zinc-400/80 uppercase mt-0.5">
                          +{user.rawSkills.length - 3} MORE
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills.length > 0 ? (
                        <>
                          {user.skills.slice(0, 3).map((s) => (
                            <span key={s} className="px-2.5 py-1 text-[10px] font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-white/10">{s}</span>
                          ))}
                          {user.skills.length > 3 && (
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-transparent text-zinc-400/80 rounded-lg">
                              +{user.skills.length - 3} MORE
                            </span>
                          )}
                        </>
                      ) : <p className="text-xs text-zinc-500 italic">No skills listed</p>}
                    </div>
                  )}
                </div>

              </div>
            </div>
          }
        />
        {!hideActions && (
          <div className="mt-6 flex flex-col gap-2 w-[340px]">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onInvite?.(); 
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white border border-transparent text-sm font-bold rounded-[16px] transition-all shadow-lg shadow-blue-500/20 z-[100]"
            >
              Invite to Job
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); navigate(`/profile/${user.id}`); }}
              className="w-full py-3.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 text-sm font-bold rounded-[16px] transition-all shadow-sm z-[100]"
            >
              View Full Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default DiscoveryFlipCardModal;
