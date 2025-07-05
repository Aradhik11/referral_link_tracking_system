const express = require('express');
const { getAgents, createNewAgent, getAgentLink } = require('../controllers/agentController');

const router = express.Router();

router.get('/', getAgents);
router.post('/', createNewAgent);
router.get('/:id/link', getAgentLink);

module.exports = router;