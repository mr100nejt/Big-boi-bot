const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const ODDS = {
  slots: {
    title: '🎰 Slots — Odds & Payouts',
    color: 0xffd700,
    fields: [
      { name: '7️⃣ 7️⃣ 7️⃣  Jackpot Roll', value: '**0.5%** chance → net **+49x** your bet', inline: false },
      { name: '💎 💎 💎  Big Win',          value: '**2.0%** chance → net **+14x** your bet', inline: false },
      { name: 'Three of a Kind (fruits)',   value: '**5.0%** chance → net **+4x** your bet',  inline: false },
      { name: 'Pair',                        value: '**5.0%** chance → net **+1x** your bet',  inline: false },
      { name: 'No Match',                    value: '**87.5%** chance → lose your bet',         inline: false },
    ],
    footer: 'Any win has an extra 0.5% chance to claim the full server jackpot pot. Losses feed 10% into it.',
  },

  coinflip: {
    title: '🪙 Coinflip — Odds & Payouts',
    color: 0xf5c518,
    fields: [
      { name: 'Win', value: '**50%** chance → net **+1x** your bet', inline: true },
      { name: 'Lose', value: '**50%** chance → lose your bet',       inline: true },
    ],
    footer: 'Pure 50/50. Win streaks give up to +50% bonus on profit.',
  },

  bet: {
    title: '🎲 Bet — Odds & Payouts',
    color: 0x3498db,
    fields: [
      { name: '2x',  value: '45.0% win → net +1x',  inline: true },
      { name: '3x',  value: '30.0% win → net +2x',  inline: true },
      { name: '4x',  value: '22.5% win → net +3x',  inline: true },
      { name: '5x',  value: '18.0% win → net +4x',  inline: true },
      { name: '6x',  value: '15.0% win → net +5x',  inline: true },
      { name: '7x',  value: '12.9% win → net +6x',  inline: true },
      { name: '8x',  value: '11.3% win → net +7x',  inline: true },
      { name: '9x+', value: '10.0% win → net +8x+', inline: true },
    ],
    footer: 'Formula: max(10%, 90% ÷ multiplier). Floor hits at 9x and holds through 20x.',
  },

  roulette: {
    title: '🎡 Roulette — Odds & Payouts',
    color: 0xe74c3c,
    fields: [
      { name: 'Red / Black',         value: '**48.6%** (18/37) → net **+1x** your bet',  inline: false },
      { name: 'Odd / Even',          value: '**48.6%** (18/37) → net **+1x** your bet',  inline: false },
      { name: 'Low (1–18) / High (19–36)', value: '**48.6%** (18/37) → net **+1x** your bet', inline: false },
      { name: 'Single Number',       value: '**2.7%** (1/37) → net **+35x** your bet',   inline: false },
      { name: '🟢 Zero (0)',         value: 'Loses on all even-money bets — this is the house edge', inline: false },
    ],
    footer: '37 pockets total (0–36). The green 0 is where the house makes its money.',
  },

  blackjack: {
    title: '🃏 Blackjack — Rules & Payouts',
    color: 0x2c3e50,
    fields: [
      { name: 'Blackjack (opening 21)', value: 'Pays **+1.5x** your bet',     inline: false },
      { name: 'Normal Win',             value: 'Pays **+1x** your bet',        inline: false },
      { name: 'Push (tie)',              value: 'Bet returned, no change',      inline: false },
      { name: 'Bust / Loss',            value: 'Lose your bet',                inline: false },
      { name: 'Dealer rule',            value: 'Hits until 17, then stands',   inline: false },
      { name: 'Auto-stand',             value: 'Bot stands for you if you hit exactly 21', inline: false },
    ],
    footer: 'Win rate depends on your decisions. Basic strategy lowers the house edge significantly.',
  },

  stsgamble: {
    title: '⚔️ STS Gamble — Odds & Payouts',
    color: 0x8b0000,
    fields: [
      { name: 'Victory', value: '**45%** chance → net **+1x** your bet', inline: true },
      { name: 'Defeat',  value: '**55%** chance → lose your bet',        inline: true },
    ],
    footer: 'Win streaks give up to +50% bonus on profit.',
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('odds')
    .setDescription('Show win odds and payouts for a gambling game')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('game')
        .setDescription('Which game to check')
        .setRequired(true)
        .addChoices(
          { name: 'Slots',      value: 'slots' },
          { name: 'Coinflip',   value: 'coinflip' },
          { name: 'Bet',        value: 'bet' },
          { name: 'Roulette',   value: 'roulette' },
          { name: 'Blackjack',  value: 'blackjack' },
          { name: 'STS Gamble', value: 'stsgamble' },
        )
    ),

  async execute(interaction) {
    const game = interaction.options.getString('game');
    const odds = ODDS[game];

    const embed = new EmbedBuilder()
      .setColor(odds.color)
      .setTitle(odds.title)
      .addFields(odds.fields)
      .setFooter({ text: odds.footer });

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};
