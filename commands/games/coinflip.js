const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance, feedJackpot, claimJackpot, getJackpot } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak, getStreak, streakBonus } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');
const { consumeActiveItem } = require('../../utils/shop');

const COOLDOWN = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin — double your bet or lose it')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('side').setDescription('Heads or tails').setRequired(true)
        .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })
    )
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setMinValue(1)
    )
    .addBooleanOption(opt =>
      opt.setName('all-in').setDescription('Bet your entire balance')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    await safeDefer(interaction);

    const wait = checkCooldown(userId, 'coinflip');
    if (wait > 0) {
      return interaction.editReply(`Coinflip is on cooldown. Try again in **${wait}s**.`);
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

    const choice = interaction.options.getString('side');
    setCooldown(userId, 'coinflip', COOLDOWN);

    let result = Math.random() < 0.5 ? 'heads' : 'tails';
    let won = result === choice;
    let charmUsed = false;

    if (!won) {
      const charmVal = consumeActiveItem(userId, guildId, 'lucky_charm');
      if (charmVal !== null) {
        charmUsed = true;
        result = Math.random() < 0.5 ? 'heads' : 'tails';
        won = result === choice;
      }
    }

    const streak = won ? recordWin(userId, guildId) : resetStreak(userId, guildId);
    const bonus = streakBonus(streak);

    let jackpotWon = 0;
    let payout = 0;
    let paydayBonus = 0;
    let insuranceRefund = 0;

    if (won) {
      const bonusCoins = Math.floor(bet * bonus);
      payout = bet + bonusCoins;
      removeBalance(interaction.client.user.id, guildId, payout);
      addBalance(userId, guildId, payout);

      const paydayMult = consumeActiveItem(userId, guildId, 'payday') ?? 1;
      paydayBonus = Math.floor(payout * (paydayMult - 1));
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
    const emoji = result === 'heads' ? '🪙 Heads' : '🪙 Tails';

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(won ? '🎉 You Won!' : '💸 You Lost!')
      .addFields(
        { name: 'Result', value: emoji, inline: true },
        { name: 'Your Pick', value: choice.charAt(0).toUpperCase() + choice.slice(1), inline: true },
        { name: won ? 'Won' : 'Lost', value: `${(won ? payout : bet).toLocaleString()} coins`, inline: true },
        { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: false }
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
