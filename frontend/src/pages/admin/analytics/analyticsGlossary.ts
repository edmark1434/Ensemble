/**
 * What every Admin → Analytics figure means and where it comes from. Shown in the ⓘ popovers
 * next to each number and in the Definitions drawer. Keep it in step with the definitions in
 * backend/repositories/AdminAnalyticsRepositories.js (the header comment lists the money rules).
 */

export type GlossaryEntry = {
  term: string;
  /** Plain meaning: what the number tells you. */
  what: string;
  /** Where the data is read from. */
  source?: string;
  /** How it is worked out, as a short formula. */
  calc?: string;
  /** Caveats and how to read it. */
  note?: string;
};

export const GLOSSARY = {
  // ── Reading this page ─────────────────────────────────────────────────────
  range: {
    term: 'Date range and interval',
    what: 'Anything described as "in this period" only counts what happened between the start and end dates in the picker, both days included. Charts split the range into days, weeks or months.',
    source: 'Dates are read in the database time zone. The interval is chosen from the length of the range unless you pick one.',
    note: 'Weeks start on Monday. The first or last bar can be a partial week or month; its tooltip says "(partial)".',
  },
  change: {
    term: 'Change badge',
    what: 'The small percentage next to a number compares it with the period of the same length just before this one. Green means it moved the good way, red the bad way, grey when neither direction is good or bad.',
    calc: '(this period − previous period) ÷ previous period',
    note: 'Hover the badge to see the previous figure. It is hidden for All time, where there is no earlier period.',
  },
  snapshot: {
    term: '"Right now" figures',
    what: 'Queue sizes, balances and plan counts are live counts from the moment the page was calculated. Changing the date range does not change them.',
  },
  cache: {
    term: 'Updated and cached',
    what: 'The server calculates the whole page at once and keeps the result for up to a minute. An open page re-reads it every minute, and Refresh recalculates it straight away.',
  },
  members: {
    term: 'Who counts as a member',
    what: 'Person accounts that are not deleted, in any standing. Team accounts are not members.',
    source: 'accounts table, type User.',
  },
  creditValue: {
    term: 'Credit value',
    what: 'What one credit is worth in pesos. Credit figures marked ≈ are converted at this rate.',
    source: 'System settings → Economy.',
  },

  // ── Members and activity ──────────────────────────────────────────────────
  newMembers: {
    term: 'New members',
    what: 'Person accounts created in this period.',
    source: 'Account sign-up date. Accounts deleted since then are left out, including from past periods.',
  },
  activeMembers: {
    term: 'Active members',
    what: 'Different members who used Ensemble while signed in on at least one day in this period. Someone active on ten days still counts once.',
    source: 'Every signed-in request marks that member as active for the day (account_active_days, one row per member per day). Staff sessions are not counted.',
    note: 'Only days since activity tracking started have data.',
  },
  totalMembers: {
    term: 'Members',
    what: 'All person accounts that are not deleted. "In good standing" are the ones whose account status is Active.',
  },
  verified: {
    term: 'Verified',
    what: 'Members with at least one identity verification marked verified. Pending means a check is waiting for review, in review, or needs reverification.',
    source: 'verifications and verification_sessions.',
  },
  dau: {
    term: 'Active today',
    what: 'Different members who used the site while signed in today (database date).',
  },
  wau: {
    term: 'Last 7 days',
    what: 'Different members active on at least one day from 6 days ago to today.',
  },
  mau: {
    term: 'Last 30 days',
    what: 'Different members active on at least one day from 29 days ago to today.',
  },
  stickiness: {
    term: 'Stickiness',
    what: 'How often this month’s members come back. 25% means the typical member who visited this month came on about 1 day in 4.',
    calc: 'average members active per day (last 30 days) ÷ members active in the last 30 days',
    note: 'Higher is better. If tracking started less than 30 days ago, the average uses only the tracked days.',
  },
  averageDaily: {
    term: 'Average active per day',
    what: 'How many members were active on a typical day in this period.',
    calc: 'sum of each day’s active members ÷ tracked days in the period',
  },
  returning: {
    term: 'Returning members',
    what: 'Members active in this period who joined before it started.',
  },
  newActive: {
    term: 'New members who were active',
    what: 'Members active in this period who also joined during it.',
    calc: 'active in period − returning members',
  },
  retention: {
    term: 'Retention by signup week',
    what: 'Each row is the members who joined in that week. "Week 0" is the week they joined, "+1" the week after, and so on. A cell is the share of that row who used the site at least once that week.',
    source: 'Sign-up date plus the daily activity record. Covers the last eight signup weeks.',
    note: 'Darker cells mean more of the group came back. A dot means that week is before tracking started.',
  },
  standing: {
    term: 'Account standing',
    what: 'Members by account status: Active, Suspended, Banned, Locked, or Deactivated (turned off by the member). "Other" is any status that is none of these.',
  },
  profile: {
    term: 'Profile completeness',
    what: 'Members who have set a profile picture, a tagline, and both.',
  },
  emailDomains: {
    term: 'Email providers',
    what: 'The most common domains in member email addresses. Useful for spotting many sign-ups from one unusual domain.',
  },

  // ── Money ─────────────────────────────────────────────────────────────────
  platformRevenue: {
    term: 'Platform revenue',
    what: 'Money Ensemble earned and keeps in this period, as opposed to money that still belongs to members.',
    calc: 'Subscriptions + platform fees + official asset sales (credits × credit value) + top-up markup',
    source: 'Paid subscription invoices and upgrade payments, Completed fee entries net of refunds, purchases of Ensemble’s own marketplace assets, and paid top-ups compared with the credits they issued.',
    note: 'Top-up sales are not revenue: those pesos became credits members can still spend or cash out. Only the markup, when a package costs more than its credits are worth, is kept. Cashout fees are not revenue either: the payout provider keeps them.',
  },
  platformCosts: {
    term: 'Platform costs',
    what: 'Credits Ensemble handed out without being paid for them, valued in pesos. They can be spent or cashed out like bought credits.',
    calc: 'staff credit grants + credits paid out by the platform wallet + top-up bonus credits − staff deductions',
    source: 'Credit ledger: staff balance adjustments, and platform wallet → member, team or escrow wallet entries that are not top-ups or refunds (fee refunds are already taken off fee revenue). A reversed entry and its reversal cancel out. Staff wallets are left out.',
    note: 'Payment-provider charges (Xendit), hosting and other running costs are not recorded in Ensemble, so they are not included.',
  },
  netProfit: {
    term: 'Net profit',
    what: 'What Ensemble kept after the credits it gave away. Negative means more was given away than earned.',
    calc: 'Platform revenue − Platform costs',
    note: 'Before payment-provider charges and running costs, which Ensemble does not record. Not the same as Net cash: cash also moves when members top up or cash out their own credits.',
  },
  profitMargin: {
    term: 'Profit margin',
    what: 'How much of each peso of revenue Ensemble kept.',
    calc: 'Net profit ÷ Platform revenue',
    note: 'Shown as — when there was no revenue in the period.',
  },
  earningsStatement: {
    term: 'Platform earnings',
    what: 'A profit and loss view for the period: every source of revenue, every cost, and the profit that leaves, with the previous period and the lifetime total beside it.',
    note: 'Credit amounts are converted at today’s credit value.',
  },
  officialAssets: {
    term: 'Official asset sales',
    what: 'Credits members spent on marketplace assets uploaded by Ensemble staff. The whole price goes to the platform wallet, with no seller share.',
    calc: 'asset purchases into the platform wallet − asset refunds out of it, in credits (≈ pesos at the credit value)',
    source: 'Completed Asset Purchase entries in the credit ledger whose destination is the platform wallet.',
    note: 'Commissions on members’ own asset sales are counted under Platform fees instead.',
  },
  topupMarkup: {
    term: 'Top-up markup and bonus credits',
    what: 'The difference between what members paid for top-ups and what the credits they got are worth. When packages cost more than their credits, the extra is revenue; when they include bonus credits, the extra credits are a cost.',
    calc: 'paid top-up pesos − credits issued × credit value',
    note: 'Worked out over the whole period at today’s credit value.',
  },
  lifetimeEarnings: {
    term: 'Lifetime',
    what: 'Revenue, costs and profit over everything Ensemble has recorded up to today, whatever range is picked.',
  },
  earningsChart: {
    term: 'Revenue, costs and profit over time',
    what: 'Platform revenue, platform costs and net profit for each interval. Adds up to the tiles above.',
  },
  cashIn: {
    term: 'Cash in',
    what: 'Real pesos that came in from members in this period.',
    calc: 'Top-up sales + Subscription revenue',
    source: 'Payment provider (Xendit) records: paid top-ups and paid subscription invoices by the day they were paid, plus upgrade payments.',
    note: 'Fee revenue is not added: fees are credits members already paid for with a top-up, so adding them would count the same pesos twice.',
  },
  cashOut: {
    term: 'Cash out',
    what: 'Real pesos sent to members’ banks or e-wallets in this period.',
    calc: 'net amount of succeeded cashouts requested in this period',
    note: 'Same figure as "Cashouts paid".',
  },
  netCash: {
    term: 'Net cash',
    what: 'How much more money came in than went out in this period. Negative means more was paid out to members than came in.',
    calc: 'Cash in − Cash out',
    source: 'Top-ups, subscription payments and succeeded cashouts in this period.',
    note: 'This is not profit (see Net profit). Most top-up pesos still belong to members as credits they can spend or cash out later (see Credits outstanding), and payment-provider charges and running costs are not taken off.',
  },
  topupSales: {
    term: 'Top-up sales',
    what: 'Pesos members paid to buy credits.',
    calc: 'sum of paid top-up amounts in this period',
    source: 'Top-up payments with a paid status from the payment provider, dated by when the payment went through.',
    note: 'Money received, not earned: members can still spend or cash out the credits they bought.',
  },
  subscriptionRevenue: {
    term: 'Subscription revenue',
    what: 'Pesos from paid plans: renewals charged plus one-time upgrade payments.',
    calc: 'paid renewal invoices + upgrade payments',
    source: 'Subscription invoices Xendit charged successfully, dated by the day they were paid, and subscription payments for upgrades.',
    note: 'Older invoices that were saved in pesos instead of centavos are corrected when the amount matches the plan price.',
  },
  feeRevenue: {
    term: 'Fee revenue',
    what: 'Credits Ensemble kept as fees: commissions on contracts, gigs and marketplace sales, plus job posting, proposal and gig posting fees.',
    calc: 'fees charged − fees refunded, in credits (≈ pesos at the credit value)',
    source: 'Completed fee entries in the credit ledger.',
    note: 'Fees move credits inside Ensemble, so they are not part of Cash in.',
  },
  cashoutsPaid: {
    term: 'Cashouts paid',
    what: 'Pesos sent to members for cashouts that succeeded.',
    calc: 'sum of net payouts (after the payout provider’s cashout fee)',
    source: 'Cashout records with a succeeded status, dated by the day the member asked for the cashout.',
    note: 'A cashout requested in this period but paid later is counted here once it succeeds. The change badge stays grey: more cashouts are neither good nor bad.',
  },
  creditsOutstanding: {
    term: 'Credits outstanding',
    what: 'What Ensemble would owe if every member and team cashed out their whole balance today.',
    calc: '(spendable + on staff hold credits in member and team wallets) × credit value',
    source: 'Wallet balances right now. Staff wallets, contract escrow and the platform wallet are not included.',
    note: 'Before cashout fees. Compare it with Net cash: this is the part of the money that came in that still belongs to members.',
  },
  mrr: {
    term: 'Monthly recurring revenue (MRR)',
    what: 'What current paid subscriptions bring in per month at list price.',
    calc: 'sum of each paying member’s plan price as a monthly amount (yearly ÷ 12, weekly × 52 ÷ 12, daily × 30)',
    source: 'Each member’s latest active subscription and its plan price today.',
    note: 'Uses list prices, so members in a trial or set to cancel are still counted until their plan ends.',
  },
  cashFlow: {
    term: 'Cash flow chart',
    what: 'Pesos in (top-ups, subscriptions) and out (cashouts) for each interval. Adds up to the Cash in and Cash out tiles.',
    note: 'Top-ups are placed by paid date, subscriptions by invoice paid date, cashouts by request date.',
  },
  topupOrders: {
    term: 'Top-up orders',
    what: 'Top-up orders members started in this period and how they ended: paid, still waiting for payment, or failed, cancelled or expired.',
    source: 'Top-up payments, counted by the day the order was placed.',
    note: 'The Top-up sales tile counts by the day the payment went through, so the two can differ slightly near the start or end of the range.',
  },
  creditsIssued: {
    term: 'Credits issued',
    what: 'Credits added to member wallets by paid top-ups.',
  },
  paymentChannel: {
    term: 'Payment channel',
    what: 'How the member paid (for example GCash, Maya or card), as reported by the payment provider.',
  },
  planCounts: {
    term: 'Paying, canceling, trial and free',
    what: 'Members by their current plan. Paying: on a paid plan. Canceling: paying, but set to stop at the end of the billing period. In trial: on a paid plan that is still in its trial. Free plan: on the free plan.',
    note: 'Canceling and In trial are part of Paying.',
  },
  subscriptionPeriod: {
    term: 'Subscription changes in this period',
    what: 'New paid subscriptions started and ones cancelled in this period, renewals Xendit charged or failed to charge, and one-time upgrade payments.',
    note: 'A failed renewal ends the subscription. See Records → Invoices for each one.',
  },
  feeTypes: {
    term: 'Fee types',
    what: 'Commissions: Ensemble’s share when contract work, a gig order or a marketplace asset is paid. Job posting fee: paid by a client to post a job. Proposal fee: paid by a freelancer to send a proposal. Gig posting fee: paid by a freelancer to publish a gig.',
    note: 'Posting and proposal fees are refunded in some cases, for example when a job closes without a hire. Refunds are taken off.',
  },
  cashoutBreakdown: {
    term: 'Cashouts breakdown',
    what: 'Cashouts members requested in this period. Paid out is the pesos they received; credits redeemed is what left their wallets; failed or returned are ones the provider failed, rejected or reversed, or that expired.',
    source: 'Cashout records, dated by request.',
  },
  inFlight: {
    term: 'Cashouts in flight',
    what: 'Cashouts sent to the payout provider that have not succeeded or failed yet (pending, processing, accepted or requested).',
    note: 'Anything waiting over 24 hours usually means the provider is stuck. Check the Credits desk.',
  },
  creditBalances: {
    term: 'Credit balances',
    what: 'Held by members: credits in member and team wallets, spendable plus anything on a staff hold. In contract escrow: credits clients have locked for contracts that are not released or refunded yet. Platform wallet: Ensemble’s own wallet, where fees land.',
    source: 'Wallet balances right now, staff wallets left out.',
  },
  feeChart: {
    term: 'Fee revenue over time',
    what: 'Net fee credits for each interval. Adds up to the Fee revenue figure.',
  },
  records: {
    term: 'Records',
    what: 'Every top-up, invoice, subscription and cashout behind the figures on this tab, one row each. Filter by status, channel or plan, search, and export to CSV.',
  },

  // ── Queues ────────────────────────────────────────────────────────────────
  needsAttention: {
    term: 'Needs attention',
    what: 'Open work across the platform, warnings first: open tickets, reports and disputes, listings and identity checks waiting, cashouts waiting over 24 hours, failed renewals in this period and wallets below zero.',
  },
  openTickets: {
    term: 'Open tickets',
    what: 'Support tickets that are not closed. Unassigned: no staff member has taken it. High priority: priority set to High.',
  },
  openReports: {
    term: 'Open reports',
    what: 'Member reports still waiting for a moderator decision.',
  },
  openDisputes: {
    term: 'Open disputes',
    what: 'Contract and transaction disputes that are not closed.',
  },
  pendingListings: {
    term: 'Listings to review',
    what: 'Marketplace submissions waiting for a review decision. Approved listings scheduled to go live later are not counted.',
  },
  identityChecks: {
    term: 'Identity checks',
    what: 'Members whose identity verification is pending, in review or needs reverification, and who are not verified yet.',
  },
  activeWarnings: {
    term: 'Active warnings',
    what: 'Warnings on members that are active and not expired. Their points are what lower Platform Merit (100 minus active warning points).',
  },
  teams: {
    term: 'Teams',
    what: 'All team accounts, contract workspaces included.',
  },
  moneyChart: {
    term: 'Money in and out',
    what: 'Top-up sales, subscription revenue and paid cashouts for each interval: the money tiles spread over time.',
    note: 'Cashouts are placed on the day they were requested.',
  },
  volumeChart: {
    term: 'Incoming work',
    what: 'New support tickets, reports and marketplace listing submissions for each interval, by the day they were created.',
  },

  // ── Community ─────────────────────────────────────────────────────────────
  forumSource: {
    term: 'Forum figures',
    what: 'Read from the forum database (MongoDB). Deleted discussions, deleted comments and deleted groups are left out.',
  },
  discussionsStarted: {
    term: 'Discussions started',
    what: 'Forum discussions created in this period. "In total" counts every discussion that still exists.',
  },
  comments: {
    term: 'Comments',
    what: 'Comments posted in this period on discussions that still exist. "People commented" counts each member once.',
  },
  peoplePosting: {
    term: 'People posting',
    what: 'Different members who started at least one discussion in this period.',
  },
  newGroups: {
    term: 'New groups',
    what: 'Forum groups created in this period. "Active of total" is groups whose status is active, out of every group that is not deleted.',
  },
  memberships: {
    term: 'Group memberships',
    what: 'Seats across all groups: a member in three groups counts three times. Members banned from a group are left out.',
    note: 'All time, not limited to the date range.',
  },
  averageGroupSize: {
    term: 'Average group size',
    what: 'How many members a group has on average.',
    calc: 'group memberships ÷ groups',
  },
  inactiveGroups: {
    term: 'Inactive groups',
    what: 'Groups whose status is not active, such as archived groups.',
  },
  mostDiscussed: {
    term: 'Most discussed',
    what: 'Discussions started in this period with the most comments, then the most likes.',
  },

  // ── Operations ────────────────────────────────────────────────────────────
  ticketsClosed: {
    term: 'Tickets closed',
    what: 'Tickets closed in this period, whenever they were opened.',
  },
  firstReply: {
    term: 'Median first reply',
    what: 'The typical wait from a ticket being opened to the first staff reply, for tickets opened in this period. Half were answered faster, half slower.',
    note: 'A median is used so a few very old tickets do not distort it.',
  },
  timeToClose: {
    term: 'Median time to close',
    what: 'For tickets closed in this period, the typical time from opening to closing.',
  },
  satisfaction: {
    term: 'Satisfaction',
    what: 'Average rating from 1 to 5 that members gave their tickets in this period.',
  },
  periodCounts: {
    term: 'Opened in this period',
    what: 'Tickets, reports and disputes opened, and marketplace listings submitted, in this period.',
    note: 'For tickets, reports and disputes, going up shows red: more problems are coming in.',
  },
  staff: {
    term: 'Staff',
    what: 'Staff accounts by role. "Active" means the account itself is active (not suspended or locked), not that the person is online.',
  },

  // ── Traffic & rate limits ─────────────────────────────────────────────────
  trafficScope: {
    term: 'Traffic monitor',
    what: 'Live request counts kept in this API process. They start over when the server restarts, and with several servers each one shows only its own traffic.',
  },
  ipCheck: {
    term: 'IP pass-through check',
    what: 'How the server reads the IP of your own request. Limits for signed-out visitors depend on seeing the real visitor IP through Cloudflare and the proxy. If every visitor resolved to the proxy address, they would all share one budget.',
  },
  requests: {
    term: 'Requests',
    what: 'API requests checked by the rate limiter in the last hour, allowed and blocked together.',
  },
  blocked: {
    term: 'Blocked (429)',
    what: 'Requests the rate limiter turned away with HTTP 429 (Too Many Requests) in the last hour, and their share of all requests.',
    note: 'A few are normal. A sudden rise usually means a script, a retry loop, or a shared network hitting the network ceiling.',
  },
  liveAccounts: {
    term: 'Active accounts',
    what: 'Signed-in accounts that have a rate-limit window running right now. Each account has its own budget and is never limited by IP.',
  },
  liveBrowsers: {
    term: 'Signed-out browsers',
    what: 'Signed-out browsers with a window running right now, and how many networks (IPs) they come from.',
  },
  nearLimit: {
    term: 'Near or over limit',
    what: 'Live windows that have used 80% or more of their limit. "Currently blocked" are over it and getting 429s until the window resets.',
  },
  policies: {
    term: 'Limits',
    what: 'Each policy covers one kind of request. Per account applies to signed-in people, per browser to signed-out visitors, and the network ceiling caps all signed-out traffic from one IP.',
  },
  sharedIps: {
    term: 'Shared networks',
    what: 'IPs used by several people at once, such as campus or office Wi-Fi. Each person still has their own budget; only signed-out traffic shares the network ceiling.',
  },
  busiestWindows: {
    term: 'Busiest rate-limit windows',
    what: 'Live windows sorted by how close they are to their limit. Reset clears one window straight away, for example for a member blocked by mistake.',
  },
  recent429: {
    term: 'Recent 429 responses',
    what: 'The latest blocked requests, newest first. Retries of the same request within a minute are grouped into one row.',
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof GLOSSARY;

export type GlossarySection = { id: string; title: string; ids: GlossaryId[] };

/** Drawer sections, keyed by the analytics tab they belong to. */
export const GLOSSARY_SECTIONS: GlossarySection[] = [
  { id: 'basics', title: 'Reading this page', ids: ['range', 'change', 'snapshot', 'cache', 'members', 'creditValue'] },
  {
    id: 'overview',
    title: 'Overview',
    ids: ['newMembers', 'activeMembers', 'platformRevenue', 'netProfit', 'topupSales', 'subscriptionRevenue', 'feeRevenue', 'cashoutsPaid', 'needsAttention', 'moneyChart', 'volumeChart'],
  },
  {
    id: 'members',
    title: 'Members',
    ids: ['totalMembers', 'verified', 'dau', 'wau', 'mau', 'stickiness', 'averageDaily', 'returning', 'newActive', 'retention', 'standing', 'profile', 'emailDomains'],
  },
  {
    id: 'community',
    title: 'Community',
    ids: ['forumSource', 'discussionsStarted', 'comments', 'peoplePosting', 'newGroups', 'memberships', 'averageGroupSize', 'inactiveGroups', 'mostDiscussed'],
  },
  {
    id: 'money',
    title: 'Revenue & credits',
    ids: [
      'platformRevenue',
      'platformCosts',
      'netProfit',
      'profitMargin',
      'earningsStatement',
      'officialAssets',
      'topupMarkup',
      'lifetimeEarnings',
      'earningsChart',
      'cashIn',
      'cashOut',
      'netCash',
      'creditsOutstanding',
      'mrr',
      'cashFlow',
      'topupOrders',
      'creditsIssued',
      'paymentChannel',
      'planCounts',
      'subscriptionPeriod',
      'feeTypes',
      'cashoutBreakdown',
      'inFlight',
      'creditBalances',
      'feeChart',
      'records',
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    ids: ['openTickets', 'openReports', 'openDisputes', 'pendingListings', 'identityChecks', 'activeWarnings', 'teams', 'ticketsClosed', 'firstReply', 'timeToClose', 'satisfaction', 'periodCounts', 'staff'],
  },
  {
    id: 'traffic',
    title: 'Traffic & rate limits',
    ids: ['trafficScope', 'ipCheck', 'requests', 'blocked', 'liveAccounts', 'liveBrowsers', 'nearLimit', 'policies', 'sharedIps', 'busiestWindows', 'recent429'],
  },
];
