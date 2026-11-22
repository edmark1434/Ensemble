/**
 * Teams have no Platform Merit of their own (docs/merit-system.md). Staff screens read a team
 * through its people instead: every active member's merit added up and shown as a percentage of
 * the most they could have (100 each). Five members at 100 → 500 / 500 = 100%; one of them at 50
 * → 450 / 500 = 90%. Also the average, the lowest member and how many sit at merit 60 or below
 * (where automatic punishments start).
 * @param {Array<{ accountId: string, name: string, merit: number|null }>} members
 */
function memberMeritSummary(members = []) {
  const rated = members.filter((member) => Number.isFinite(Number(member?.merit)) && member?.merit !== null);
  const total = rated.reduce((sum, member) => sum + Number(member.merit), 0);
  const lowest = rated.reduce((low, member) => (!low || Number(member.merit) < Number(low.merit) ? member : low), null);
  const max = rated.length * 100;
  return {
    total,
    max,
    // Rounded down, so a team is only 100% when every member is at 100.
    percent: max ? Math.floor((total / max) * 100) : null,
    members: rated.length,
    average: rated.length ? Math.round(total / rated.length) : null,
    lowest: lowest ? { accountId: String(lowest.accountId), name: lowest.name, merit: Number(lowest.merit) } : null,
    below60: rated.filter((member) => Number(member.merit) <= 60).length,
  };
}

module.exports = { memberMeritSummary };
