import { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  BrowserRouter,
  UNSAFE_createBrowserHistory,
  createPath,
  parsePath,
  unstable_HistoryRouter as HistoryRouter,
  type History,
  type To,
} from 'react-router-dom';
import {
  consoleIdFromHostname,
  isConsolePublicPath,
  joinUrl,
  legacyConsoleRedirect,
  mainSiteOrigin,
  publicPathFromRouter,
  routerPathFromPublic,
  type ConsoleId,
} from './consoleHosts';

function toPublic(id: ConsoleId, to: To): To {
  if (typeof to === 'string') {
    const parsed = parsePath(to);
    if (!parsed.pathname) return to;
    return createPath({ ...parsed, pathname: publicPathFromRouter(parsed.pathname, id) });
  }
  if (!to.pathname) return to;
  return { ...to, pathname: publicPathFromRouter(to.pathname, id) };
}

function leaveConsole(id: ConsoleId, currentPathname: string, to: To): boolean {
  const parsed = typeof to === 'string' ? parsePath(to) : to;
  const pathname = parsed.pathname ? publicPathFromRouter(parsed.pathname, id) : currentPathname;
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    window.location.assign(typeof to === 'string' ? to : pathname);
    return true;
  }
  if (isConsolePublicPath(id, pathname)) return false;
  const search = parsed.pathname ? (parsed.search || '') : (parsed.search ?? '');
  const hash = parsed.pathname ? (parsed.hash || '') : (parsed.hash ?? '');
  const current = window.location;
  window.location.assign(joinUrl(
    mainSiteOrigin(),
    pathname,
    parsed.pathname ? search : (parsed.search ?? current.search),
    parsed.pathname ? hash : (parsed.hash ?? current.hash),
  ));
  return true;
}

function createConsoleHistory(id: ConsoleId): History {
  const history = UNSAFE_createBrowserHistory({ v5Compat: true });
  const mapLocation = <T extends { pathname: string }>(location: T): T => {
    const pathname = routerPathFromPublic(location.pathname, id);
    return pathname === location.pathname ? location : { ...location, pathname };
  };

  return {
    get action() {
      return history.action;
    },
    get location() {
      return mapLocation(history.location);
    },
    createHref(to) {
      return history.createHref(toPublic(id, to));
    },
    createURL(to) {
      return history.createURL(toPublic(id, to));
    },
    encodeLocation(to) {
      return history.encodeLocation(to);
    },
    push(to, state) {
      if (leaveConsole(id, history.location.pathname, to)) return;
      history.push(toPublic(id, to), state);
    },
    replace(to, state) {
      if (leaveConsole(id, history.location.pathname, to)) return;
      history.replace(toPublic(id, to), state);
    },
    go(delta) {
      history.go(delta);
    },
    listen(listener) {
      return history.listen((update) => {
        listener({ ...update, location: mapLocation(update.location) });
      });
    },
  };
}

function LegacyConsoleRedirect() {
  useLayoutEffect(() => {
    const target = legacyConsoleRedirect(window.location);
    if (target) window.location.replace(target);
  });
  return null;
}

export default function ConsoleRouter({ children }: { children: ReactNode }) {
  const id = typeof window === 'undefined' ? null : consoleIdFromHostname(window.location.hostname);
  const historyRef = useRef<History | null>(null);
  if (id && historyRef.current == null) {
    historyRef.current = createConsoleHistory(id);
  }

  if (!id || !historyRef.current) {
    return (
      <BrowserRouter>
        <LegacyConsoleRedirect />
        {children}
      </BrowserRouter>
    );
  }

  return <HistoryRouter history={historyRef.current}>{children}</HistoryRouter>;
}
