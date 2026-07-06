const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance, feedJackpot, claimJackpot, getJackpot } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak, streakBonus } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');
const { consumeActiveItem } = require('../../utils/shop');

const NUMBERS = Array.from({ length: 37 }, (_, i) => i);
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

const COOLDOWN = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Spin the roulette wheel')
    .setDMPermission(false)
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
    )
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setMinValue(1)
    )
    .addBooleanOption(opt =>
      opt.setName('all-in').setDescription('Bet your entire balance')
    ),

  async execute(interaction) {
    const betType = interaction.options.getString('type');
    const betNumber = interaction.options.getInteger('number');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (betType === 'number' && betNumber === null) {
      return interaction.reply({ content: 'You must provide a number for a Single Number bet.', flags: 64 });
    }

    await safeDefer(interaction);

    const wait = checkCooldown(userId, 'roulette');
    if (wait > 0) {
      return interaction.editReply(`Roulette is on cooldown. Try again in **${wait}s**.`);
    }

    const balance = getBalance(userId, guildId);
    const allin = interaction.options.getBoolean('all-in') ?? false;
    const rawBet = interaction.options.getInteger('bet');

    if (allin && rawBet !== null) {
      return interaction.editReply('Use either `all-in` or a `bet` amount — not both.');
    }
    if (!allin && rawBet === null) {
      return interaction.editReply('Provide a `bet` amount or use `all-in: True`.');
    }

    const bet = allin ? balance : rawBet;
    if (bet <= 0) return interaction.editReply("You don't have any coins to bet!");
    if (bet > balance) {
      return interaction.editReply(`You only have **${balance.toLocaleString()} coins**. Can't bet ${bet.toLocaleString()}.`);
    }

    setCooldown(userId, 'roulette', COOLDOWN);

    let result = spin();
    let multiplier = resolveBet(betType, betNumber, result);
    let won = multiplier > 0;
    let charmUsed = false;

    if (!won) {
      const charmVal = consumeActiveItem(userId, guildId, 'lucky_charm');
      if (charmVal !== null) {
        charmUsed = true;
        result = spin();
        multiplier = resolveBet(betType, betNumber, result);
        won = multiplier > 0;
      }
    }

    const isRed = RED.includes(result);
    const colorEmoji = result === 0 ? '🟢' : isRed ? '🔴' : '⚫';

    const streak = won ? recordWin(userId, guildId) : resetStreak(userId, guildId);
    const bonus = streakBonus(streak);

    let jackpotWon = 0;
    let winnings = 0;
    let paydayBonus = 0;
    let insuranceRefund = 0;

    if (won) {
      const base = bet * multiplier - bet;
      const bonusCoins = Math.floor(base * bonus);
      winnings = base + bonusCoins;
      removeBalance(interaction.client.user.id, guildId, winnings);
      addBalance(userId, guildId, winnings);

      const paydayMult = consumeActiveItem(userId, guildId, 'payday') ?? 1;
      paydayBonus = Math.floor(winnings * (paydayMult - 1));
      if (paydayBonus > 0) {
        removeBalance(interaction.client.user.id, guildId, paydayBonus);
        addBalance(userId, guildId, paydayBonus);
      }

      if (Math.random() < 0.005) {
        jackpotWon = claimJackpot(guildId);
        if (jackpotWon > 0) addBalance(userId, guildId, jackpotWon);
      }
    } else {
      removeBalance(userId, guildId, bet);
      addBalance(interaction.client.user.id, guildId, bet);
      feedJackpot(guildId, Math.floor(bet * 0.10));

      const insuranceMult = consumeActiveItem(userId, guildId, 'insurance_policy') ?? 0;
      insuranceRefund = Math.floor(bet * insuranceMult);
      if (insuranceRefund > 0) {
        removeBalance(interaction.client.user.id, guildId, insuranceRefund);
        addBalance(userId, guildId, insuranceRefund);
      }
    }

    const newBalance = getBalance(userId, guildId);
    const jackpotNow = getJackpot(guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(`${colorEmoji} Roulette — ${result}`)
      .addFields(
        { name: 'Your Bet', value: `${betType}${betType === 'number' ? ` (${betNumber})` : ''}`, inline: true },
        { name: won ? 'Won' : 'Lost', value: `${(won ? winnings : bet).toLocaleString()} coins`, inline: true },
        { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
      );

    if (won && bonus > 0) embed.addFields({ name: `🔥 ${streak}-Win Streak`, value: `+${Math.round(bonus * 100)}% bonus`, inline: true });
    if (!won && streak > 0) embed.addFields({ name: '🛡️ Streak Shield!', value: `Your ${streak}-win streak was protected!`, inline: true });
    if (charmUsed) embed.addFields({ name: '🍀 Lucky Charm!', value: won ? 'Re-spin saved you!' : 'Re-spin activated — still lost.', inline: true });
    if (paydayBonus > 0) embed.addFields({ name: '💰 Payday!', value: `+${paydayBonus.toLocaleString()} bonus coins!`, inline: true });
    if (insuranceRefund > 0) embed.addFields({ name: '🏦 Insurance!', value: `+${insuranceRefund.toLocaleString()} refunded`, inline: true });
    if (jackpotWon > 0) embed.addFields({ name: '🏆 JACKPOT!', value: `+${jackpotWon.toLocaleString()} bonus coins!`, inline: false });
    embed.setFooter({ text: `Jackpot pot: ${jackpotNow.toLocaleString()} coins` });

    await interaction.editReply({ embeds: [embed] });
  }
};
