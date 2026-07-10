import React from "react";
import { Briefcase } from "lucide-react";

interface ProfileServicesProps {
  services?: any[];
}

export const Profile_Services: React.FC<ProfileServicesProps> = ({ services = [] }) => {
  return (
    <div className="space-y-3 flex-1 content-start">
      {services.map((srv) => (
        <div
          key={srv.id}
          className="group p-4 rounded-xl border border-white/5 bg-[#121420]/20 flex justify-between items-center gap-4 transition-all duration-300 hover:border-white/15 hover:bg-[#121420]/40"
        >
          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white tracking-wide transition-colors group-hover:text-blue-400">
              {srv.title}
            </h4>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed line-clamp-2">
              {srv.description}
            </p>
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
            <span className="text-xs font-black text-emerald-400 tracking-wide bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
              {srv.price} CR
            </span>
            <div className="text-[10px] text-zinc-500 font-bold font-mono">
              {srv.deliveryTime} Delivery
            </div>
          </div>
        </div>
      ))}
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-center gap-2 flex-1">
          <Briefcase className="h-6 w-6 opacity-30 text-zinc-400" />
          <p className="text-xs font-medium italic">No active system offer sheets running.</p>
        </div>
      )}
    </div>
  );
};