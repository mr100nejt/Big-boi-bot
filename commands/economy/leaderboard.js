const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 10 richest users'),

  async execute(interaction) {
    await interaction.deferReply();

    const botId = interaction.client.user.id;
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
      const rank = MEDALS[i] ?? `**${i + 1}.**`;
      let name;
      try {
        const member = await interaction.guild.members.fetch(user_id);
        name = member.displayName;
      } catch {
        name = `<@${user_id}>`;
      }
      lines.push(`${rank} ${name} — **${balance.toLocaleString()} coins**`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xf5c518)
      .setTitle('💰 Leaderboard')
      .setDescription(lines.join('\n'));

    await interaction.editReply({ embeds: [embed] });
  }
};
