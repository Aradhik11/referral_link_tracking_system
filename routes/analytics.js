const express = require('express');
const { getBasicAnalytics, getDetailedAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/', getBasicAnalytics);
router.get('/detailed', getDetailedAnalytics);

module.exports = router;