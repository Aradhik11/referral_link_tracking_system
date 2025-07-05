const crypto = require('crypto');
const { getAgentByCode, updateAgentDownloadCount, addReferral, findDuplicateDownload } = require('../services/storage');

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

async function trackDownload(req, res) {
  try {
    const { referralCode } = req.body;
    
    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code is required' });
    }
    
    const agent = await getAgentByCode(referralCode);
    if (!agent) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    const ip = getUserIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const fingerprint = createFingerprint(ip, userAgent, referralCode);
    
    const existingDownload = await findDuplicateDownload(fingerprint, 24);
    if (existingDownload) {
      return res.status(409).json({ 
        error: 'Download already counted for this device',
        message: 'Each device can only count one download per 24 hours'
      });
    }
    
    // Create referral record
    const referralRecord = {
      agentCode: referralCode,
      ip: ip,
      userAgent: userAgent,
      fingerprint: fingerprint,
      timestamp: new Date().toISOString(),
      downloaded: true,
      downloadedAt: new Date().toISOString()
    };
    
    // Save referral and update agent count
    await addReferral(referralRecord);
    const updatedAgent = await updateAgentDownloadCount(referralCode);
    
    console.log(`Download tracked for agent: ${referralCode}`);
    
    res.json({
      success: true,
      message: 'Download tracked successfully',
      agent: updatedAgent.name,
      totalDownloads: updatedAgent.downloadCount
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  trackDownload
};