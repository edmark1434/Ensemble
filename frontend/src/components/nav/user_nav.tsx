import {
	Briefcase,
	ClipboardList,
	FolderKanban,
	Handshake,
	Home,
	Inbox,
	Megaphone,
	MessageSquare,
	Palette,
	Send,
	Shield,
	Users,
	Wallet,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	BriefcaseBusiness,
	MicVocal,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { useState } from "react";

type NavItem = {
	label: string;
	icon: ComponentType<{ className?: string }>;
	to: string;
};
const primaryNav: NavItem[] = [
	{ label: "Home", icon: Home, to: "/home" },
	{ label: "Projects", icon: FolderKanban, to: "/projects" },
	{ label: "Teams", icon: Users, to: "/teams" },
	{ label: "Forums", icon: MessageSquare, to: "/forums" },
	{ label: "Asset Library", icon: Palette, to: "/assets" },
];

// Jobs Section Items
const jobsItems: NavItem[] = [
	{ label: "Job Posting", icon: Briefcase, to: "/jobs" },
	{ label: "Incoming Proposals", icon: ClipboardList, to: "/proposals" },
	{ label: "My Proposals", icon: Send, to: "/my-proposals" },
];

// Gigs Section Items
const gigsItems: NavItem[] = [
	{ label: "Gig Posting", icon: Megaphone, to: "/gigs" },
	{ label: "Incoming Requests", icon: Inbox, to: "/requests" },
	{ label: "My Requests", icon: Handshake, to: "/my-requests" },
];

// Other Marketplace Items
const otherMarketplaceItems: NavItem[] = [
	{ label: "My Contracts", icon: Shield, to: "/contracts" },
	{ label: "Transaction History", icon: Wallet, to: "/transactions" },
	{ label: "Inbox", icon: MessageSquare, to: "/inbox" },
];

interface UserNavProps {
	userName?: string;
	userTier?: string;
	userAvatar?: string;
}

const UserNav: React.FC<UserNavProps> = () => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isJobsOpen, setIsJobsOpen] = useState(true);
	const [isGigsOpen, setIsGigsOpen] = useState(true);

	const linkClassName = ({ isActive }: { isActive: boolean }) =>
		`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
			isActive
				? "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500"
				: "text-zinc-400 hover:text-white hover:bg-white/5"
		} ${isCollapsed ? "justify-center px-2" : ""}`;

	const sectionHeaderClassName = () =>
		`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-zinc-400 hover:text-white hover:bg-white/5 ${
			isCollapsed ? "justify-center px-2" : ""
		}`;

	return (
		<>
			<aside
				className={`fixed inset-y-0 left-0 z-20 hidden border-r border-white/10 bg-[#080a12] transition-all duration-300 md:flex md:flex-col ${
					isCollapsed ? "w-20" : "w-64"
				}`}
			>
				{/* Logo Section */}
				<div className={`flex items-center border-b border-white/10 px-5 py-5 ${
					isCollapsed ? "justify-center px-2" : "gap-2.5"
				}`}>
					<img
						src="/ensemble_lg.svg"
						alt="Ensemble Logo"
						className="h-9 w-9 flex-shrink-0"
					/>
					{!isCollapsed && (
						<div className="overflow-hidden whitespace-nowrap px-2">
							<p className="text-base font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
								Ensemble
							</p>
						</div>
					)}
				</div>

				{/* Navigation - Scrollable */}
				<nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
					{/* Main Menu */}
					<div className="mb-4">
						{!isCollapsed && (
							<p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
								Main Menu
							</p>
						)}
						<ul className="space-y-1">
							{primaryNav.map(({ label, icon: Icon, to }) => (
								<li key={label}>
									<NavLink to={to} className={linkClassName} title={isCollapsed ? label : undefined}>
										<Icon className="h-4 w-4 flex-shrink-0" />
										{!isCollapsed && (
											<span className="text-sm font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
												{label}
											</span>
										)}
									</NavLink>
								</li>
							))}
						</ul>
					</div>

					{/* Marketplace Section */}
					<div>
						{!isCollapsed && (
							<p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
								Marketplace
							</p>
						)}

						{/* Jobs Section - Collapsible */}
						{!isCollapsed ? (
							<div className="mb-2">
								<button
									onClick={() => setIsJobsOpen(!isJobsOpen)}
									className={sectionHeaderClassName()}
								>
									<BriefcaseBusiness className="h-4 w-4 flex-shrink-0" />
									<span className="flex-1 text-left text-sm font-medium">Jobs</span>
									{isJobsOpen ? (
										<ChevronUp className="h-3.5 w-3.5" />
									) : (
										<ChevronDown className="h-3.5 w-3.5" />
									)}
								</button>
								{isJobsOpen && (
									<ul className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-2">
										{jobsItems.map(({ label, icon: Icon, to }) => (
											<li key={label}>
												<NavLink
													to={to}
													className={({ isActive }) =>
														`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
															isActive
																? "bg-blue-500/10 text-blue-400"
																: "text-zinc-400 hover:text-white hover:bg-white/5"
														}`
													}
													title={label}
												>
													<Icon className="h-3.5 w-3.5 flex-shrink-0" />
													<span className="text-xs font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
														{label}
													</span>
												</NavLink>
											</li>
										))}
									</ul>
								)}
							</div>
						) : (
							/* Collapsed view - show icons only */
							<div className="mb-2">
								<div className="flex flex-col items-center gap-1">
									{jobsItems.map(({ label, icon: Icon, to }) => (
										<NavLink
											key={label}
											to={to}
											className={({ isActive }) =>
												`flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all duration-200 ${
													isActive
														? "bg-blue-500/10 text-blue-400"
														: "text-zinc-400 hover:text-white hover:bg-white/5"
												}`
											}
											title={label}
										>
											<Icon className="h-4 w-4" />
										</NavLink>
									))}
								</div>
							</div>
						)}

						{/* Gigs Section - Collapsible */}
						{!isCollapsed ? (
							<div className="mb-2">
								<button
									onClick={() => setIsGigsOpen(!isGigsOpen)}
									className={sectionHeaderClassName()}
								>
									<MicVocal className="h-4 w-4 flex-shrink-0" />
									<span className="flex-1 text-left text-sm font-medium">Gigs</span>
									{isGigsOpen ? (
										<ChevronUp className="h-3.5 w-3.5" />
									) : (
										<ChevronDown className="h-3.5 w-3.5" />
									)}
								</button>
								{isGigsOpen && (
									<ul className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-2">
										{gigsItems.map(({ label, icon: Icon, to }) => (
											<li key={label}>
												<NavLink
													to={to}
													className={({ isActive }) =>
														`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
															isActive
																? "bg-blue-500/10 text-blue-400"
																: "text-zinc-400 hover:text-white hover:bg-white/5"
														}`
													}
													title={label}
												>
													<Icon className="h-3.5 w-3.5 flex-shrink-0" />
													<span className="text-xs font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
														{label}
													</span>
												</NavLink>
											</li>
										))}
									</ul>
								)}
							</div>
						) : (
							/* Collapsed view - show icons only */
							<div className="mb-2">
								<div className="flex flex-col items-center gap-1">
									{gigsItems.map(({ label, icon: Icon, to }) => (
										<NavLink
											key={label}
											to={to}
											className={({ isActive }) =>
												`flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all duration-200 ${
													isActive
														? "bg-blue-500/10 text-blue-400"
														: "text-zinc-400 hover:text-white hover:bg-white/5"
												}`
											}
											title={label}
										>
											<Icon className="h-4 w-4" />
										</NavLink>
									))}
								</div>
							</div>
						)}

						{/* Other Marketplace Items */}
						{!isCollapsed ? (
							<ul className="mt-2 space-y-1">
								{otherMarketplaceItems.map(({ label, icon: Icon, to }) => (
									<li key={label}>
										<NavLink to={to} className={linkClassName} title={isCollapsed ? label : undefined}>
											<Icon className="h-4 w-4 flex-shrink-0" />
											<span className="text-sm font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
												{label}
											</span>
										</NavLink>
									</li>
								))}
							</ul>
						) : (
							<ul className="mt-2 space-y-1">
								{otherMarketplaceItems.map(({ label, icon: Icon, to }) => (
									<li key={label}>
										<NavLink
											to={to}
											className={({ isActive }) =>
												`flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all duration-200 ${
													isActive
														? "bg-blue-500/10 text-blue-400"
														: "text-zinc-400 hover:text-white hover:bg-white/5"
												}`
											}
											title={label}
										>
											<Icon className="h-4 w-4" />
										</NavLink>
									</li>
								))}
							</ul>
						)}
					</div>
				</nav>

				{/* Collapse Button */}
				<div className="border-t border-white/10 p-3">
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white ${
							isCollapsed ? "justify-center" : ""
						}`}
						title={isCollapsed ? "Expand" : "Collapse"}
					>
						{isCollapsed ? (
							<ChevronRight className="h-4 w-4" />
						) : (
							<>
								<ChevronLeft className="h-4 w-4" />
								<span className="font-medium">Collapse</span>
							</>
						)}
					</button>
				</div>
			</aside>

			{/* Custom scrollbar styles */}
			<style>{`
				.scrollbar-thin::-webkit-scrollbar {
					width: 4px;
				}
				.scrollbar-track-white/5::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.05);
					border-radius: 4px;
				}
				.scrollbar-thumb-white/10::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.1);
					border-radius: 4px;
				}
				.scrollbar-thumb-white/10:hover::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.2);
				}
			`}</style>
		</>
	);
};

export default UserNav;