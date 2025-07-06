const crypto = require('crypto');
const { getAgentByCode, updateAgentDownloadCount, getAllReferrals, addReferral, findDuplicateDownload } = require('../services/storage');

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
    
    const referrals = await getAllReferrals();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let existingVisit = referrals.find(ref => 
      ref.fingerprint === fingerprint && 
      ref.agentCode === referralCode &&
      new Date(ref.timestamp) > oneHourAgo &&
      !ref.downloaded
    );
    
    if (existingVisit) {
      existingVisit.downloaded = true;
      existingVisit.downloadedAt = new Date().toISOString();
      
      const fs = require('fs').promises;
      const path = require('path');
      const REFERRALS_FILE = path.join('./data', 'referrals.json');
      await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
      
      console.log(`Updated existing visit record to download for agent: ${referralCode}`);
    } else {
      const downloadRecord = {
        agentCode: referralCode,
        ip: ip,
        userAgent: userAgent,
        fingerprint: fingerprint,
        timestamp: new Date().toISOString(),
        downloaded: true,
        downloadedAt: new Date().toISOString(),
        visitType: 'direct_download'
      };
      
      await addReferral(downloadRecord);
      console.log(`Created new download record for agent: ${referralCode}`);
    }
    const updatedAgent = await updateAgentDownloadCount(referralCode);
    
    
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