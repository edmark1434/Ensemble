import {
	Briefcase,
	ClipboardList,
	FolderKanban,
	Gem,
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
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";

type NavItem = {
	label: string;
	icon: ComponentType<{ className?: string }>;
	to?: string;
};

const primaryNav: NavItem[] = [
	{ label: "Home", icon: Home, to: "/dashboard" },
	{ label: "Projects", icon: FolderKanban, to: "/dashboard/projects" },
	{ label: "Teams", icon: Users, to: "/dashboard/teams" },
	{ label: "Forums", icon: MessageSquare, to: "/dashboard/forums" },
	{ label: "Asset Library", icon: Palette, to: "/dashboard/assets" },
];

const secondaryNav: NavItem[] = [
	{ label: "Job Posting", icon: Briefcase, to: "/dashboard/jobs" },
	{ label: "Incoming Proposals", icon: ClipboardList, to: "/dashboard/proposals/incoming" },
	{ label: "My Proposals", icon: Send, to: "/dashboard/proposals/mine" },
	{ label: "Gig Posting", icon: Megaphone, to: "/dashboard/gigs" },
	{ label: "Incoming Requests", icon: Inbox, to: "/dashboard/requests/incoming" },
	{ label: "My Requests", icon: Handshake, to: "/dashboard/requests/mine" },
	{ label: "My Contracts", icon: Shield, to: "/dashboard/contracts" },
	{ label: "Transaction History", icon: Wallet, to: "/dashboard/transactions" },
	{ label: "Inbox", icon: MessageSquare, to: "/dashboard/inbox" },
];

const linkClassName = (isActive: boolean) =>
	`group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
		isActive
			? "border-white/20 bg-white/10 text-white"
			: "border-transparent text-zinc-300 hover:border-white/15 hover:bg-white/5 hover:text-white"
	}`;

const Navbar = () => {
	return (
		<aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex md:flex-col">
			<div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
				<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
					<Gem className="h-5 w-5" />
				</div>
				<p className="text-lg font-semibold tracking-wide">Ensemble</p>
			</div>

			<nav className="flex-1 overflow-y-auto px-3 py-4">
				<ul className="space-y-1.5">
					{primaryNav.map(({ label, icon: Icon, to }) => (
						<li key={label}>
							<NavLink to={to ?? "/dashboard"} end={to === "/dashboard"} className={({ isActive }) => linkClassName(isActive)}>
								<Icon className="h-4 w-4" />
								{label}
							</NavLink>
						</li>
					))}
				</ul>

				<div className="my-4 h-px bg-white/10" />

				<ul className="space-y-1.5">
					{secondaryNav.map(({ label, icon: Icon, to }) => (
						<li key={label}>
							<NavLink to={to ?? "/dashboard"} className={({ isActive }) => linkClassName(isActive)}>
								<Icon className="h-4 w-4" />
								{label}
							</NavLink>
						</li>
					))}
				</ul>
			</nav>

			<div className="border-t border-white/10 p-4">
				<div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2">
					<div>
						<p className="text-sm font-medium">John Paul Mahilom</p>
						<p className="text-xs text-zinc-400">PREMIUM</p>
					</div>
					<span className="text-yellow-300">*</span>
				</div>
			</div>
		</aside>
	);
};

export default Navbar;
