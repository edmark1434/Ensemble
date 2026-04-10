import { Outlet } from "react-router-dom";
import MarketplaceModeratorNavbar from "./Navbar";

const MarketplaceModeratorLayout = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07080e] text-zinc-100 [font-family:Space_Grotesk,Segoe_UI,sans-serif]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_65%_40%,rgba(168,85,247,0.10),transparent_36%)]" />
      <MarketplaceModeratorNavbar />
      <Outlet />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MarketplaceModeratorLayout;
