const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, getLastDaily, setLastDaily, getDailyRoles } = require('../../utils/currency');

const COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 hours
const DEFAULT_DAILY = 100;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coins')
    .setDMPermission(false),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const now = Date.now();
    const lastDaily = getLastDaily(userId, guildId);

    if (now - lastDaily < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - lastDaily);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return interaction.reply({
        content: `You already claimed your daily! Come back in **${hours}h ${minutes}m**.`,
        flags: 64
      });
    }

    // Find highest daily role the user has
    const dailyRoles = getDailyRoles(guildId);
    const member = interaction.member;
    let payout = DEFAULT_DAILY;

    if (dailyRoles.length > 0) {
      const matched = dailyRoles
        .filter(r => member.roles.cache.has(r.role_id))
        .sort((a, b) => b.amount - a.amount);
      if (matched.length > 0) payout = matched[0].amount;
    }

    addBalance(userId, guildId, payout);
    setLastDaily(userId, guildId, now);
    const newBalance = getBalance(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Daily Claimed!')
      .setDescription(`You received **${payout.toLocaleString()} coins**!\nNew balance: **${newBalance.toLocaleString()} coins**`);

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
