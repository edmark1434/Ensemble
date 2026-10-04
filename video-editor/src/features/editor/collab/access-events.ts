const listeners = new Set<() => void>();
export const onAccessChanged = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export const emitAccessChanged = () => listeners.forEach((fn) => fn());