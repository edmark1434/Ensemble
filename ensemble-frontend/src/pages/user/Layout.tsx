import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
const Layout = () => {
	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#07080e] text-zinc-100 [font-family:Space_Grotesk,Segoe_UI,sans-serif]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(22,163,74,0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.20),transparent_42%),radial-gradient(circle_at_65%_40%,rgba(139,92,246,0.10),transparent_36%)]" />
			<Navbar />
			<Outlet />

			<style>{`
				@keyframes fadeIn {
					from { opacity: 0; transform: translateY(8px); }
					to { opacity: 1; transform: translateY(0); }
				}

				@keyframes slideUp {
					from { opacity: 0; transform: translateY(14px); }
					to { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</div>
	);
};

export default Layout;
