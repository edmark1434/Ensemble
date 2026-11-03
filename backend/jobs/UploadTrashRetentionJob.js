const { purgeExpiredUploadsServices } = require('../services/UploadStorageServices');

async function purgeExpiredUploads() {
  return purgeExpiredUploadsServices();
}

module.exports = { purgeExpiredUploads };
