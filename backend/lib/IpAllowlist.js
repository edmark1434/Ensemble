const net = require('net');

/** Strip IPv4-mapped IPv6 and map loopback so `::1` and `127.0.0.1` match. */
function normalizeIp(ip) {
  if (!ip) return '';
  const trimmed = String(ip).trim();
  if (trimmed === '::1') return '127.0.0.1';
  if (trimmed.toLowerCase().startsWith('::ffff:')) {
    const mapped = trimmed.slice(7);
    if (net.isIPv4(mapped)) return mapped;
  }
  return trimmed;
}

/**
 * Parse one allowlist entry: a single IPv4/IPv6 address or a CIDR range.
 * Returns null when the entry is not valid.
 */
function parseAllowlistEntry(entry) {
  const raw = String(entry || '').trim();
  if (!raw) return null;
  const [addressPart, prefixPart, extra] = raw.split('/');
  if (extra !== undefined) return null;
  const address = normalizeIp(addressPart);
  const family = net.isIP(address);
  if (!family) return null;
  if (prefixPart === undefined) {
    return { raw, address, prefix: null, family: family === 6 ? 'ipv6' : 'ipv4' };
  }
  if (!/^\d{1,3}$/.test(prefixPart)) return null;
  const prefix = Number(prefixPart);
  const max = family === 6 ? 128 : 32;
  if (prefix < 0 || prefix > max) return null;
  return { raw, address, prefix, family: family === 6 ? 'ipv6' : 'ipv4' };
}

/** Canonical form used for storage and duplicate checks. */
function canonicalAllowlistEntry(entry) {
  const parsed = parseAllowlistEntry(entry);
  if (!parsed) return null;
  return parsed.prefix === null ? parsed.address : `${parsed.address}/${parsed.prefix}`;
}

function buildBlockList(entries) {
  const list = new net.BlockList();
  let count = 0;
  for (const entry of entries || []) {
    const parsed = parseAllowlistEntry(entry);
    if (!parsed) continue;
    try {
      if (parsed.prefix === null) list.addAddress(parsed.address, parsed.family);
      else list.addSubnet(parsed.address, parsed.prefix, parsed.family);
      count += 1;
    } catch {
      /* skip entries BlockList rejects */
    }
  }
  return { list, count };
}

/** True when `ip` matches at least one valid allowlist entry. */
function ipMatchesAllowlist(ip, entries) {
  const address = normalizeIp(ip);
  const family = net.isIP(address);
  if (!family) return false;
  const { list, count } = buildBlockList(entries);
  if (!count) return false;
  return list.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/** Accepts the stored array or a legacy comma-separated string. */
function allowlistEntries(raw) {
  if (Array.isArray(raw)) return raw.map((ip) => String(ip || '').trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

module.exports = {
  normalizeIp,
  parseAllowlistEntry,
  canonicalAllowlistEntry,
  ipMatchesAllowlist,
  allowlistEntries,
};
