const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, removeBalance, feedJackpot, claimJackpot, getJackpot } = require('../../utils/currency');
const { getStreak, recordWin, resetStreak, streakBonus } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');

const FRUITS = ['🍒', '🍋', '🍊', '🍇'];

function pickFruit() {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

function spin() {
  const r = Math.random() * 100;

  if (r < 0.5) {
    return { reels: ['7️⃣', '7️⃣', '7️⃣'], multiplier: 50, label: '🚨 JACKPOT ROLL!' };
  }
  if (r < 2.5) {
    return { reels: ['💎', '💎', '💎'], multiplier: 15, label: 'BIG WIN!' };
  }
  if (r < 7.5) {
    const f = pickFruit();
    return { reels: [f, f, f], multiplier: 5, label: 'Three of a Kind!' };
  }
  if (r < 12.5) {
    const f = pickFruit();
    const other = FRUITS.filter(x => x !== f)[Math.floor(Math.random() * 3)];
    const reels = Math.random() < 0.5 ? [f, f, other] : [f, other, f];
    return { reels, multiplier: 2, label: 'Pair!' };
  }
  // miss — all different
  const [a, b, c] = FRUITS.sort(() => Math.random() - 0.5).slice(0, 3);
  return { reels: [a, b, c], multiplier: 0, label: 'No match' };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the slot machine')
    .setDMPermission(false)
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
      return interaction.editReply(`You only have **${balance.toLocaleString()} coins**.`);
    }

    const { reels, multiplier, label } = spin();
    const won = multiplier > 0;
    const streak = won ? recordWin(userId, guildId) : (resetStreak(userId, guildId), 0);
    const bonus = streakBonus(streak);

    let jackpotWon = 0;
    let payout = 0;

    if (won) {
      const base = bet * multiplier - bet;
      const bonusCoins = Math.floor(base * bonus);
      payout = base + bonusCoins;
      removeBalance(interaction.client.user.id, guildId, payout);
      addBalance(userId, guildId, payout);

      if (Math.random() < 0.005) {
        jackpotWon = claimJackpot(guildId);
        if (jackpotWon > 0) addBalance(userId, guildId, jackpotWon);
      }
    } else {
      removeBalance(userId, guildId, bet);
      feedJackpot(guildId, bet);
    }

    const newBalance = getBalance(userId, guildId);
    const jackpotNow = getJackpot(guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(`[ ${reels.join(' | ')} ]`)
      .setDescription(`**${label}**`);

    if (won) {
      embed.addFields(
        { name: 'Bet', value: `${bet.toLocaleString()}`, inline: true },
        { name: 'Multiplier', value: `${multiplier}x`, inline: true },
        { name: 'Won', value: `+${payout.toLocaleString()}`, inline: true }
      );
      if (bonus > 0) embed.addFields({ name: `🔥 ${streak}-Win Streak`, value: `+${Math.round(bonus * 100)}% bonus`, inline: true });
      if (jackpotWon > 0) embed.addFields({ name: '🎰 JACKPOT HIT!', value: `+${jackpotWon.toLocaleString()} bonus coins!`, inline: false });
    } else {
      embed.addFields(
        { name: 'Lost', value: `${bet.toLocaleString()}`, inline: true }
      );
    }

    embed
      .addFields({ name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true })
      .setFooter({ text: `🏆 Jackpot pot: ${jackpotNow.toLocaleString()} coins` });

    await interaction.editReply({ embeds: [embed] });
  }
};
