// channelId -> timestamp of last non-bot message
const lastActivity = new Map();

function recordActivity(channelId) {
  lastActivity.set(channelId, Date.now());
}

function getActiveChannels(windowMs) {
  const cutoff = Date.now() - windowMs;
  return [...lastActivity.entries()]
    .filter(([, ts]) => ts >= cutoff)
    .map(([id]) => id);
}

module.exports = { recordActivity, getActiveChannels };
