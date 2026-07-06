const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, addBalance, removeBalance, feedJackpot } = require('../../utils/currency');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
const { recordWin, resetStreak } = require('../../utils/streak');
const { safeDefer } = require('../../utils/interact');

const games = new Map();

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function makeDeck() {
  const deck = SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardVal(rank) {
  if (['J','Q','K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardVal(c.rank), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces-- > 0) total -= 10;
  return total;
}

// True if the hand is soft (ace counted as 11)
function isSoft(hand) {
  const hard = hand.reduce((s, c) => s + (c.rank === 'A' ? 1 : cardVal(c.rank)), 0);
  return handValue(hand) !== hard && hand.some(c => c.rank === 'A');
}

// Exact probability (%) that the next draw busts the player
function bustIfHit(hand, deck) {
  if (!deck.length) return 0;
  const busts = deck.filter(c => handValue([...hand, c]) > 21).length;
  return Math.round(busts / deck.length * 100);
}

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Monte Carlo: probability (%) that the dealer busts completing their hand
function dealerBustChance(dealerHand, deck, sims = 1200) {
  const v = handValue(dealerHand);
  if (v >= 17) return v > 21 ? 100 : 0;
  if (!deck.length) return 0;
  let busts = 0;
  for (let i = 0; i < sims; i++) {
    const shuffled = fisherYates(deck);
    const hand = [...dealerHand];
    let idx = 0;
    while (handValue(hand) < 17 && idx < shuffled.length) hand.push(shuffled[idx++]);
    if (handValue(hand) > 21) busts++;
  }
  return Math.round(busts / sims * 100);
}

// Classic basic strategy recommendation
function optimalPlay(playerHand, dealerUpcard, canDouble) {
  const pv = handValue(playerHand);
  const dv = cardVal(dealerUpcard.rank);
  const soft = isSoft(playerHand);

  if (soft) {
    if (pv >= 19) return 'Stand';
    if (pv === 18) {
      if (dv >= 3 && dv <= 6 && canDouble) return 'Double';
      if (dv <= 8) return 'Stand';
      return 'Hit';
    }
    if (pv === 17) return (dv >= 3 && dv <= 6 && canDouble) ? 'Double' : 'Hit';
    return (dv >= 4 && dv <= 6 && canDouble) ? 'Double' : 'Hit';
  }

  if (pv >= 17) return 'Stand';
  if (pv >= 13) return dv <= 6 ? 'Stand' : 'Hit';
  if (pv === 12) return (dv >= 4 && dv <= 6) ? 'Stand' : 'Hit';
  if (pv === 11) return canDouble ? 'Double' : 'Hit';
  if (pv === 10) return (dv <= 9 && canDouble) ? 'Double' : 'Hit';
  if (pv === 9) return (dv >= 3 && dv <= 6 && canDouble) ? 'Double' : 'Hit';
  return 'Hit';
}

function displayHand(hand, hideFirst = false) {
  return hand.map((c, i) => (hideFirst && i === 0) ? '`??`' : `\`${c.rank}${c.suit}\``).join(' ');
}

function buildEmbed(game, finished = false, resultLabel = null) {
  const pv = handValue(game.playerHand);
  const dv = handValue(game.dealerHand);

  let color = 0xffd700;
  let title = `🃏 Blackjack — Bet: ${game.bet.toLocaleString()} coins`;
  if (finished && resultLabel) {
    color = resultLabel.includes('Win') || resultLabel.includes('BLACKJACK') ? 0x57f287
          : resultLabel.includes('Push') ? 0xffd700
          : 0xed4245;
    title = resultLabel;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields(
      { name: `Dealer${finished ? ` — ${dv}` : ''}`, value: displayHand(game.dealerHand, !finished), inline: false },
      { name: `Your Hand — ${pv}`, value: displayHand(game.playerHand), inline: false }
    );

  if (!finished && pv < 21) {
    const upcard = game.dealerHand[1];
    const bust = bustIfHit(game.playerHand, game.deck);
    const dBust = dealerBustChance(game.dealerHand, game.deck);
    const canDouble = game.playerHand.length === 2;
    const play = optimalPlay(game.playerHand, upcard, canDouble);
    embed.addFields({
      name: '📊 Odds',
      value: `Hit bust risk: **${bust}%** | Dealer bust chance: **${dBust}%** | Optimal: **${play}**`,
      inline: false,
    });
  }

  return embed;
}

function buildButtons(userId, disabled = false, canDouble = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('Hit').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('Stand').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
  if (canDouble && !disabled) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`bj_double_${userId}`).setLabel('Double Down').setStyle(ButtonStyle.Danger)
    );
  }
  return row;
}

async function finishGame(interaction, game, result) {
  const { userId, guildId, bet } = game;
  let payout = 0;
  let resultLabel;
  const botId = interaction.client.user.id;

  if (result === 'blackjack') {
    payout = Math.floor(bet * 1.5);
    removeBalance(botId, guildId, payout);
    addBalance(userId, guildId, payout);
    recordWin(userId, guildId);
    resultLabel = 'BLACKJACK! 🎉';
  } else if (result === 'win') {
    payout = bet;
    removeBalance(botId, guildId, payout);
    addBalance(userId, guildId, payout);
    recordWin(userId, guildId);
    resultLabel = 'You Win! 🎉';
  } else if (result === 'push') {
    resultLabel = 'Push — Bet Returned';
  } else {
    removeBalance(userId, guildId, bet);
    addBalance(botId, guildId, bet);
    feedJackpot(guildId, Math.floor(bet * 0.10));
    resetStreak(userId, guildId);
    resultLabel = result === 'bust' ? 'Bust! 💸' : 'You Lose! 💸';
  }

  const newBalance = getBalance(userId, guildId);
  const embed = buildEmbed(game, true, resultLabel);
  embed.addFields(
    { name: payout > 0 ? 'Won' : result === 'push' ? 'Returned' : 'Lost', value: `${bet.toLocaleString()} coins`, inline: true },
    { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
  );

  games.delete(`${userId}:${guildId}`);
  await interaction.editReply({ embeds: [embed], components: [buildButtons(userId, true)] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play blackjack — hit or stand to beat the dealer')
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

    const wait = checkCooldown(userId, 'blackjack');
    if (wait > 0) return interaction.editReply(`Blackjack is on cooldown. Try again in **${wait}s**.`);

    if (games.has(`${userId}:${guildId}`)) {
      return interaction.editReply('You already have an active blackjack game. Finish it first.');
    }

    const balance = getBalance(userId, guildId);
    const allin = interaction.options.getBoolean('all-in') ?? false;
    const rawBet = interaction.options.getInteger('bet');

    if (allin && rawBet !== null) return interaction.editReply('Use either `all-in` or a `bet` amount — not both.');
    if (!allin && rawBet === null) return interaction.editReply('Provide a `bet` amount or use `all-in: True`.');

    const bet = allin ? balance : rawBet;
    if (bet <= 0) return interaction.editReply("You don't have any coins to bet!");
    if (bet > balance) return interaction.editReply(`You only have **${balance.toLocaleString()} coins**.`);

    setCooldown(userId, 'blackjack', 10);

    const deck = makeDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];
    const game = { deck, playerHand, dealerHand, bet, userId, guildId };
    games.set(`${userId}:${guildId}`, game);

    if (handValue(playerHand) === 21) {
      while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());
      const dv = handValue(dealerHand);
      const result = dv === 21 ? 'push' : 'blackjack';
      const embed = buildEmbed(game, true, result === 'push' ? 'Push — Both Blackjack' : 'BLACKJACK! 🎉');
      if (result === 'blackjack') {
        const payout = Math.floor(bet * 1.5);
        removeBalance(interaction.client.user.id, guildId, payout);
        addBalance(userId, guildId, payout);
        recordWin(userId, guildId);
        embed.addFields(
          { name: 'Won', value: `${payout.toLocaleString()} coins`, inline: true },
          { name: 'Balance', value: `${getBalance(userId, guildId).toLocaleString()} coins`, inline: true }
        );
      }
      games.delete(`${userId}:${guildId}`);
      return interaction.editReply({ embeds: [embed], components: [buildButtons(userId, true)] });
    }

    const canDouble = balance >= bet * 2;
    const embed = buildEmbed(game);
    await interaction.editReply({ embeds: [embed], components: [buildButtons(userId, false, canDouble)] });
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');
    const action = parts[1]; // hit | stand | double
    const ownerId = parts[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "That's not your game.", flags: 64 });
    }

    try {
      await interaction.deferUpdate();
    } catch {
      return;
    }

    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const game = games.get(`${userId}:${guildId}`);

    if (!game) {
      return interaction.followUp({ content: 'No active blackjack game found.', flags: 64 });
    }

    if (action === 'hit') {
      game.playerHand.push(game.deck.pop());
      const pv = handValue(game.playerHand);

      if (pv > 21) return finishGame(interaction, game, 'bust');
      if (pv === 21) {
        while (handValue(game.dealerHand) < 17) game.dealerHand.push(game.deck.pop());
        const dv = handValue(game.dealerHand);
        const result = dv > 21 || pv > dv ? 'win' : pv < dv ? 'lose' : 'push';
        return finishGame(interaction, game, result);
      }

      const embed = buildEmbed(game);
      return interaction.editReply({ embeds: [embed], components: [buildButtons(userId)] });
    }

    if (action === 'stand') {
      while (handValue(game.dealerHand) < 17) game.dealerHand.push(game.deck.pop());
      const pv = handValue(game.playerHand);
      const dv = handValue(game.dealerHand);
      const result = dv > 21 || pv > dv ? 'win' : pv < dv ? 'lose' : 'push';
      return finishGame(interaction, game, result);
    }

    if (action === 'double') {
      const balance = getBalance(userId, guildId);
      if (balance < game.bet * 2) {
        return interaction.followUp({ content: `You need **${(game.bet * 2).toLocaleString()} coins** to double down.`, flags: 64 });
      }

      game.bet *= 2;
      game.playerHand.push(game.deck.pop());
      const pv = handValue(game.playerHand);

      if (pv > 21) return finishGame(interaction, game, 'bust');

      while (handValue(game.dealerHand) < 17) game.dealerHand.push(game.deck.pop());
      const dv = handValue(game.dealerHand);
      const result = dv > 21 || pv > dv ? 'win' : pv < dv ? 'lose' : 'push';
      return finishGame(interaction, game, result);
    }
  },
};
