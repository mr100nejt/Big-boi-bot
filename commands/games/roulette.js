const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance } = require('../../utils/currency');

// Payouts: red/black = 2x, dozens = 3x, single number = 36x
const NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0-36
const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

function spin() {
  return NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
}

function resolveBet(betType, betValue, spinResult) {
  const isRed = RED.includes(spinResult);
  switch (betType) {
    case 'red':    return isRed && spinResult !== 0 ? 2 : 0;
    case 'black':  return !isRed && spinResult !== 0 ? 2 : 0;
    case 'odd':    return spinResult !== 0 && spinResult % 2 !== 0 ? 2 : 0;
    case 'even':   return spinResult !== 0 && spinResult % 2 === 0 ? 2 : 0;
    case 'low':    return spinResult >= 1 && spinResult <= 18 ? 2 : 0;
    case 'high':   return spinResult >= 19 && spinResult <= 36 ? 2 : 0;
    case 'number': return parseInt(betValue) === spinResult ? 36 : 0;
    default:       return 0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Spin the roulette wheel')
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('type').setDescription('Bet type').setRequired(true)
        .addChoices(
          { name: 'Red (2x)', value: 'red' },
          { name: 'Black (2x)', value: 'black' },
          { name: 'Odd (2x)', value: 'odd' },
          { name: 'Even (2x)', value: 'even' },
          { name: 'Low 1-18 (2x)', value: 'low' },
          { name: 'High 19-36 (2x)', value: 'high' },
          { name: 'Single Number (36x)', value: 'number' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('number').setDescription('Number to bet on (0-36, only for Single Number bet)').setMinValue(0).setMaxValue(36)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const betType = interaction.options.getString('type');
    const betNumber = interaction.options.getInteger('number');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (betType === 'number' && betNumber === null) {
      return interaction.reply({ content: 'You must provide a number for a Single Number bet.', flags: 64 });
    }

    await interaction.deferReply();

    const balance = getBalance(userId, guildId);
    if (bet > balance) {
      return interaction.editReply({ content: `You only have **${balance.toLocaleString()} coins**. Can't bet ${bet.toLocaleString()}.` });
    }

    const result = spin();
    const isRed = RED.includes(result);
    const colorEmoji = result === 0 ? '🟢' : isRed ? '🔴' : '⚫';
    const multiplier = resolveBet(betType, betNumber, result);
    const won = multiplier > 0;
    const winnings = won ? bet * multiplier - bet : 0;

    if (won) {
      addBalance(userId, guildId, winnings);
    } else {
      removeBalance(userId, guildId, bet);
      addBalance(interaction.client.user.id, guildId, bet);
    }

    const newBalance = getBalance(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(`${colorEmoji} Roulette — ${result}`)
      .addFields(
        { name: 'Your Bet', value: `${betType}${betType === 'number' ? ` (${betNumber})` : ''}`, inline: true },
        { name: won ? 'Won' : 'Lost', value: `${(won ? winnings : bet).toLocaleString()} coins`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};
