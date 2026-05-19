const { getActiveChannels } = require('../utils/activityTracker');

const WATER_MESSAGES = [
  '💧 Hydration check! Go drink some water — no excuses, not even a ranked game.',
  '💧 Water break. Your brain is 75% water and right now it\'s running on fumes.',
  '💧 Hey. Drink water. The colony can wait. You cannot.',
  '💧 Hydration check! Even Randy Random gives you time to drink water. Go.',
  '💧 Your Ironclad is built different. Your body needs water though. Drink up.',
  '💧 Water check — stand up, stretch, drink something. This is a direct order.',
  '💧 You\'ve been in chat. That means you\'re alive. Stay that way — drink water.',
  '💧 Skill issue not drinking water. Cope and hydrate.',
];

const INTERVAL_MS = 90 * 60 * 1000;

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    setInterval(async () => {
      const activeChannelIds = getActiveChannels(INTERVAL_MS);
      if (activeChannelIds.length === 0) return;

      const msg = WATER_MESSAGES[Math.floor(Math.random() * WATER_MESSAGES.length)];

      for (const channelId of activeChannelIds) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel?.isTextBased()) await channel.send(msg);
        } catch {
          // Channel deleted or bot lost access — skip silently
        }
      }
    }, INTERVAL_MS);
  }
};
