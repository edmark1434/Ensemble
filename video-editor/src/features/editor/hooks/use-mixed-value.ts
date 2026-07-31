import useStore from "../store/use-store";

function computeMixed<T>(values: T[]): { value: T | undefined; isMixed: boolean } {
  if (values.length === 0) return { value: undefined, isMixed: false };
  const firstKey = JSON.stringify(values[0]);
  const isMixed = values.some((v) => JSON.stringify(v) !== firstKey);
  return { value: values[0], isMixed };
}

/**
 * Reads a value across a set of track items and reports whether the
 * selected items agree on it. Group control panels use this to render
 * "Mixed" / "-" instead of silently displaying one item's value.
 */
export function useMixedValue<T>(
  ids: string[],
  getValue: (item: any) => T
): { value: T | undefined; isMixed: boolean } {
  const { trackItemsMap } = useStore();
  const items = ids.map((id) => trackItemsMap[id]).filter(Boolean);
  return computeMixed(items.map(getValue));
}

/**
 * Same as useMixedValue, but reads from transitionsMap instead of
 * trackItemsMap — transitions are stored separately from track items.
 */
export function useMixedTransitionValue<T>(
  ids: string[],
  getValue: (item: any) => T
): { value: T | undefined; isMixed: boolean } {
  const { transitionsMap } = useStore();
  const items = ids.map((id) => transitionsMap[id]).filter(Boolean);
  return computeMixed(items.map(getValue));
}