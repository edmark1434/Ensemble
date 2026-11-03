import { createElement, lazy, useState, type ComponentType } from 'react';

export type Preloadable = { preload: () => Promise<unknown> };

/**
 * React.lazy with a `preload()` hook. Mounts that happen after the chunk has loaded
 * render the page directly, so they never fall back to the Suspense loader.
 */
export function lazyWithPreload<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> & Preloadable {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<{ default: ComponentType<P> }> | null = null;

  const load = () => {
    if (!pending) {
      pending = loader().then(
        (mod) => {
          loaded = mod.default;
          return mod;
        },
        (err) => {
          pending = null;
          throw err;
        },
      );
    }
    return pending;
  };

  const LazyPage = lazy(load);

  function PreloadablePage(props: P) {
    const [Page] = useState<ComponentType<P>>(() => loaded ?? (LazyPage as unknown as ComponentType<P>));
    return createElement(Page, props);
  }

  return Object.assign(PreloadablePage, { preload: load });
}
