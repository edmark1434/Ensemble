const {
  listPendingOffers,
  listOpenJobs,
  closeJobForBan,
  listOpenGigs,
  closeGigForBan,
  delistListingsForBan,
  withdrawOutgoingForBan,
  countLiveContracts,
} = require('../repositories/BanCleanupRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');

/**
 * After a ban: close the member's open jobs, gigs and marketplace listings, withdraw their
 * pending proposals and gig orders, and return any credits those were holding — so nobody
 * keeps applying to, ordering from, buying from or hiring a banned account.
 *
 * Runs after the ban is saved. A failure on one item is logged and reported, never undoes the
 * ban, and never stops the other items. Live contracts are counted for staff, not touched.
 * @returns {Promise<object>} what was closed, for the staff response and the audit log
 */
async function closeBannedAccountListings(accountId, { staffId = null } = {}) {
  const summary = {
    offersWithdrawn: 0,
    jobsClosed: 0,
    applicantsRefunded: 0,
    creditsRefunded: 0,
    gigsClosed: 0,
    gigOrdersCancelled: 0,
    listingsDelisted: 0,
    proposalsWithdrawn: 0,
    outgoingGigOrdersWithdrawn: 0,
    liveContracts: 0,
    failures: [],
  };
  const fail = (step, id, error) => {
    console.error(`Ban clean-up ${step} ${id || ''} failed:`, error.message);
    summary.failures.push({ step, id: id ? String(id) : null, message: String(error.message || error) });
  };

  // Offers first: rejecting an offer returns its proposal to Shortlisted, which the job close
  // then refunds and closes like any other open application.
  try {
    const { rejectJobOffer } = require('../repositories/ContractRepositories');
    for (const offer of await listPendingOffers(accountId)) {
      try {
        await rejectJobOffer(
          [offer.freelancer_account_id],
          offer.contract_id,
          'Withdrawn by Ensemble: one side of this offer can no longer use the platform.'
        );
        summary.offersWithdrawn += 1;
      } catch (error) {
        fail('offer', offer.contract_id, error);
      }
    }
  } catch (error) {
    fail('offers', null, error);
  }

  try {
    for (const jobId of await listOpenJobs(accountId)) {
      try {
        const closed = await closeJobForBan(jobId);
        if (!closed) continue;
        summary.jobsClosed += 1;
        summary.applicantsRefunded += closed.applicants;
        summary.creditsRefunded += closed.refunded;
      } catch (error) {
        fail('job', jobId, error);
      }
    }
  } catch (error) {
    fail('jobs', null, error);
  }

  try {
    for (const gigId of await listOpenGigs(accountId)) {
      try {
        const closed = await closeGigForBan(gigId);
        if (!closed) continue;
        summary.gigsClosed += 1;
        summary.gigOrdersCancelled += closed.ordersCancelled;
      } catch (error) {
        fail('gig', gigId, error);
      }
    }
  } catch (error) {
    fail('gigs', null, error);
  }

  try {
    summary.listingsDelisted = (await delistListingsForBan(accountId)).listings;
  } catch (error) {
    fail('listings', null, error);
  }

  try {
    const outgoing = await withdrawOutgoingForBan(accountId);
    summary.proposalsWithdrawn = outgoing.proposals;
    summary.outgoingGigOrdersWithdrawn = outgoing.gigOrders;
  } catch (error) {
    fail('outgoing', null, error);
  }

  try {
    summary.liveContracts = await countLiveContracts(accountId);
  } catch (error) {
    fail('contracts', null, error);
  }

  const closedAnything =
    summary.offersWithdrawn ||
    summary.jobsClosed ||
    summary.gigsClosed ||
    summary.listingsDelisted ||
    summary.proposalsWithdrawn ||
    summary.outgoingGigOrdersWithdrawn;

  await recordAccountActivity({
    accountId,
    action: `Ban clean-up: ${describeSummary(summary)}`,
    eventCode: 'ACCOUNT_BAN_CLEANUP',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    actorStaffId: staffId,
    metadata: summary,
  });

  if (closedAnything) {
    try {
      await createNotification({
        account_id: accountId,
        message: `Because your account is banned, Ensemble closed your open postings: ${describeSummary(summary, {
          forMember: true,
        })}. If your appeal is accepted you can post them again.`,
        is_read: false,
        reference_table: 'accounts',
        reference_prefix: 'ACCOUNT_BANNED',
        reference_path: '/notifications',
        reference_id: accountId,
      });
    } catch (error) {
      console.warn('Ban clean-up notice skipped:', error.message);
    }
  }
  return summary;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeSummary(summary, { forMember = false } = {}) {
  const parts = [];
  if (summary.jobsClosed) parts.push(`${plural(summary.jobsClosed, 'job')} closed`);
  if (summary.gigsClosed) parts.push(`${plural(summary.gigsClosed, 'gig')} closed`);
  if (summary.listingsDelisted) parts.push(`${plural(summary.listingsDelisted, 'listing')} delisted`);
  if (summary.offersWithdrawn) parts.push(`${plural(summary.offersWithdrawn, 'offer')} withdrawn`);
  if (summary.proposalsWithdrawn) parts.push(`${plural(summary.proposalsWithdrawn, 'proposal')} withdrawn`);
  if (summary.outgoingGigOrdersWithdrawn) {
    parts.push(`${plural(summary.outgoingGigOrdersWithdrawn, 'gig order')} withdrawn`);
  }
  if (!forMember) {
    if (summary.gigOrdersCancelled) parts.push(`${plural(summary.gigOrdersCancelled, 'incoming order')} cancelled`);
    if (summary.creditsRefunded) parts.push(`${summary.creditsRefunded} credits refunded`);
    if (summary.liveContracts) parts.push(`${plural(summary.liveContracts, 'live contract')} left for staff`);
    if (summary.failures.length) parts.push(`${plural(summary.failures.length, 'item')} failed`);
  }
  return parts.length ? parts.join(', ') : 'nothing open';
}

module.exports = { closeBannedAccountListings, describeSummary };
