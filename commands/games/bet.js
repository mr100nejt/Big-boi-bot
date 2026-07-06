const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance, feedJackpot, claimJackpot, getJackpot } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak, getStreak, streakBonus } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');
const { consumeActiveItem } = require('../../utils/shop');

function winChance(multiplier) {
  return Math.max(0.10, 0.90 / multiplier);
}

const COOLDOWN = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bet')
    .setDescription('Place a bet with a custom multiplier — higher reward = lower odds')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('multiplier').setDescription('Payout multiplier (2-20x) — higher = riskier').setRequired(true).setMinValue(2).setMaxValue(20)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount to bet').setMinValue(1)
    )
    .addBooleanOption(opt =>
      opt.setName('all-in').setDescription('Bet your entire balance')
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('What are you betting on? (flavor only)').setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    await safeDefer(interaction);

    const wait = checkCooldown(userId, 'bet');
    if (wait > 0) {
      return interaction.editReply(`Bet is on cooldown. Try again in **${wait}s**.`);
    }

    const balance = getBalance(userId, guildId);
    const allin = interaction.options.getBoolean('all-in') ?? false;
    const rawAmount = interaction.options.getInteger('amount');

    if (allin && rawAmount !== null) {
      return interaction.editReply('Use either `all-in` or an `amount` — not both.');
    }
    if (!allin && rawAmount === null) {
      return interaction.editReply('Provide an `amount` or use `all-in: True`.');
    }

    const amount = allin ? balance : rawAmount;
    if (amount <= 0) return interaction.editReply("You don't have any coins to bet!");
    if (amount > balance) {
      return interaction.editReply(`You only have **${balance.toLocaleString()} coins**. Can't bet ${amount.toLocaleString()}.`);
    }

    const multiplier = interaction.options.getInteger('multiplier');
    const description = interaction.options.getString('description');

    setCooldown(userId, 'bet', COOLDOWN);

    const chance = winChance(multiplier);
    let won = Math.random() < chance;
    let charmUsed = false;

    if (!won) {
      const charmVal = consumeActiveItem(userId, guildId, 'lucky_charm');
      if (charmVal !== null) {
        charmUsed = true;
        won = Math.random() < chance;
      }
    }

    const streak = won ? recordWin(userId, guildId) : resetStreak(userId, guildId);
    const bonus = streakBonus(streak);

    let jackpotWon = 0;
    let winnings = 0;
    let paydayBonus = 0;
    let insuranceRefund = 0;

    if (won) {
      const base = amount * multiplier - amount;
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
      removeBalance(userId, guildId, amount);
      addBalance(interaction.client.user.id, guildId, amount);
      feedJackpot(guildId, Math.floor(amount * 0.10));

      const insuranceMult = consumeActiveItem(userId, guildId, 'insurance_policy') ?? 0;
      insuranceRefund = Math.floor(amount * insuranceMult);
      if (insuranceRefund > 0) {
        removeBalance(interaction.client.user.id, guildId, insuranceRefund);
        addBalance(userId, guildId, insuranceRefund);
      }
    }

    const newBalance = getBalance(userId, guildId);
    const jackpotNow = getJackpot(guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(won ? '🎉 You Won!' : '💸 You Lost!')
      .addFields(
        { name: 'Bet', value: `${amount.toLocaleString()} coins`, inline: true },
        { name: 'Multiplier', value: `${multiplier}x`, inline: true },
        { name: won ? 'Won' : 'Lost', value: `${(won ? winnings : amount).toLocaleString()} coins`, inline: true },
        { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: false }
      );

    if (won && bonus > 0) embed.addFields({ name: `🔥 ${streak}-Win Streak`, value: `+${Math.round(bonus * 100)}% bonus`, inline: true });
    if (!won && streak > 0) embed.addFields({ name: '🛡️ Streak Shield!', value: `Your ${streak}-win streak was protected!`, inline: true });
    if (charmUsed) embed.addFields({ name: '🍀 Lucky Charm!', value: won ? 'Re-roll saved you!' : 'Re-roll activated — still lost.', inline: true });
    if (paydayBonus > 0) embed.addFields({ name: '💰 Payday!', value: `+${paydayBonus.toLocaleString()} bonus coins!`, inline: true });
    if (insuranceRefund > 0) embed.addFields({ name: '🏦 Insurance!', value: `+${insuranceRefund.toLocaleString()} refunded`, inline: true });
    if (jackpotWon > 0) embed.addFields({ name: '🏆 JACKPOT!', value: `+${jackpotWon.toLocaleString()} bonus coins!`, inline: false });

    embed.setFooter({ text: `Win chance: ${Math.round(chance * 100)}%${description ? ` | "${description}"` : ''} | Jackpot: ${jackpotNow.toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });
  }
};
