import { prefetchStaffGet } from './staffCache';

type DataRequest = string | [url: string, params: Record<string, unknown>];

const USER_TEAM_OVERVIEW = '/api/admin/user-team-overview';

/** GETs each console page fires on first mount with its default tab and filters. */
const ROUTE_DATA: Record<string, DataRequest[]> = {
  '/admin/dashboard': ['/api/admin/dashboard-overview'],
  '/admin/user-team': [USER_TEAM_OVERVIEW],
  '/admin/credit-economy': ['/api/admin/economy-overview'],
  '/admin/moderation': [
    '/api/admin/moderation-overview',
    '/api/admin/warning-defs',
  ],
  // Moderation tabs that load their own data (see TAB_DATA below for the rest).
  '/admin/analytics': ['/api/admin/analytics-overview', '/api/admin/feedbacks'],
  '/admin/ticket-management': ['/api/admin/tickets-overview', '/api/admin/ticket-articles'],
  '/admin/feedbacks': ['/api/admin/feedbacks'],
  '/admin/badges': ['/api/admin/badges', '/api/admin/badge-requirement-types', '/api/admin/badge-categories'],
  '/admin/warnings': ['/api/admin/warning-defs'],
  '/admin/system-settings': [
    '/api/admin/settings-overview',
    '/api/admin/badges',
    '/api/admin/badge-requirement-types',
    '/api/admin/badge-categories',
  ],
};

function addModeratorDesk(desk: string, extra: Record<string, DataRequest[]>, restrictionsEndpoint?: string) {
  const api = `/api/moderator/${desk}`;
  const route = `/moderator/${desk}`;
  ROUTE_DATA[route] = [`${api}/overview`];
  ROUTE_DATA[`${route}/ticket-management`] = [`${api}/tickets`];
  ROUTE_DATA[`${route}/disputes`] = [`${api}/disputes`, `${api}/overview`];
  ROUTE_DATA[`${route}/reports`] = [`${api}/reports`, `${api}/overview`];
  ROUTE_DATA[`${route}/restrictions`] = [restrictionsEndpoint || `${api}/restrictions`];
  ROUTE_DATA[`${route}/user-team`] = [USER_TEAM_OVERVIEW];
  for (const [suffix, requests] of Object.entries(extra)) ROUTE_DATA[`${route}/${suffix}`] = requests;
}

const FORUM_CONTENT_DESK: DataRequest[] = [
  ['/api/moderator/forum/groups', { search: '', status: 'all' }],
  ['/api/moderator/forum/discussions', { search: '', status: 'all' }],
];

addModeratorDesk('forum', {
  'forum-discussion': FORUM_CONTENT_DESK,
  groups: FORUM_CONTENT_DESK,
});
addModeratorDesk(
  'marketplace',
  {
    'marketplace-control': [
      '/api/moderator/marketplace/overview',
      ['/api/moderator/marketplace/listings', { status: 'pending' }],
    ],
  },
  '/api/moderator/restrictions',
);
addModeratorDesk('support', { 'ticket-management': ['/api/moderator/support/overview'] });
addModeratorDesk('jobs', { control: ['/api/moderator/jobs/overview', '/api/moderator/jobs/postings'] });

/** Tabs that load their own data instead of sharing the page overview. */
const TAB_DATA: Record<string, Record<string, DataRequest[]>> = {
  userTeam: {
    overview: [USER_TEAM_OVERVIEW],
    teams: ['/api/admin/teams-management'],
    users: ['/api/admin/users-management'],
    restrictions: ['/api/admin/restrictions'],
    'survey-responses': ['/api/admin/survey-responses'],
  },
  warnings: {
    catalog: ['/api/admin/warning-defs'],
    punishments: ['/api/admin/punishment-defs'],
    thresholds: ['/api/admin/warning-thresholds'],
  },
  moderation: {
    activity: [
      [
        '/api/admin/moderation/activity',
        {
          search: '',
          category: 'all',
          eventCode: 'all',
          role: 'all',
          state: 'all',
          sort: 'newest',
          from: '',
          to: '',
          limit: 50,
          offset: 0,
        },
      ],
    ],
    video: [['/api/admin/moderation/videos', { status: 'all', search: '' }]],
    forum: [
      ['/api/admin/moderation/forum/groups', { search: '', status: 'all' }],
      ['/api/admin/moderation/forum/discussions', { search: '', status: 'all' }],
    ],
    marketplace: [
      '/api/admin/moderation/marketplace/overview',
      ['/api/admin/moderation/marketplace/listings', { status: 'pending' }],
    ],
    jobs: [
      '/api/admin/moderation/jobs/overview',
      '/api/admin/moderation/jobs/postings',
    ],
  },
};

function prefetchAll(requests: DataRequest[] = []) {
  for (const request of requests) {
    if (typeof request === 'string') prefetchStaffGet(request);
    else prefetchStaffGet(request[0], request[1]);
  }
}

/** Starts loading a console page's data when its sidebar link is hovered or focused. */
export function prefetchStaffRoute(to: string) {
  prefetchAll(ROUTE_DATA[to.split('?')[0].replace(/\/$/, '')]);
}

/** Same as prefetchStaffRoute, for in-page tabs. */
export function prefetchStaffTab(page: keyof typeof TAB_DATA, tab: string) {
  prefetchAll(TAB_DATA[page]?.[tab]);
}
