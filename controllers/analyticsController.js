const { getAllAgents, getAllReferrals } = require('../services/storage');

async function getBasicAnalytics(req, res) {
  try {
    const agents = await getAllAgents();
    const analytics = {};
    
    for (const [code, agent] of Object.entries(agents)) {
      analytics[code] = agent.downloadCount;
    }
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getDetailedAnalytics(req, res) {
  try {
    const agents = await getAllAgents();
    const referrals = await getAllReferrals();
    
    const detailedAnalytics = Object.values(agents).map(agent => {
      const agentReferrals = referrals.filter(ref => ref.agentCode === agent.referralCode);
      const downloads = agentReferrals.filter(ref => ref.downloaded);
      const visits = agentReferrals.length;
      console.log(`This is the number visits ${visits}`)
      
      return {
        agentCode: agent.referralCode,
        agentName: agent.name,
        email: agent.email,
        totalVisits: visits,
        totalDownloads: downloads.length,
        conversionRate: visits > 0 ? ((downloads.length / visits) * 100).toFixed(2) : 0,
        referralLink: `${req.protocol}://${req.get('host')}/download?ref=${agent.referralCode}`,
        createdAt: agent.createdAt
      };
    });
    
    res.json(detailedAnalytics);
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getBasicAnalytics,
  getDetailedAnalytics
};