const {
  getListingMediaOriginal,
  hasRecentListingFileView,
} = require('../repositories/MarketplaceModeratorRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const {
  generateProtectedAssetInspectionUrl,
  STAFF_INSPECTION_URL_EXPIRY,
} = require('./FileServices');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ListingFileError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sessionStaffId(staffSession) {
  const raw = staffSession?.staff_id || staffSession?.staffId || null;
  return raw && UUID_PATTERN.test(String(raw)) ? String(raw) : null;
}

/**
 * Short-lived signed link to the seller's original upload, for staff reviewing a listing.
 *
 * Originals are private (`asset-originals/`) and pending video/audio has no watermarked
 * proxy until processing finishes, so this is the only way to inspect what was submitted.
 * Every download, and the first view per staff member per hour, is written to the seller's
 * account activity so access to unpurchased files stays auditable.
 */
async function getListingOriginalAccess(listingId, mediaAssetId, { download = false } = {}, staffSession) {
  if (!UUID_PATTERN.test(String(listingId || '')) || !UUID_PATTERN.test(String(mediaAssetId || ''))) {
    throw new ListingFileError('Invalid listing or file id', 400);
  }

  const file = await getListingMediaOriginal(listingId, mediaAssetId);
  if (!file) throw new ListingFileError('File not found on this listing', 404);

  const fileName = file.original_name || file.media_name || 'listing-file';
  const url = await generateProtectedAssetInspectionUrl(file.path, fileName, file.mime_type, download);

  const staffId = sessionStaffId(staffSession);
  const skipLog = !download && (await hasRecentListingFileView(listingId, mediaAssetId, staffId));
  if (!skipLog) {
    await recordAccountActivity({
      accountId: file.submitted_by_account_id,
      action: `Staff ${download ? 'downloaded' : 'opened'} original "${fileName}" on listing ${
        file.listing_number || file.title || listingId
      }`,
      eventCode: download ? 'LISTING_FILE_DOWNLOADED' : 'LISTING_FILE_VIEWED',
      referenceTable: 'marketplace_listings',
      referencePrefix: 'LST',
      referenceId: listingId,
      actorStaffId: staffId,
      metadata: {
        mediaAssetId: String(mediaAssetId),
        fileName,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes === null ? null : Number(file.size_bytes),
        mode: download ? 'download' : 'view',
      },
    });
  }

  return {
    url,
    fileName,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes === null ? null : Number(file.size_bytes),
    expiresIn: STAFF_INSPECTION_URL_EXPIRY,
  };
}

module.exports = { getListingOriginalAccess, ListingFileError };
