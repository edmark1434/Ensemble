// import {
// 	AudioWaveform,
// 	Briefcase,
// 	ClipboardList,
// 	MessageSquare,
// 	Plus,
// 	Rocket,
// 	Search,
// 	Sparkles,
// 	UserPlus,
// } from "lucide-react";
// import type { ComponentType } from "react";
//
// type IconAction = {
// 	label: string;
// 	icon: ComponentType<{ className?: string }>;
// };
//
// type AssetCard = {
// 	title: string;
// 	type: string;
// 	credits: number;
// 	description: string;
// 	gradient: string;
// };
//
// const actionButtons: IconAction[] = [
// 	{ label: "Start Project", icon: Rocket },
// 	{ label: "Find Services", icon: Search },
// 	{ label: "Post a Job", icon: Briefcase },
// 	{ label: "Look for a Job", icon: Sparkles },
// 	{ label: "Create Service", icon: ClipboardList },
// 	{ label: "Upload Asset", icon: AudioWaveform },
// 	{ label: "Join a Team", icon: UserPlus },
// 	{ label: "Group Discussions", icon: MessageSquare },
// ];
//
// const assets: AssetCard[] = [
// 	{
// 		title: "Sound Effects Library - U",
// 		type: "Audio",
// 		credits: 299,
// 		description: "500+ production-ready effects for music and video sound design.",
// 		gradient: "from-[#1e3a8a] via-[#0ea5e9] to-[#67e8f9]",
// 	},
// 	{
// 		title: "Industrial Audio Library",
// 		type: "Audio",
// 		credits: 299,
// 		description: "Deep atmospheric and metallic textures for futuristic edits.",
// 		gradient: "from-[#0f172a] via-[#0f766e] to-[#22d3ee]",
// 	},
// 	{
// 		title: "Oil Canvas Themed Textures",
// 		type: "Images",
// 		credits: 129,
// 		description: "100 high-resolution overlays for artistic composites.",
// 		gradient: "from-[#78350f] via-[#fb923c] to-[#fef3c7]",
// 	},
// 	{
// 		title: "Slow-Motion Ink Drops",
// 		type: "Video",
// 		credits: 129,
// 		description: "Crisp alpha footage and abstract visuals for transitions.",
// 		gradient: "from-[#111827] via-[#6b7280] to-[#f3f4f6]",
// 	},
// ];
//
// const cardOverlay =
// 	"radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), rgba(255,255,255,0) 55%)";
//
// const Home = () => {
// 	return (
// 		<main className="relative z-10 px-4 py-4 md:ml-64 md:px-8 md:py-6">
// 			<div className="animate-[fadeIn_420ms_ease-out]">
// 				<div className="mb-4 flex items-center justify-between md:mb-6">
// 					<h1 className="text-xl font-semibold tracking-wide md:text-2xl">HOME</h1>
// 					<button className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-black/35 px-3 py-1 text-xs text-yellow-100 transition hover:border-yellow-200/35 hover:bg-black/60 md:text-sm">
// 						<span className="inline-block rounded-full bg-yellow-200 px-2 py-0.5 text-[11px] font-semibold text-black">
// 							5
// 						</span>
// 						<Plus className="h-3.5 w-3.5" />
// 					</button>
// 				</div>
//
// 				<section className="mb-5 overflow-hidden rounded-2xl border border-white/20 bg-[linear-gradient(110deg,rgba(255,255,255,0.09),rgba(21,30,65,0.30),rgba(63,34,124,0.34))] p-5 md:mb-6 md:p-7">
// 					<p className="mb-2 text-base text-zinc-100 md:text-2xl">Welcome, User!</p>
// 					<h2 className="mb-3 max-w-2xl text-2xl font-bold leading-tight md:text-4xl">
// 						Your Complete Video Editing Ecosystem
// 					</h2>
// 					<p className="max-w-2xl text-sm text-zinc-300 md:text-base">
// 						Find job posts or services, buy assets, collaborate and connect with talented video
// 						editors or clients.
// 					</p>
// 				</section>
//
// 				<section className="mb-5 flex flex-wrap gap-2 md:mb-6 md:gap-3">
// 					{actionButtons.map(({ label, icon: Icon }, idx) => (
// 						<button
// 							key={label}
// 							className="animate-[slideUp_480ms_ease-out] inline-flex items-center gap-2 rounded-md border border-white/15 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-zinc-100"
// 							style={{ animationDelay: `${80 + idx * 45}ms` }}
// 							type="button"
// 						>
// 							<Icon className="h-3.5 w-3.5" />
// 							{label}
// 						</button>
// 					))}
// 				</section>
//
// 				<section>
// 					<div className="mb-3 flex items-center gap-2 text-zinc-100">
// 						<Sparkles className="h-4 w-4 text-zinc-300" />
// 						<h3 className="text-lg font-semibold">Suggested Assets</h3>
// 					</div>
//
// 					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
// 						{assets.map((asset, idx) => (
// 							<article
// 								key={asset.title}
// 								className="animate-[slideUp_500ms_ease-out] overflow-hidden rounded-2xl border border-white/15 bg-[#0e1220] shadow-2xl shadow-black/30"
// 								style={{ animationDelay: `${120 + idx * 70}ms` }}
// 							>
// 								<div className={`relative h-40 bg-gradient-to-br ${asset.gradient}`}>
// 									<div
// 										className="absolute inset-0"
// 										style={{ backgroundImage: cardOverlay }}
// 										aria-hidden="true"
// 									/>
// 									<div className="absolute bottom-2 right-2 rounded-full border border-black/25 bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-900">
// 										{asset.type}
// 									</div>
// 								</div>
//
// 								<div className="space-y-2 p-3">
// 									<p className="text-xs font-medium text-yellow-300">Credits: {asset.credits}</p>
// 									<h4 className="text-sm font-semibold text-zinc-100">{asset.title}</h4>
// 									<p className="text-xs text-zinc-400">{asset.description}</p>
// 									<p className="pt-1 text-xs font-medium text-zinc-300">by Robert Simeon</p>
// 								</div>
// 							</article>
// 						))}
// 					</div>
// 				</section>
// 			</div>
// 		</main>
// 	);
// };
//
// export default Home;
