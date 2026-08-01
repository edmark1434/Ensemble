import { useMemo, useState } from 'react';
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Search,
  ThumbsUp,
  Users,
} from 'lucide-react';

type TabId = 'feed' | 'groups' | 'my-discussions';

type MockPost = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  group: string;
  likes: number;
  comments: number;
  views: number;
  timeAgo: string;
  tags: string[];
};

type MockGroup = {
  id: string;
  name: string;
  members: number;
  discussions: number;
  description: string;
};

const MOCK_POSTS: MockPost[] = [
  {
    id: '1',
    title: 'Best LUT packs for night city shots?',
    excerpt:
      'Looking for recommendations that hold up on neon highlights without crushing shadows. Share your go-to packs and why.',
    author: 'maya.edit',
    group: 'Color & Grading',
    likes: 48,
    comments: 17,
    views: 612,
    timeAgo: '2h ago',
    tags: ['LUTs', 'Night'],
  },
  {
    id: '2',
    title: 'How do you structure feedback rounds with clients?',
    excerpt:
      'We keep getting revision loops that eat the timeline. Curious what checklists / frame tools other editors use.',
    author: 'jon.cut',
    group: 'Freelance Tips',
    likes: 31,
    comments: 22,
    views: 390,
    timeAgo: '5h ago',
    tags: ['Clients', 'Process'],
  },
  {
    id: '3',
    title: 'Showcase: wedding film cut in 4 days',
    excerpt:
      'Dropped a short case study on pacing, music beds, and how we handled last-minute speech swaps.',
    author: 'aria.frames',
    group: 'Showcase',
    likes: 96,
    comments: 41,
    views: 1280,
    timeAgo: '1d ago',
    tags: ['Wedding', 'Showcase'],
  },
  {
    id: '4',
    title: 'Group rules reminder — no off-platform hiring spam',
    excerpt:
      'Mods will remove posts that solicit work outside Ensemble. Report anything that looks like a scam funnel.',
    author: 'ensemble.staff',
    group: 'Announcements',
    likes: 12,
    comments: 3,
    views: 840,
    timeAgo: '2d ago',
    tags: ['Rules'],
  },
];

const MOCK_GROUPS: MockGroup[] = [
  {
    id: 'g1',
    name: 'Color & Grading',
    members: 1840,
    discussions: 312,
    description: 'LUTs, scopes, and look development for editors.',
  },
  {
    id: 'g2',
    name: 'Freelance Tips',
    members: 2290,
    discussions: 501,
    description: 'Rates, contracts, and client communication.',
  },
  {
    id: 'g3',
    name: 'Showcase',
    members: 3104,
    discussions: 890,
    description: 'Share finished work and get constructive notes.',
  },
  {
    id: 'g4',
    name: 'Announcements',
    members: 9200,
    discussions: 64,
    description: 'Official updates from the Ensemble community team.',
  },
];

/** Read-only member-facing forum preview for moderators (no live actions yet). */
export default function ForumDiscussion() {
  const [tab, setTab] = useState<TabId>('feed');
  const [search, setSearch] = useState('');

  const posts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_POSTS;
    return MOCK_POSTS.filter((p) =>
      [p.title, p.excerpt, p.group, p.author, ...p.tags].join(' ').toLowerCase().includes(q)
    );
  }, [search]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_GROUPS;
    return MOCK_GROUPS.filter((g) =>
      [g.name, g.description].join(' ').toLowerCase().includes(q)
    );
  }, [search]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'groups', label: 'Groups' },
    { id: 'my-discussions', label: 'My discussions' },
  ];

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">
            Forum Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Forum Discussion</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Member point-of-view preview of the community feed. Read-only for now — moderation
            actions will plug in later.
          </p>
        </div>
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
          Preview · no live data
        </span>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0f1016] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                tab === t.id
                  ? 'bg-violet-500/20 text-white'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search discussions or groups…"
            className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/40"
          />
        </div>
      </div>

      {tab === 'feed' && (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1016] px-5 py-4 transition hover:border-violet-500/25"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-violet-200">
                  {post.group}
                </span>
                <span>@{post.author}</span>
                <span>·</span>
                <span>{post.timeAgo}</span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-white">{post.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{post.excerpt}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {post.likes}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.comments}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  {post.views}
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-zinc-600">
                  <Heart className="h-3.5 w-3.5" />
                  <Bookmark className="h-3.5 w-3.5" />
                  Like / save disabled in preview
                </span>
              </div>
            </article>
          ))}
          {posts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-zinc-500">
              No discussions match your search.
            </p>
          )}
        </div>
      )}

      {tab === 'groups' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <article
              key={group.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1016] px-5 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{group.name}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{group.description}</p>
                  <p className="mt-3 text-[11px] text-zinc-500">
                    {group.members.toLocaleString()} members · {group.discussions} discussions
                  </p>
                </div>
              </div>
            </article>
          ))}
          {groups.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-zinc-500">
              No groups match your search.
            </p>
          )}
        </div>
      )}

      {tab === 'my-discussions' && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f1016] px-6 py-16 text-center">
          <MessagesSquare className="mx-auto h-8 w-8 text-violet-300/70" />
          <p className="mt-3 text-sm font-medium text-white">Staff “my discussions” is a preview stub</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
            This mirrors the member tab where users track posts they started. Wiring to live forum
            data comes later.
          </p>
        </div>
      )}
    </main>
  );
}
