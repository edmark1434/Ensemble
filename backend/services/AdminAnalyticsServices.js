const {
  getAnalyticsOverview,
  fetchPlatformEconomyDetails,
  fetchPlatformTransactionsList,
  fetchUserTransactionsList,
  fetchTopupTransactionsList,
} = require('../repositories/AdminAnalyticsRepositories');

async function getAdminAnalyticsOverviewService() {
  const overview = await getAnalyticsOverview();
  return overview;
}

async function getAdminPlatformTransactionsService(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const type = query.type || undefined;
  const status = query.status || undefined;
  const direction = query.direction || undefined;
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;

  return await fetchPlatformTransactionsList({
    page,
    limit,
    type,
    status,
    direction,
    search,
  });
}

async function getAdminUserTransactionsService(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const type = query.type || undefined;
  const status = query.status || undefined;
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;

  return await fetchUserTransactionsList({
    page,
    limit,
    type,
    status,
    search,
  });
}

async function getAdminTopupTransactionsService(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const status = query.status || undefined;
  const channel = query.channel || undefined;
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;

  return await fetchTopupTransactionsList({
    page,
    limit,
    status,
    channel,
    search,
  });
}

module.exports = {
  getAdminAnalyticsOverviewService,
  getAdminPlatformTransactionsService,
  getAdminUserTransactionsService,
  getAdminTopupTransactionsService,
};
