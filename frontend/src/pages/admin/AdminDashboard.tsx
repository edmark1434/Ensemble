import {
  BellRing,
  CircleAlert,
  ListChecks,
  UserRound,
  UserRoundCheck,
} from "lucide-react";

type StatCard = {
  label: string;
  value: string;
};

type FeedRow = {
  title: string;
  time: string;
};

const stats: StatCard[] = [
  { label: "Pending Verifications", value: "20" },
  { label: "Open Disputes", value: "30" },
  { label: "Platform Revenue", value: "232,145" },
  { label: "Active Users", value: "250" },
  { label: "Open Tickets", value: "50" },
  { label: "Pending Approval", value: "25" },
];

const recentActivity: FeedRow[] = [
  { title: "Moderator x suspended user y", time: "August 16, 2026, 11:55 AM" },
  { title: "Moderator x suspended user y", time: "August 16, 2026, 11:55 AM" },
  { title: "Moderator x suspended user y", time: "August 16, 2026, 11:55 AM" },
  { title: "Moderator x suspended user y", time: "August 16, 2026, 11:55 AM" },
];

const economyFeed: FeedRow[] = [
  { title: "Credit Adjustment: +1,500 System Error", time: "5 secs ago." },
  { title: "Freelancer Payout: +1,200 Credits", time: "10 min ago." },
  { title: "Asset Purchased: -502 Credits", time: "52 min ago." },
  { title: "Credit Refunded: +2,521", time: "1 hr ago." },
];

const onlineStaff = [
  "Jodelic Pacbe",
  "John Paul Mahilom",
  "Edmark Talingting",
];

const alerts = [
  "Malicious of increase flagged assets!",
  "Moderator x has made 25 actions within a day!",
  "User X made a massive purchase on his account!",
];

const AdminDashboard = () => {
  return (
    <main className="relative z-10 px-4 py-4 md:ml-72 md:px-8 md:py-6">
      <div className="animate-[fadeIn_420ms_ease-out]">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <div className="h-5 w-80 rounded-full bg-white/10 md:w-[520px]" />
          <div className="flex items-center gap-3 text-white">
            <BellRing className="h-6 w-6" />
            <UserRound className="h-6 w-6" />
          </div>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_290px]">
          <section>
            <h1 className="mb-4 text-2xl font-semibold tracking-wide text-white md:text-3xl">
              Admin Dashboard Overview
            </h1>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {stats.map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-center shadow-lg shadow-black/20">
                  <p className="mb-1 text-[11px] leading-tight text-zinc-300">{stat.label}</p>
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-xs text-zinc-200">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="truncate">{alert}</span>
              </div>
            ))}
          </aside>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">System Recent Activity Feed</h2>
                <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-200">+ View All</button>
              </div>
              <div className="space-y-3 text-sm text-zinc-300">
                {recentActivity.map((row) => (
                  <div key={row.title} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <span className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-zinc-500" />{row.title}</span>
                    <span className="text-zinc-400">{row.time}</span>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Credits & Economy Activity Feed</h2>
                  <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-200">+ View All</button>
                </div>
                <div className="space-y-3 text-sm text-zinc-300">
                  {economyFeed.map((row) => (
                    <div key={row.title} className="flex items-start justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-zinc-500" />{row.title}</p>
                        <p className="pl-6 text-[11px] text-zinc-500">User ID: abc1234</p>
                      </div>
                      <span className="text-zinc-400">{row.time}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <h2 className="mb-3 text-lg font-semibold text-white">Announcement</h2>
                <div className="mb-4 h-40 rounded-2xl border border-white/10 bg-white/10 p-3 text-sm text-zinc-500">
                  Announcement Description
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-md border border-white/10 bg-white px-3 py-2 text-xs font-medium text-zinc-900">Publish</button>
                  <button className="flex-1 rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200">Clear</button>
                </div>
              </article>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Current Online Staff</h2>
            <div className="space-y-3 text-sm text-zinc-300">
              {onlineStaff.map((name) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30">
                    <UserRoundCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{name}</p>
                    <p className="text-[11px] text-zinc-500">Science Dispute Moderator</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
