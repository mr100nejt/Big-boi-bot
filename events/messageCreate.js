const { recordActivity } = require('../utils/activityTracker');

const COWBOY = '🤠';

function weirdnessScore(content) {
  let score = 0;
  const clean = content.trim();
  if (!clean || clean.startsWith('/')) return 0;

  // Mixed caps like ThIs Or tHiS
  const mixedCaps = clean.match(/[a-z][A-Z]|[A-Z][a-z][A-Z]/g);
  if (mixedCaps) score += mixedCaps.length * 3;

  // Excessive punctuation !!!??? or ....
  const excessPunct = clean.match(/[!?]{3,}|\.{4,}/g);
  if (excessPunct) score += excessPunct.length * 4;

  // Random keyboard mashing (long runs of consonants)
  const consonantRuns = clean.match(/[bcdfghjklmnpqrstvwxyz]{5,}/gi);
  if (consonantRuns) score += consonantRuns.length * 5;

  // All caps shouting (3+ words all caps)
  const allCapsWords = clean.match(/\b[A-Z]{3,}\b/g);
  if (allCapsWords && allCapsWords.length >= 3) score += allCapsWords.length * 2;

  // Lots of emojis (4+)
  const emojiCount = (clean.match(/\p{Emoji}/gu) ?? []).length;
  if (emojiCount >= 4) score += emojiCount * 2;

  // Numbers and letters randomly mixed (l33tspeak / nonsense)
  const leetish = clean.match(/[a-z]+\d+[a-z]+|\d+[a-z]+\d+/gi);
  if (leetish) score += leetish.length * 3;

  // Repeating characters aaaaaaa
  const repeats = clean.match(/(.)\1{4,}/g);
  if (repeats) score += repeats.length * 4;

  // Very short all-nonsense message (no real words, just symbols/gibberish)
  const hasRealWords = clean.match(/\b[a-zA-Z]{3,}\b/g);
  if (!hasRealWords && clean.length > 3) score += 8;

  // Random symbol clusters
  const symbolClusters = clean.match(/[^a-zA-Z0-9\s.,!?'"]{3,}/g);
  if (symbolClusters) score += symbolClusters.length * 3;

  return score;
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;

    recordActivity(message.channelId);

    const score = weirdnessScore(message.content);
    if (score >= 10) {
      try {
        await message.react(COWBOY);
      } catch (err) {
        // Message was deleted or bot lacks permission — silently ignore
      }
    }
  }
};
