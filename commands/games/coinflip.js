const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin — double your bet or lose it')
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('side').setDescription('Heads or tails').setRequired(true)
        .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('side');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    await interaction.deferReply();

    const balance = getBalance(userId, guildId);
    if (bet > balance) {
      return interaction.editReply({ content: `You only have **${balance.toLocaleString()} coins**. Can't bet ${bet.toLocaleString()}.` });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const emoji = result === 'heads' ? '🪙 Heads' : '🪙 Tails';

    if (won) {
      addBalance(userId, guildId, bet);
    } else {
      removeBalance(userId, guildId, bet);
      addBalance(interaction.client.user.id, guildId, bet);
    }

    const newBalance = getBalance(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(won ? '🎉 You Won!' : '💸 You Lost!')
      .addFields(
        { name: 'Result', value: emoji, inline: true },
        { name: 'Your Pick', value: choice.charAt(0).toUpperCase() + choice.slice(1), inline: true },
        { name: won ? 'Winnings' : 'Lost', value: `${bet.toLocaleString()} coins`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};
