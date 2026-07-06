const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, addBalance, removeBalance } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');

const games = new Map(); // `${userId}:${guildId}` → game state — one entry per user per guild

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const PAY_TABLE = [
  { name: 'Royal Flush',     mult: 250 },
  { name: 'Straight Flush',  mult: 50  },
  { name: 'Four of a Kind',  mult: 25  },
  { name: 'Full House',      mult: 9   },
  { name: 'Flush',           mult: 6   },
  { name: 'Straight',        mult: 4   },
  { name: 'Three of a Kind', mult: 3   },
  { name: 'Two Pair',        mult: 2   },
  { name: 'Jacks or Better', mult: 1   },
];

function makeDeck() {
  const deck = SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rankNum(rank) {
  if (rank === 'A')  return 14;
  if (rank === 'K')  return 13;
  if (rank === 'Q')  return 12;
  if (rank === 'J')  return 11;
  return parseInt(rank);
}

function evaluateHand(hand) {
  const nums  = hand.map(c => rankNum(c.rank)).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);
  const counts = {};
  nums.forEach(n => counts[n] = (counts[n] || 0) + 1);
  const freq = Object.values(counts).sort((a, b) => b - a);

  const flush   = suits.every(s => s === suits[0]);
  const straight = new Set(nums).size === 5 && nums[4] - nums[0] === 4;
  const wheel   = JSON.stringify(nums) === JSON.stringify([2, 3, 4, 5, 14]);
  const anyStraight = straight || wheel;

  if (flush && straight && nums[0] === 10) return PAY_TABLE[0]; // Royal Flush
  if (flush && anyStraight)                return PAY_TABLE[1]; // Straight Flush
  if (freq[0] === 4)                       return PAY_TABLE[2]; // Four of a Kind
  if (freq[0] === 3 && freq[1] === 2)      return PAY_TABLE[3]; // Full House
  if (flush)                               return PAY_TABLE[4]; // Flush
  if (anyStraight)                         return PAY_TABLE[5]; // Straight
  if (freq[0] === 3)                       return PAY_TABLE[6]; // Three of a Kind
  if (freq[0] === 2 && freq[1] === 2)      return PAY_TABLE[7]; // Two Pair
  if (freq[0] === 2) {
    const pairRank = parseInt(Object.keys(counts).find(k => counts[k] === 2));
    if (pairRank >= 11) return PAY_TABLE[8]; // Jacks or Better
  }
  return { name: 'No Win', mult: 0 };
}

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Expected payout multiplier for a hold pattern — exact for ≤2 replacements, MC for 3+
function calcEV(held, hand, deck) {
  const heldCards = hand.filter((_, i) => held[i]);
  const numDraw   = 5 - heldCards.length;

  if (numDraw === 0) return evaluateHand(hand).mult;

  if (numDraw <= 2) {
    let total = 0, count = 0;
    function combine(start, drawn) {
      if (drawn.length === numDraw) {
        total += evaluateHand([...heldCards, ...drawn]).mult;
        count++;
        return;
      }
      for (let i = start; i < deck.length; i++) combine(i + 1, [...drawn, deck[i]]);
    }
    combine(0, []);
    return total / count;
  }

  const sims = 700;
  let total = 0;
  for (let i = 0; i < sims; i++) {
    const s = fisherYates(deck);
    total += evaluateHand([...heldCards, ...s.slice(0, numDraw)]).mult;
  }
  return total / sims;
}

// Brute-force optimal hold by evaluating all 32 possible hold combinations
function bestHold(hand, deck) {
  let bestEV = -1, bestMask = 31;
  for (let mask = 0; mask < 32; mask++) {
    const held = [0,1,2,3,4].map(i => !!(mask & (1 << i)));
    const ev   = calcEV(held, hand, deck);
    if (ev > bestEV) { bestEV = ev; bestMask = mask; }
  }
  return [0,1,2,3,4].map(i => !!(bestMask & (1 << i)));
}

function cardLabel(card) {
  return `${card.rank}${card.suit}`;
}

function buildEmbed(game, finished = false, result = null) {
  const { hand, held, bet } = game;

  let color = 0xffd700;
  let title = `🃏 Video Poker — Bet: ${bet.toLocaleString()} coins`;
  if (finished && result) {
    color = result.mult > 0 ? 0x57f287 : 0xed4245;
    title = result.mult > 0
      ? `${result.name}! +${(bet * result.mult).toLocaleString()} coins`
      : 'No Win 💸';
  }

  const handDisplay = hand.map((c, i) =>
    held[i] ? `\`${cardLabel(c)}\`✓` : `\`${cardLabel(c)}\``
  ).join('  ');

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields({ name: 'Your Hand', value: handDisplay, inline: false });

  if (!finished) {
    const current = evaluateHand(hand);
    if (current.mult > 0) {
      embed.addFields({ name: '✅ Current Hand', value: `${current.name} — ${current.mult}x`, inline: false });
    }

    const ev   = calcEV(held, hand, game.deck);
    const best = bestHold(hand, game.deck);
    const bestLabel = best.map((h, i) => h ? `**${i + 1}**` : `${i + 1}`).join(' ');
    embed.addFields({
      name: '📊 Odds',
      value: `Hold EV: **${ev.toFixed(2)}x** | Best hold: ${bestLabel}`,
      inline: false,
    });
  }

  const payText = PAY_TABLE.map(p => `${p.name}: **${p.mult}x**`).join('\n');
  embed.addFields({ name: 'Pay Table', value: payText, inline: false });

  return embed;
}

function buildHoldButtons(userId, hand, held, disabled = false) {
  const row = new ActionRowBuilder();
  for (let i = 0; i < 5; i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`vp_hold_${i}_${userId}`)
        .setLabel(held[i] ? `✓ ${cardLabel(hand[i])}` : cardLabel(hand[i]))
        .setStyle(held[i] ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(disabled)
    );
  }
  return row;
}

function buildDrawButton(userId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vp_draw_${userId}`)
      .setLabel('Draw')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('videopoker')
    .setDescription('Jacks or Better — hold your cards, then draw to replace the rest')
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

    const wait = checkCooldown(userId, 'videopoker');
    if (wait > 0) return interaction.editReply(`Video Poker is on cooldown. Try again in **${wait}s**.`);

    if (games.has(`${userId}:${guildId}`)) {
      return interaction.editReply('You already have an active game. Finish it first.');
    }

    const balance = getBalance(userId, guildId);
    const allin   = interaction.options.getBoolean('all-in') ?? false;
    const rawBet  = interaction.options.getInteger('bet');

    if (allin && rawBet !== null) return interaction.editReply('Use either `all-in` or a `bet` amount — not both.');
    if (!allin && rawBet === null) return interaction.editReply('Provide a `bet` amount or use `all-in: True`.');

    const bet = allin ? balance : rawBet;
    if (bet <= 0)       return interaction.editReply("You don't have any coins to bet!");
    if (bet > balance)  return interaction.editReply(`You only have **${balance.toLocaleString()} coins**.`);

    setCooldown(userId, 'videopoker', 10);

    const deck = makeDeck();
    const hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    const held = [false, false, false, false, false];
    const game = { deck, hand, held, bet, userId, guildId };
    games.set(`${userId}:${guildId}`, game);

    const embed = buildEmbed(game);
    await interaction.editReply({
      embeds: [embed],
      components: [buildHoldButtons(userId, hand, held), buildDrawButton(userId)],
    });
  },

  async handleButton(interaction) {
    const parts  = interaction.customId.split('_');
    const action = parts[1]; // 'hold' | 'draw'
    // vp_hold_<idx>_<userId>  →  ownerId = parts[3]
    // vp_draw_<userId>        →  ownerId = parts[2]
    const ownerId = action === 'hold' ? parts[3] : parts[2];

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
      return interaction.followUp({ content: 'No active game found.', flags: 64 });
    }

    if (action === 'hold') {
      const idx = parseInt(parts[2]);
      game.held[idx] = !game.held[idx];
      const embed = buildEmbed(game);
      return interaction.editReply({
        embeds: [embed],
        components: [buildHoldButtons(userId, game.hand, game.held), buildDrawButton(userId)],
      });
    }

    if (action === 'draw') {
      for (let i = 0; i < 5; i++) {
        if (!game.held[i]) game.hand[i] = game.deck.pop();
      }

      const result  = evaluateHand(game.hand);
      const botId   = interaction.client.user.id;
      const { bet } = game;

      if (result.mult > 0) {
        const payout = bet * result.mult;
        removeBalance(botId, guildId, payout);
        addBalance(userId, guildId, payout);
        recordWin(userId, guildId);
      } else {
        removeBalance(userId, guildId, bet);
        addBalance(botId, guildId, bet);
        resetStreak(userId, guildId);
      }

      const newBalance = getBalance(userId, guildId);
      const embed = buildEmbed(game, true, result);
      embed.addFields(
        { name: result.mult > 0 ? 'Won' : 'Lost', value: `${(result.mult > 0 ? bet * result.mult : bet).toLocaleString()} coins`, inline: true },
        { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
      );

      games.delete(`${userId}:${guildId}`);
      return interaction.editReply({
        embeds: [embed],
        components: [buildHoldButtons(userId, game.hand, game.held, true), buildDrawButton(userId, true)],
      });
    }
  },
};
