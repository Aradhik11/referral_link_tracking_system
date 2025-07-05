const crypto = require('crypto');
const { getAllAgents, getAgentByCode, createAgent } = require('../services/storage');

// Generate unique referral code
function generateReferralCode() {
  return 'agent' + crypto.randomBytes(4).toString('hex');
}

async function getAgents(req, res) {
  try {
    const agents = await getAllAgents();
    const agentList = Object.values(agents).map(agent => ({
      ...agent,
      referralLink: `${req.protocol}://${req.get('host')}/download?ref=${agent.referralCode}`
    }));
    
    res.json(agentList);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createNewAgent(req, res) {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingAgents = await getAllAgents();
    const emailExists = Object.values(existingAgents).some(
      agent => agent.email.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Generate unique referral code
    let referralCode = generateReferralCode();
    while (existingAgents[referralCode]) {
      referralCode = generateReferralCode();
    }
    
    const newAgent = {
      id: referralCode,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      referralCode,
      downloadCount: 0,
      createdAt: new Date().toISOString()
    };
    
    await createAgent(newAgent);
    
    res.status(201).json({
      agent: newAgent,
      referralLink: `${req.protocol}://${req.get('host')}/download?ref=${referralCode}`
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get referral link for specific agent
async function getAgentLink(req, res) {
  try {
    const agent = await getAgentByCode(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      referralLink: `${req.protocol}://${req.get('host')}/download?ref=${agent.referralCode}`,
      referralCode: agent.referralCode
    });
  } catch (error) {
    console.error('Error fetching agent link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  getAgents,
  createNewAgent,
  getAgentLink
};