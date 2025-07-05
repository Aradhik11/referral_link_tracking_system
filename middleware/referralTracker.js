const crypto = require('crypto');
const { getAgentByCode, addReferral, getAllReferrals } = require('../services/storage');

function createFingerprint(ip, userAgent, referralCode) {
  return crypto.createHash('md5').update(ip + userAgent + referralCode).digest('hex');
}

function getUserIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

async function trackReferralVisit(req, res, next) {
  const referralCode = req.query.ref;
  
  if (referralCode) {
    try {
      console.log(`Tracking visit for referral code: ${referralCode}`);
      
      // Check if agent exists
      const agent = await getAgentByCode(referralCode);
      if (agent) {
        const ip = getUserIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';
        const fingerprint = createFingerprint(ip, userAgent, referralCode);
        
        // Check if this visit was already tracked recently (within 1 hour)
        const referrals = await getAllReferrals();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentVisit = referrals.find(ref => 
          ref.fingerprint === fingerprint && 
          ref.agentCode === referralCode &&
          new Date(ref.timestamp) > oneHourAgo
        );
        
        if (!recentVisit) {
          const visitRecord = {
            agentCode: referralCode,
            ip: ip,
            userAgent: userAgent,
            fingerprint: fingerprint,
            timestamp: new Date().toISOString(),
            downloaded: false,
            visitType: 'page_visit'
          };
          
          await addReferral(visitRecord);
          console.log(`Visit tracked for agent: ${referralCode}`);
        } else {
          console.log(`Visit already tracked recently for: ${referralCode}`);
        }
        
        req.referralInfo = {
          code: referralCode,
          agentName: agent.name,
          agentEmail: agent.email
        };
      } else {
        console.log(`Invalid referral code: ${referralCode}`);
      }
    } catch (error) {
      console.error('Error tracking referral visit:', error);
    }
  }
  
  next();
}

module.exports = {
  trackReferralVisit
};