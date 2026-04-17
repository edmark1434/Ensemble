import {
  Bookmark,
  CircleDot,
  MessageCircle,
  PlusCircle,
  Search,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { useMemo, useState } from "react";

type ForumTab = "feed" | "groups" | "my-groups" | "my-discussions" | "saved";

type Post = {
  author: string;
  title: string;
  excerpt: string;
  topic: string;
  likes: number;
  ago: string;
};

type Group = {
  name: string;
  owner: string;
  members: string;
  joined?: boolean;
  gradient: string;
};

const categories = [
  { name: "All", count: 32 },
  { name: "Editing", count: 12 },
  { name: "Assets", count: 11 },
  { name: "Job Postings", count: 5 },
  { name: "Services", count: 4 },
];

const topContributors = [
  { name: "John Paul Mahilom", score: "120+" },
  { name: "Edmark Tarlinging", score: "95+" },
  { name: "Jodelic Pablo", score: "91+" },
  { name: "Jhoanessa Lacaya", score: "86+" },
  { name: "Judith Krisa", score: "75+" },
];

const posts: Post[] = [
  {
    author: "Forbes Talinging",
    title: "Best Practices for color grading log footage?",
    excerpt:
      "I am working with S-Log3 footage and looking for advice on the best workflow for color grading. What is your process?",
    topic: "Color Grading Society",
    likes: 12,
    ago: "45 min ago",
  },
  {
    author: "John Paul Mahilom",
    title: "Dealing with difficult clients - advice needed",
    excerpt:
      "Client keeps asking for revisions beyond what is in the contract. How do you handle this professionally?",
    topic: "Color Grading Society",
    likes: 12,
    ago: "55 min ago",
  },
  {
    author: "Name",
    title: "Lorem ipsum",
    excerpt:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    topic: "Discussions of the Finest",
    likes: 8,
    ago: "55 min ago",
  },
];

const groups: Group[] = [
  {
    owner: "Jodelic Pacbe",
    name: "Discussion of the finests",
    members: "120 Members",
    gradient: "from-slate-400 via-slate-300 to-zinc-500",
  },
  {
    owner: "Edmark Tarlinging",
    name: "Starving Editors",
    members: "30 Members",
    gradient: "from-[#7c3aed] via-[#a78bfa] to-[#f5d0fe]",
  },
  {
    owner: "John Paul Mahilom",
    name: "Color Grading Society",
    members: "20 Members",
    joined: true,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
  },
  {
    owner: "Username",
    name: "Group Name",
    members: "11 Members",
    gradient: "from-[#22d3ee] via-[#0ea5e9] to-[#38bdf8]",
  },
  {
    owner: "Username",
    name: "Group Name",
    members: "11 Member",
    gradient: "from-[#f59e0b] via-[#f97316] to-[#ea580c]",
  },
  {
    owner: "Username",
    name: "Group Name",
    members: "11 Member",
    gradient: "from-[#8b5cf6] via-[#ec4899] to-[#ef4444]",
  },
];

const tabOptions: { key: ForumTab; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "groups", label: "Groups" },
  { key: "my-groups", label: "My Groups" },
  { key: "my-discussions", label: "My Discussions" },
  { key: "saved", label: "Saved" },
];

const Forums = () => {
  const [activeTab, setActiveTab] = useState<ForumTab>("feed");

  const visiblePosts = useMemo(() => {
    if (activeTab === "saved") {
      return posts.slice(0, 1);
    }
    if (activeTab === "my-discussions") {
      return posts.slice(1, 2);
    }
    return posts;
  }, [activeTab]);

  const visibleGroups = useMemo(() => {
    if (activeTab === "my-groups") {
      return groups.filter((group) => group.joined);
    }
    return groups;
  }, [activeTab]);

  const actionLabel = activeTab === "groups" || activeTab === "my-groups" ? "Create a Group" : "New Discussion";

  return (
    <main className="relative z-10 px-4 py-4 md:ml-64 md:px-8 md:py-6">
      <div className="animate-[fadeIn_420ms_ease-out]">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <h1 className="text-xl font-semibold tracking-wide md:text-2xl">FORUMS</h1>
          <button className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-black/35 px-3 py-1 text-xs text-yellow-100 transition hover:border-yellow-200/35 hover:bg-black/60 md:text-sm">
            <span className="inline-block rounded-full bg-yellow-200 px-2 py-0.5 text-[11px] font-semibold text-black">5</span>
            <span className="text-yellow-200">+</span>
          </button>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-sm font-medium text-zinc-100">Categories</p>
              <p className="mb-2 text-[11px] text-zinc-500">Discussion Topics</p>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {categories.map((category) => (
                  <li key={category.name} className="flex items-center justify-between border-b border-white/5 pb-1 last:border-0">
                    <span>{category.name}</span>
                    <span className="text-zinc-500">{category.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-sm font-medium text-zinc-100">Top Contributors</p>
              <p className="mb-2 text-[11px] text-zinc-500">Leaderboard of Reputation</p>
              <ul className="space-y-2 text-xs">
                {topContributors.map((contributor, idx) => (
                  <li key={contributor.name} className="flex items-center justify-between text-zinc-300">
                    <span className="truncate">#{idx + 1} {contributor.name}</span>
                    <span className="text-emerald-300">{contributor.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-white/15 pb-3">
              <div className="mr-2 inline-flex items-center gap-2 text-zinc-200">
                <Sparkles className="h-4 w-4" />
                <span className="text-base">Community Forums</span>
              </div>

              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition ${
                    activeTab === tab.key
                      ? "border-white/20 bg-white text-zinc-900"
                      : "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
                <input
                  className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
                  placeholder="Search"
                />
              </div>
            </div>

            {(activeTab === "groups" || activeTab === "my-groups") && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleGroups.map((group) => (
                  <article key={`${group.owner}-${group.name}`} className="overflow-hidden rounded-xl border border-white/15 bg-[#101522]">
                    <div className={`h-24 bg-gradient-to-r ${group.gradient}`} />
                    <div className="space-y-1.5 p-3 text-xs">
                      <p className="text-zinc-400">By {group.owner}</p>
                      <h3 className="text-sm font-semibold text-zinc-100">{group.name}</h3>
                      <p className="text-zinc-400">{group.members}</p>
                      <button className="mt-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-zinc-200 hover:bg-white/10">
                        {group.joined ? "Joined" : "Join"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {(activeTab === "feed" || activeTab === "my-discussions" || activeTab === "saved") && (
              <div className="space-y-3">
                {visiblePosts.map((post) => (
                  <article key={`${post.author}-${post.title}`} className="rounded-xl border border-white/15 bg-[#101522] p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-400">{post.author}</p>
                        <h3 className="text-sm font-semibold text-zinc-100">{post.title}</h3>
                      </div>
                      <div className="text-right text-[11px] text-zinc-500">
                        <p>{post.ago}</p>
                        <p className="italic text-zinc-400">{post.topic}</p>
                      </div>
                    </div>
                    <p className="mb-3 text-xs text-zinc-300">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <button className="inline-flex items-center gap-1 hover:text-zinc-200" type="button">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>2</span>
                      </button>
                      <button className="inline-flex items-center gap-1 hover:text-zinc-200" type="button">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{post.likes}</span>
                      </button>
                      <button className="inline-flex items-center gap-1 hover:text-zinc-200" type="button">
                        <Bookmark className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab !== "groups" && activeTab !== "my-groups" && visiblePosts.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-center text-zinc-400">
                <CircleDot className="mx-auto mb-2 h-5 w-5" />
                No content yet for this tab.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Forums;
