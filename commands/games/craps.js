const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, addBalance, removeBalance, feedJackpot } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');

const games = new Map(); // `${userId}:${guildId}` → game state

// Probability of each sum on 2d6
const ROLL_ODDS = {
  2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36,
  8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36,
};

function rollDice() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, sum: d1 + d2 };
}

function dieFace(n) {
  return ['⚀','⚁','⚂','⚃','⚄','⚅'][n - 1];
}

// Probability of hitting `target` before rolling 7, given remaining deck odds
function hitBeforeSeven(target) {
  const pHit   = ROLL_ODDS[target];
  const pSeven = ROLL_ODDS[7];
  return (pHit / (pHit + pSeven) * 100).toFixed(1);
}

function comeOutResultText(sum) {
  if ([7, 11].includes(sum))  return '🎉 Natural! You win!';
  if ([2, 3, 12].includes(sum)) return '💀 Craps! You lose.';
  return `Point is set: **${sum}**`;
}

function buildEmbed(game, roll = null, finished = false, resultLabel = null) {
  const { bet, passBet, dontBet, point } = game;

  let color = 0xffd700;
  let title = '🎲 Craps';
  if (finished && resultLabel) {
    color = resultLabel.includes('Win') ? 0x57f287 : resultLabel.includes('Push') ? 0xffd700 : 0xed4245;
    title = resultLabel;
  }

  const embed = new EmbedBuilder().setColor(color).setTitle(title);

  // Bets line
  const betParts = [];
  if (passBet > 0)  betParts.push(`Pass: **${passBet.toLocaleString()}**`);
  if (dontBet > 0)  betParts.push(`Don't Pass: **${dontBet.toLocaleString()}**`);
  embed.addFields({ name: 'Bets', value: betParts.join(' | ') || '—', inline: false });

  // Roll result
  if (roll) {
    embed.addFields({
      name: 'Roll',
      value: `${dieFace(roll.d1)} ${dieFace(roll.d2)}  →  **${roll.sum}**`,
      inline: false,
    });
  }

  // Phase info
  if (!finished) {
    if (point === null) {
      // Come-out phase
      embed.addFields({
        name: '📊 Come-Out Odds',
        value: [
          `Win (7 or 11): **${((ROLL_ODDS[7] + ROLL_ODDS[11]) * 100).toFixed(1)}%**`,
          `Lose (2, 3, 12): **${((ROLL_ODDS[2] + ROLL_ODDS[3] + ROLL_ODDS[12]) * 100).toFixed(1)}%**`,
          `Set point: **${((1 - ROLL_ODDS[7] - ROLL_ODDS[11] - ROLL_ODDS[2] - ROLL_ODDS[3] - ROLL_ODDS[12]) * 100).toFixed(1)}%**`,
        ].join('\n'),
        inline: false,
      });
    } else {
      // Point phase
      embed.addFields({
        name: `🎯 Point: ${point}`,
        value: [
          `Hit point before 7: **${hitBeforeSeven(point)}%**`,
          `Roll a 7 (lose Pass): **${(ROLL_ODDS[7] * 100).toFixed(1)}%** per roll`,
        ].join('\n'),
        inline: false,
      });
    }
  }

  return embed;
}

function buildBetButtons(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cr_pass_${userId}`).setLabel('Pass Line').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`cr_dont_${userId}`).setLabel("Don't Pass").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`cr_both_${userId}`).setLabel('Both (split)').setStyle(ButtonStyle.Secondary),
  );
}

function buildRollButton(userId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cr_roll_${userId}`)
      .setLabel('Roll Dice')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craps')
    .setDescription('Play craps — bet Pass or Don\'t Pass, then roll')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setMinValue(1)
    )
    .addBooleanOption(opt =>
      opt.setName('all-in').setDescription('Bet your entire balance')
    ),

  async execute(interaction) {
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;
    await safeDefer(interaction);

    const wait = checkCooldown(userId, 'craps');
    if (wait > 0) return interaction.editReply(`Craps is on cooldown. Try again in **${wait}s**.`);

    if (games.has(`${userId}:${guildId}`)) {
      return interaction.editReply('You already have an active craps game. Finish it first.');
    }

    const balance = getBalance(userId, guildId);
    const allin   = interaction.options.getBoolean('all-in') ?? false;
    const rawBet  = interaction.options.getInteger('bet');

    if (allin && rawBet !== null) return interaction.editReply('Use either `all-in` or a `bet` amount — not both.');
    if (!allin && rawBet === null) return interaction.editReply('Provide a `bet` amount or use `all-in: True`.');

    const bet = allin ? balance : rawBet;
    if (bet <= 0)      return interaction.editReply("You don't have any coins to bet!");
    if (bet > balance) return interaction.editReply(`You only have **${balance.toLocaleString()} coins**.`);

    setCooldown(userId, 'craps', 8);

    const game = { bet, passBet: 0, dontBet: 0, point: null, userId, guildId };
    games.set(`${userId}:${guildId}`, game);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🎲 Craps — Place Your Bet')
      .addFields(
        { name: 'Your Bet', value: `**${bet.toLocaleString()} coins**`, inline: false },
        {
          name: 'How to Bet',
          value: [
            '**Pass Line** — Win on 7/11, lose on 2/3/12. After a point is set, win by rolling the point before a 7.',
            "**Don't Pass** — Opposite of Pass (2/3 win, 7/11 lose, 12 is a push). After a point, win if 7 comes before the point.",
            "**Both (split)** — Half your bet on each side. Hedges the risk.",
          ].join('\n\n'),
          inline: false,
        }
      );

    await interaction.editReply({ embeds: [embed], components: [buildBetButtons(userId)] });
  },

  async handleButton(interaction) {
    const parts   = interaction.customId.split('_');
    const action  = parts[1]; // pass | dont | both | roll
    const ownerId = parts[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "That's not your game.", flags: 64 });
    }

    try {
      await interaction.deferUpdate();
    } catch {
      return;
    }

    const userId  = interaction.user.id;
    const guildId = interaction.guildId;
    const game    = games.get(`${userId}:${guildId}`);

    if (!game) {
      return interaction.followUp({ content: 'No active craps game found.', flags: 64 });
    }

    // ── Bet selection ──────────────────────────────────────────────
    if (action === 'pass' || action === 'dont' || action === 'both') {
      if (action === 'pass') {
        game.passBet = game.bet;
        game.dontBet = 0;
      } else if (action === 'dont') {
        game.passBet = 0;
        game.dontBet = game.bet;
      } else {
        game.passBet = Math.floor(game.bet / 2);
        game.dontBet = game.bet - game.passBet;
      }

      const embed = buildEmbed(game);
      embed.addFields({ name: 'Come-Out Roll', value: 'Ready — hit **Roll Dice** to throw!', inline: false });
      return interaction.editReply({ embeds: [embed], components: [buildRollButton(userId)] });
    }

    // ── Roll ───────────────────────────────────────────────────────
    if (action === 'roll') {
      const roll   = rollDice();
      const { sum } = roll;
      const { passBet, dontBet, point, bet } = game;
      const botId  = interaction.client.user.id;

      // ── Come-out phase ────────────────────────────────────────────
      if (point === null) {
        let passResult = null; // 'win' | 'lose' | 'point'
        let dontResult = null;

        if (sum === 7 || sum === 11) {
          passResult = 'win';
          dontResult = 'lose';
        } else if (sum === 2 || sum === 3) {
          passResult = 'lose';
          dontResult = 'win';
        } else if (sum === 12) {
          passResult = 'lose';
          dontResult = 'push'; // 12 is a push for Don't Pass
        } else {
          game.point = sum;
          const embed = buildEmbed(game, roll);
          embed.addFields({ name: 'Status', value: comeOutResultText(sum), inline: false });
          return interaction.editReply({ embeds: [embed], components: [buildRollButton(userId)] });
        }

        // Come-out resolved immediately
        return resolveGame(interaction, game, roll, passResult, dontResult);
      }

      // ── Point phase ───────────────────────────────────────────────
      if (sum === point) {
        return resolveGame(interaction, game, roll, 'win', 'lose');
      }
      if (sum === 7) {
        return resolveGame(interaction, game, roll, 'lose', 'win');
      }

      // No decision — keep rolling
      const embed = buildEmbed(game, roll);
      embed.addFields({ name: 'No Decision', value: `Rolled **${sum}** — keep going!`, inline: false });
      return interaction.editReply({ embeds: [embed], components: [buildRollButton(userId)] });
    }
  },
};

async function resolveGame(interaction, game, roll, passResult, dontResult) {
  const { userId, guildId, passBet, dontBet, bet } = game;
  const botId = interaction.client.user.id;

  let netDelta = 0; // net coin change for the player
  const lines  = [];

  // Pass line resolution
  if (passBet > 0) {
    if (passResult === 'win') {
      removeBalance(botId, guildId, passBet);
      addBalance(userId, guildId, passBet);
      netDelta += passBet;
      lines.push(`Pass Line: **+${passBet.toLocaleString()}** ✅`);
    } else if (passResult === 'lose') {
      removeBalance(userId, guildId, passBet);
      addBalance(botId, guildId, passBet);
      feedJackpot(guildId, Math.floor(passBet * 0.05));
      netDelta -= passBet;
      lines.push(`Pass Line: **-${passBet.toLocaleString()}** ❌`);
    } else {
      lines.push(`Pass Line: **push** ↔️`);
    }
  }

  // Don't Pass resolution
  if (dontBet > 0) {
    if (dontResult === 'win') {
      removeBalance(botId, guildId, dontBet);
      addBalance(userId, guildId, dontBet);
      netDelta += dontBet;
      lines.push(`Don't Pass: **+${dontBet.toLocaleString()}** ✅`);
    } else if (dontResult === 'lose') {
      removeBalance(userId, guildId, dontBet);
      addBalance(botId, guildId, dontBet);
      feedJackpot(guildId, Math.floor(dontBet * 0.05));
      netDelta -= dontBet;
      lines.push(`Don't Pass: **-${dontBet.toLocaleString()}** ❌`);
    } else {
      lines.push(`Don't Pass: **push** ↔️`);
    }
  }

  if (netDelta > 0) {
    recordWin(userId, guildId);
  } else if (netDelta < 0) {
    resetStreak(userId, guildId);
  }

  const resultLabel = netDelta > 0 ? `You Win +${netDelta.toLocaleString()}! 🎉`
                    : netDelta < 0 ? `You Lose -${Math.abs(netDelta).toLocaleString()} 💸`
                    : 'Push — Bet Returned';

  const newBalance = getBalance(userId, guildId);
  const embed = buildEmbed(game, roll, true, resultLabel);
  embed.addFields(
    { name: 'Result', value: lines.join('\n'), inline: false },
    { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
  );

  games.delete(`${userId}:${guildId}`);

  const disabledBets = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cr_pass_${userId}`).setLabel('Pass Line').setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(`cr_dont_${userId}`).setLabel("Don't Pass").setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`cr_both_${userId}`).setLabel('Both (split)').setStyle(ButtonStyle.Secondary).setDisabled(true),
  );

  await interaction.editReply({ embeds: [embed], components: [disabledBets] });
}
