const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = './data';
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

async function initializeStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    try {
      await fs.access(AGENTS_FILE);
    } catch {
      const defaultAgents = {
        "agent123": {
          id: "agent123",
          name: "John Doe",
          email: "john@example.com",
          referralCode: "agent123",
          downloadCount: 0,
          createdAt: new Date().toISOString()
        },
        "agent456": {
          id: "agent456",
          name: "Jane Smith",
          email: "jane@example.com",
          referralCode: "agent456",
          downloadCount: 0,
          createdAt: new Date().toISOString()
        }
      };
      await fs.writeFile(AGENTS_FILE, JSON.stringify(defaultAgents, null, 2));
    }
    
    try {
      await fs.access(REFERRALS_FILE);
    } catch {
      await fs.writeFile(REFERRALS_FILE, JSON.stringify([], null, 2));
    }
    
    console.log('✅ Storage initialized');
  } catch (error) {
    console.error('Storage initialization error:', error);
    throw error;
  }
}

// Agent operations
async function getAllAgents() {
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading agents:', error);
    return {};
  }
}

async function saveAgents(agents) {
  try {
    await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2));
  } catch (error) {
    console.error('Error saving agents:', error);
    throw error;
  }
}

async function getAgentByCode(referralCode) {
  const agents = await getAllAgents();
  return agents[referralCode] || null;
}

async function createAgent(agentData) {
  const agents = await getAllAgents();
  agents[agentData.referralCode] = agentData;
  await saveAgents(agents);
  return agentData;
}

async function updateAgentDownloadCount(referralCode) {
  const agents = await getAllAgents();
  if (agents[referralCode]) {
    agents[referralCode].downloadCount++;
    await saveAgents(agents);
    return agents[referralCode];
  }
  return null;
}

// Referral operations
async function getAllReferrals() {
  try {
    const data = await fs.readFile(REFERRALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading referrals:', error);
    return [];
  }
}

async function saveReferrals(referrals) {
  try {
    await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
  } catch (error) {
    console.error('Error saving referrals:', error);
    throw error;
  }
}

async function addReferral(referralData) {
  const referrals = await getAllReferrals();
  referrals.push(referralData);
  await saveReferrals(referrals);
  return referralData;
}

async function findDuplicateDownload(fingerprint, hours = 24) {
  const referrals = await getAllReferrals();
  const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return referrals.find(ref => 
    ref.fingerprint === fingerprint && 
    ref.downloaded && 
    new Date(ref.timestamp) > cutoffTime
  );
}

module.exports = {
  initializeStorage,
  getAllAgents,
  getAgentByCode,
  createAgent,
  updateAgentDownloadCount,
  getAllReferrals,
  addReferral,
  findDuplicateDownload
};