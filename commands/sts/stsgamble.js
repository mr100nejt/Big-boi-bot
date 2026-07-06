const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ask } = require('../../utils/llm');
const { getBalance, addBalance, removeBalance, feedJackpot, claimJackpot, getJackpot } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak, streakBonus } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');
const { consumeActiveItem } = require('../../utils/shop');

const CHARACTERS = ['Necrobinder', 'Ironclad', 'Regent', 'Defect', 'Silent'];
const BOSSES = ['Slime Boss', 'The Guardian', 'Hexaghost', 'Bronze Automaton', 'Champ', 'Collector', 'Time Eater', 'Awakened One', 'The Heart'];
const FLOORS = [10, 17, 33, 40, 50];

const SYSTEM = `You are a Slay the Spire narrator. Write a single short paragraph (2-4 sentences) of dramatic flavor text describing a run outcome. Be specific to the character, floor, and boss. Keep it under 100 words. Don't use markdown.`;

const WIN_CHANCE = 0.45;
const COOLDOWN = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stsgamble')
    .setDescription('STS: bet coins on a character surviving a random scenario')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('character').setDescription('Pick your champion').setRequired(true)
        .addChoices(
          { name: 'Necrobinder', value: 'Necrobinder' },
          { name: 'Ironclad', value: 'Ironclad' },
          { name: 'Regent', value: 'Regent' },
          { name: 'Defect', value: 'Defect' },
          { name: 'Silent', value: 'Silent' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setMinValue(1)
    )
    .addBooleanOption(opt =>
      opt.setName('all-in').setDescription('Bet your entire balance')
    ),

  async execute(interaction) {
    await safeDefer(interaction);

    const wait = checkCooldown(interaction.user.id, 'stsgamble');
    if (wait > 0) {
      return interaction.editReply(`STS Gamble is on cooldown. Try again in **${wait}s**.`);
    }

    const character = interaction.options.getString('character');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
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

    setCooldown(userId, 'stsgamble', COOLDOWN);

    const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    const floor = FLOORS[Math.floor(Math.random() * FLOORS.length)];
    let won = Math.random() < WIN_CHANCE;
    let charmUsed = false;

    if (!won) {
      const charmVal = consumeActiveItem(userId, guildId, 'lucky_charm');
      if (charmVal !== null) {
        charmUsed = true;
        won = Math.random() < WIN_CHANCE;
      }
    }

    const streak = won ? recordWin(userId, guildId) : resetStreak(userId, guildId);
    const bonus = streakBonus(streak);

    const prompt = `Character: ${character}, Floor: ${floor}, Boss: ${boss}, Outcome: ${won ? 'VICTORY' : 'DEFEAT'}`;

    let flavor = won
      ? `${character} emerged victorious against ${boss} on floor ${floor}.`
      : `${character} fell to ${boss} on floor ${floor}.`;

    try {
      flavor = await ask(SYSTEM, prompt, 150);
    } catch (err) {
      console.error('stsgamble LLM error:', err);
    }

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

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(`${won ? '⚔️ Victory!' : '💀 Defeated!'} — ${character} vs ${boss}`)
      .setDescription(`*${flavor}*`)
      .addFields(
        { name: 'Floor', value: `${floor}`, inline: true },
        { name: won ? 'Won' : 'Lost', value: `${(won ? payout : bet).toLocaleString()} coins`, inline: true },
        { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
      );

    if (won && bonus > 0) embed.addFields({ name: `🔥 ${streak}-Win Streak`, value: `+${Math.round(bonus * 100)}% bonus`, inline: true });
    if (!won && streak > 0) embed.addFields({ name: '🛡️ Streak Shield!', value: `Your ${streak}-win streak was protected!`, inline: true });
    if (charmUsed) embed.addFields({ name: '🍀 Lucky Charm!', value: won ? 'Re-roll saved you!' : 'Re-roll activated — still lost.', inline: true });
    if (paydayBonus > 0) embed.addFields({ name: '💰 Payday!', value: `+${paydayBonus.toLocaleString()} bonus coins!`, inline: true });
    if (insuranceRefund > 0) embed.addFields({ name: '🏦 Insurance!', value: `+${insuranceRefund.toLocaleString()} refunded`, inline: true });
    if (jackpotWon > 0) embed.addFields({ name: '🏆 JACKPOT!', value: `+${jackpotWon.toLocaleString()} bonus coins!`, inline: false });
    embed.setFooter({ text: `Win chance: 45% | Jackpot pot: ${jackpotNow.toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });
  }
};
