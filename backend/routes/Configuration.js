const router = require('express').Router();
const { getPublicConfigurationController } = require('../controllers/ConfigurationControllers');

router.get('/public', getPublicConfigurationController);

module.exports = router;
