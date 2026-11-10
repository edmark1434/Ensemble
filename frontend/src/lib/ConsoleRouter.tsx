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
  activeConsoleId,
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
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false;
  if (isConsolePublicPath(id, pathname)) return false;
  window.location.assign(joinUrl(mainSiteOrigin(), pathname, parsed.search || '', parsed.hash || ''));
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
    if (window.self !== window.top) return;
    const target = legacyConsoleRedirect(window.location);
    if (target) window.location.replace(target);
  });
  return null;
}

export default function ConsoleRouter({ children }: { children: ReactNode }) {
  const id = activeConsoleId();
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
