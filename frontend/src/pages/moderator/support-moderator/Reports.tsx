import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import ReportDesk from "../shared/ReportDesk";
import type { UserReport } from "../shared/moderatorTypes";

export default function SupportReports() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/support/reports");
      if (res.data?.success) setReports(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: "fadeIn 420ms ease" }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">
            Support Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Same report desk as Admin — open queue chips, triage table, and assign / resolve detail
            modal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <ReportDesk
        reports={reports}
        onUpdated={() => void load()}
        accent="sky"
        endpointBase="/api/moderator/support/reports"
        loading={loading}
      />

      <p className="mt-4 text-xs text-zinc-600">
        Warn, suspend, or ban accounts from{" "}
        <Link to="/moderator/support/user-team" className="text-sky-300 hover:underline">
          User &amp; Team
        </Link>{" "}
        after reviewing a report.
      </p>
    </main>
  );
}
