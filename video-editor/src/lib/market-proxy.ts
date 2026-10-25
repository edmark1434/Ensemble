// A legacy proxy may actually point to the original or a temporary cover image.
export function isGeneratedMarketProxy(
  type: string,
  originalFileId: string,
  proxyFileId: string | null,
  path: string | null,
  mimeType: string | null
): boolean {
  return Boolean(
    proxyFileId && proxyFileId !== originalFileId &&
    path?.startsWith("assets/proxies/") &&
    !path.includes("..") && !path.includes("\\") &&
    mimeType?.startsWith(`${type}/`)
  );
}
