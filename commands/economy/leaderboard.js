const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { safeDefer } = require('../../utils/interact');

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_EMOJIS  = ['👑', '💎', '🪙', '💸', '🃏'];
const RANK_TITLES  = ['High Roller', 'Winner Winner', 'Gambler', 'Degenerate', 'Grinder'];
const NICK_EMOJIS  = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

function stripRank(name) {
  for (const emoji of [...RANK_EMOJIS, ...NICK_EMOJIS]) {
    if (name.startsWith(`${emoji} `)) return name.slice(emoji.length + 1);
  }
  return name;
}

async function applyNickname(member, emoji) {
  const current = member.nickname ?? member.user.username;
  const base    = stripRank(current);
  const target  = emoji ? `${emoji} ${base}` : base;
  if ((member.nickname ?? '') === target) return;
  // null resets to username — use it when the clean name matches the username
  await member.setNickname(target === member.user.username ? null : target);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 10 richest users')
    .setDMPermission(false),

  async execute(interaction) {
    await safeDefer(interaction);

    const botId  = interaction.client.user.id;
    const guildId = interaction.guildId;

    const rows = db.prepare(`
      SELECT user_id, balance
      FROM users
      WHERE guild_id = ? AND user_id != ?
      ORDER BY balance DESC
      LIMIT 10
    `).all(guildId, botId);

    if (rows.length === 0) {
      await interaction.editReply({ content: 'No one has any coins yet.' });
      return;
    }

    const lines = [];

    for (let i = 0; i < rows.length; i++) {
      const { user_id, balance } = rows[i];
      const medal      = MEDALS[i] ?? `**${i + 1}.**`;
      const rankEmoji  = RANK_EMOJIS[i] ?? null;
      const nickEmoji  = NICK_EMOJIS[i] ?? null;
      const rankTitle  = RANK_TITLES[i] ?? null;

      let baseName;
      try {
        const member = await interaction.guild.members.fetch(user_id);
        baseName = stripRank(member.nickname ?? member.user.username);

        try {
          await applyNickname(member, rankEmoji);
        } catch {
          // Can't edit nickname (server owner or higher role) — skip silently
        }
      } catch {
        baseName = `<@${user_id}>`;
      }

      const titleSuffix = rankTitle ? `  ·  ${rankEmoji} ${rankTitle}` : '';
      lines.push(`${medal} ${baseName} — **${balance.toLocaleString()} coins**${titleSuffix}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xf5c518)
      .setTitle('💰 Leaderboard')
      .setDescription(lines.join('\n'));

    await interaction.editReply({ embeds: [embed] });
  }
};
