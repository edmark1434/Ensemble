import React, { useEffect, useState } from "react";
import api from "@/lib/axios";

type MarketplaceActor = {
  account_id: string;
  team_id: string | null;
  display_name: string;
  handle: string;
  type: string;
  role: string;
  is_verified: boolean;
};

type Props = {
  teamId: string;
  onChange: (teamId: string) => void;
  label?: string;
  teamsOnly?: boolean;
  requireTeamVerification?: boolean;
};

const MarketplaceIdentitySelector: React.FC<Props> = ({
  teamId,
  onChange,
  label = "Continue as",
  teamsOnly = false,
  requireTeamVerification = true,
}) => {
  const [actors, setActors] = useState<MarketplaceActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/api/teams/marketplace-actors")
      .then((response) => {
        if (!active) return;
        const rows = response.data?.data ?? response.data ?? [];
        setActors(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (active) setError("Unable to load your marketplace identities.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const personal = actors.find((actor) => !actor.team_id);
  const teams = actors.filter((actor) => actor.team_id);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400">
        {label}
      </label>
      <select
        value={teamId}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-medium text-gray-900 outline-none transition hover:border-blue-400 focus:border-blue-500 dark:border-white/10 dark:bg-dark-base dark:text-white disabled:cursor-wait disabled:opacity-60"
      >
        {teamsOnly ? (
          <option value="" disabled>
            {loading
              ? "Loading teams..."
              : teams.length
                ? requireTeamVerification
                  ? "Select a verified team"
                  : "Select a team"
                : "No eligible teams available"}
          </option>
        ) : (
          <option value="">
            {loading ? "Loading identities..." : personal?.display_name || "My personal account"}
          </option>
        )}
        {teams.map((actor) => (
          <option
            key={actor.team_id!}
            value={actor.team_id!}
            disabled={requireTeamVerification && !actor.is_verified}
          >
            {actor.display_name} — Team
            {requireTeamVerification && !actor.is_verified ? " (verification required)" : ""}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {!loading && teams.length === 0 && (
        <p className="text-[11px] text-gray-500 dark:text-zinc-500">
          Active team Owners and Admins will appear here.
        </p>
      )}
    </div>
  );
};

export default MarketplaceIdentitySelector;
