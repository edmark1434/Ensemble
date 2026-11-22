const {
  listLiveContractsForAccount,
  listRestrictedPartyContracts,
  countRestrictedPartyContracts,
} = require('../repositories/RestrictedWorkRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');

/**
 * Live work with a restricted party (docs/punishment-system.md §9):
 *  - the people on the other side of a live contract are told when that side is suspended,
 *    locked or banned, and again when it can act again;
 *  - staff get one queue of every such contract, with the escrow it still holds.
 * Punishment never moves credits by itself; staff settle through the contract / dispute tools.
 */

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function counterpartyMessage(status, title, endsAt) {
  const name = `"${title || 'your contract'}"`;
  switch (String(status || '').toLowerCase()) {
    case 'banned':
      return `The other side of ${name} can no longer use Ensemble. Your credits in escrow are safe: Ensemble Support will settle this contract with you. You can also open a dispute from the contract.`;
    case 'locked':
      return `The other side of ${name} is restricted while staff review their account, so they can't act on the contract for now. Your escrow stays safe. Contact Support or open a dispute if you need it resolved.`;
    case 'suspended': {
      const until = formatWhen(endsAt);
      return `The other side of ${name} is suspended${until ? ` until ${until}` : ''} and can't act on the contract until then. Your escrow stays safe. Contact Support or open a dispute if you can't wait.`;
    }
    case 'active':
      return `The other side of ${name} can act on the contract again.`;
    default:
      return null;
  }
}

async function notifyAccount(accountId, message, contractId) {
  const notification = await createNotification({
    account_id: accountId,
    message,
    is_read: false,
    reference_table: 'contracts',
    reference_prefix: 'CONTRACT_PARTY_STANDING',
    reference_path: `/contracts/${contractId}`,
    reference_id: contractId,
  });
  try {
    const io = require('../lib/WebSocket').getIo();
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (_err) {
    // The notification is saved; the live push is best effort.
  }
}

/**
 * Tell the other side of each live contract that `accountId` changed standing.
 * A team on the other side has no inbox: its Owners and Admins are told.
 * Best effort: never throws, so it can never undo the standing change that called it.
 * @param {string} accountId the account whose standing changed
 * @param {'Suspended'|'Locked'|'Banned'|'Active'} status the new standing
 * @param {{ endsAt?: string|Date|null }} [options]
 * @returns {Promise<number>} how many contracts' counterparties were told
 */
async function notifyLiveWorkCounterparties(accountId, status, { endsAt = null } = {}) {
  try {
    const contracts = await listLiveContractsForAccount(accountId, { includePendingSignature: true });
    if (!contracts.length) return 0;
    const { describeTeamAccount, notifyTeamManagers } = require('./TeamStandingServices');
    let told = 0;
    for (const contract of contracts) {
      const message = counterpartyMessage(status, contract.title, endsAt);
      const otherId = contract.other_account_id;
      if (!message || !otherId || String(otherId) === String(accountId)) continue;
      try {
        const team = await describeTeamAccount(otherId);
        if (team.isTeam) {
          await notifyTeamManagers(otherId, {
            message,
            prefix: 'CONTRACT_PARTY_STANDING',
            referenceTable: 'contracts',
            referenceId: contract.contract_id,
            path: `/contracts/${contract.contract_id}`,
          });
        } else {
          await notifyAccount(otherId, message, contract.contract_id);
        }
        told += 1;
      } catch (err) {
        console.warn(`Counterparty notice for contract ${contract.contract_id} skipped:`, err.message);
      }
    }
    return told;
  } catch (err) {
    console.warn('Counterparty standing notices skipped:', err.message);
    return 0;
  }
}

const REASON_LABEL = {
  banned: 'Banned',
  locked: 'Locked',
  suspended: 'Suspended',
  team_leader: 'Team leader restricted',
};

function party(row, side) {
  const reason = row[`${side}_reason`] || null;
  return {
    accountId: String(row[`${side}_account_id`]),
    name: row[`${side}_name`] || row[`${side}_handle`] || 'Member',
    handle: row[`${side}_handle`] || null,
    type: row[`${side}_type`] || null,
    restricted: Boolean(reason),
    reason,
    reasonLabel: reason ? REASON_LABEL[reason] || reason : null,
    standing: row[`${side}_standing`] || null,
    restrictedSince: reason ? row[`${side}_restricted_since`] || null : null,
  };
}

/**
 * Staff queue: live contracts with a restricted side, oldest first, with held escrow.
 * @param {{ limit?: any, offset?: any, status?: string, search?: string }} query
 */
async function listRestrictedWork(query = {}) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0);
  const [rows, counts] = await Promise.all([
    listRestrictedPartyContracts({
      limit,
      offset,
      status: String(query.status || 'all').toLowerCase(),
      search: String(query.search || '').slice(0, 120),
    }),
    countRestrictedPartyContracts(),
  ]);
  const { remainingContractEscrowCredits } = require('../lib/DisputeEscrow');
  const items = [];
  for (const row of rows) {
    let escrowCredits = null;
    try {
      escrowCredits = await remainingContractEscrowCredits(null, { contractId: row.contract_id });
    } catch (err) {
      console.warn(`Escrow read for contract ${row.contract_id} failed:`, err.message);
    }
    const client = party(row, 'client');
    const freelancer = party(row, 'freelancer');
    const since = [client.restrictedSince, freelancer.restrictedSince]
      .filter(Boolean)
      .map((value) => new Date(value).getTime())
      .sort((a, b) => a - b)[0];
    items.push({
      contractId: String(row.contract_id),
      kind: row.kind,
      title: row.title || 'Untitled contract',
      status: row.contract_status,
      createdAt: row.contract_created_at,
      startsAt: row.starts_at,
      client,
      freelancer,
      restrictedSince: since ? new Date(since).toISOString() : null,
      escrowCredits,
      openDispute: row.open_dispute_id
        ? { id: String(row.open_dispute_id), number: row.open_dispute_number || null }
        : null,
    });
  }
  return {
    items,
    total: rows[0]?.total_count || 0,
    limit,
    offset,
    counts: {
      total: Number(counts.total || 0),
      banned: Number(counts.banned || 0),
      locked: Number(counts.locked || 0),
      suspended: Number(counts.suspended || 0),
      teamLeader: Number(counts.team_leader || 0),
    },
  };
}

module.exports = {
  notifyLiveWorkCounterparties,
  counterpartyMessage,
  listRestrictedWork,
};
