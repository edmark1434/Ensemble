import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import api from './axios';
import useGlobalState from './global_state';

/**
 * In-memory stale-while-revalidate cache for staff console GETs.
 * Pages render the last response at once and still refetch on mount.
 * Any non-GET request through `api` (including logout) and any change of signed-in
 * user clears it, so it never outlives a staff action or a session.
 */

type Params = AxiosRequestConfig['params'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;

const PREFETCH_FRESH_MS = 15_000;

const responses = new Map<string, { response: AxiosResponse<Body>; at: number }>();
const inflight = new Map<string, Promise<AxiosResponse<Body>>>();
let generation = 0;

function cacheKey(url: string, params?: Params) {
  if (!params || typeof params !== 'object') return url;
  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, String(value)]);
  return entries.length ? `${url}?${new URLSearchParams(entries).toString()}` : url;
}

export function clearStaffCache() {
  generation += 1;
  responses.clear();
  inflight.clear();
}

/** Last successful response for this GET, if one is cached. */
export function peekStaffGet<T = Body>(url: string, params?: Params): AxiosResponse<T> | undefined {
  return responses.get(cacheKey(url, params))?.response as AxiosResponse<T> | undefined;
}

/** `api.get` that shares an identical in-flight request and caches the response. */
export function staffGet<T = Body>(url: string, params?: Params): Promise<AxiosResponse<T>> {
  const key = cacheKey(url, params);
  const running = inflight.get(key);
  if (running) return running as Promise<AxiosResponse<T>>;

  const startedIn = generation;
  const request = api
    .get<T>(url, params ? { params } : undefined)
    .then((response) => {
      const body = response.data as Body;
      if (startedIn === generation && body?.success !== false) {
        responses.set(key, { response, at: Date.now() });
      }
      return response;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });
  inflight.set(key, request as Promise<AxiosResponse<Body>>);
  return request;
}

/** Warms the cache unless a fresh response or the same request already exists. */
export function prefetchStaffGet(url: string, params?: Params) {
  const key = cacheKey(url, params);
  const entry = responses.get(key);
  if (inflight.has(key) || (entry && Date.now() - entry.at < PREFETCH_FRESH_MS)) return;
  void staffGet(url, params).catch(() => {
    // The page reports its own load errors.
  });
}

const READ_METHODS = new Set(['get', 'head', 'options']);

function clearAfterWrite(config?: AxiosRequestConfig) {
  if (!READ_METHODS.has(String(config?.method || 'get').toLowerCase())) clearStaffCache();
}

api.interceptors.response.use(
  (response) => {
    clearAfterWrite(response.config);
    return response;
  },
  (error) => {
    clearAfterWrite(error?.config);
    return Promise.reject(error);
  },
);

function sessionIdentity(user: Body) {
  if (!user) return null;
  return [user.type, user.role, user.account_id ?? user.accountId ?? user.id ?? user.staff_id].join(':');
}

useGlobalState.subscribe((state, previous) => {
  if (sessionIdentity(state.user) !== sessionIdentity(previous.user)) clearStaffCache();
});
