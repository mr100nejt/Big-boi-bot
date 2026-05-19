const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance } = require('../../utils/currency');

// Win chance scales down as multiplier goes up (house always has edge)
function winChance(multiplier) {
  return Math.max(0.10, 0.90 / multiplier);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bet')
    .setDescription('Place a bet with a custom multiplier — higher reward = lower odds')
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount to bet').setRequired(true).setMinValue(1)
    )
    .addIntegerOption(opt =>
      opt.setName('multiplier').setDescription('Payout multiplier (2-20x) — higher = riskier').setRequired(true).setMinValue(2).setMaxValue(20)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('What are you betting on? (flavor only)').setRequired(false)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const multiplier = interaction.options.getInteger('multiplier');
    const description = interaction.options.getString('description');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    await interaction.deferReply();

    const balance = getBalance(userId, guildId);
    if (amount > balance) {
      return interaction.editReply({ content: `You only have **${balance.toLocaleString()} coins**. Can't bet ${amount.toLocaleString()}.` });
    }

    const chance = winChance(multiplier);
    const won = Math.random() < chance;
    const winnings = amount * multiplier - amount;

    if (won) {
      addBalance(userId, guildId, winnings);
    } else {
      removeBalance(userId, guildId, amount);
      addBalance(interaction.client.user.id, guildId, amount);
    }

    const newBalance = getBalance(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(won ? '🎉 You Won!' : '💸 You Lost!')
      .addFields(
        { name: 'Bet', value: `${amount.toLocaleString()} coins`, inline: true },
        { name: 'Multiplier', value: `${multiplier}x`, inline: true },
        { name: won ? 'Winnings' : 'Lost', value: `${(won ? winnings : amount).toLocaleString()} coins`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: false }
      )
      .setFooter({ text: `Win chance: ${Math.round(chance * 100)}%${description ? ` | "${description}"` : ''}` });

    await interaction.editReply({ embeds: [embed] });
  }
};
