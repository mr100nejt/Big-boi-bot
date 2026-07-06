const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const SECTIONS = [
  {
    title: '💰 Economy',
    color: 0xf1c40f,
    commands: [
      { name: '/balance', desc: 'Check your coin balance' },
      { name: '/daily', desc: 'Claim your daily coins' },
      { name: '/leaderboard', desc: 'See the richest players on the server' },
      { name: '/daddyplease', desc: 'Beg the bot for a loan (coin flip to approve, 25% interest)' },
      { name: '/repay', desc: 'Repay your outstanding loan' },
      { name: '/botbalance', desc: 'Check the house balance' },
      { name: '/shop list', desc: 'Browse all items for sale in the server shop' },
      { name: '/shop buy', desc: 'Buy a role or consumable buff from the shop. Optional: gift it to another user with `for:@user`' },
      { name: '/shop inventory', desc: 'View your owned items and see which are armed and ready to fire' },
      { name: '/shop use', desc: 'Arm a consumable so it activates automatically in your next game' },
      { name: '/lottery buy', desc: 'Buy lottery tickets — coins go into the prize pool' },
      { name: '/lottery status', desc: 'See the prize pool size and your ticket count' },
    ],
  },
  {
    title: '🎰 Gambling',
    color: 0xe74c3c,
    commands: [
      { name: '/coinflip', desc: '50/50 coin flip — double or nothing. Supports `allin`.' },
      { name: '/bet', desc: 'Custom multiplier bet (2–20x). Higher multiplier = lower odds. Supports `allin`.' },
      { name: '/roulette', desc: 'Spin the wheel — red/black/number bets. Supports `allin`.' },
      { name: '/slots', desc: 'Spin the slot machine. Pairs, triples, or jackpot. Supports `allin`.' },
      { name: '/blackjack', desc: 'Play blackjack with hit/stand buttons. Blackjack pays 1.5x. Supports `allin`.' },
      { name: '/craps', desc: 'Roll the dice — pass/don\'t pass bets. Supports `allin`.' },
      { name: '/videopoker', desc: 'Video poker — hold cards, best hand wins. Supports `allin`.' },
      { name: '/jackpot', desc: 'See the current server jackpot pot (fed by 10% of every loss).' },
    ],
  },
  {
    title: '⚔️ Slay the Spire',
    color: 0x8b0000,
    commands: [
      { name: '/stscharacter', desc: 'Randomly pick a STS2 character for your next run' },
      { name: '/stsgamble', desc: 'Bet coins on a character surviving a random boss scenario' },
      { name: '/draft', desc: 'Draft a 10-round STS deck — pick from 3 cards each round' },
      { name: '/deckcheck', desc: 'Look up info on an STS card' },
    ],
  },
  {
    title: '🎮 Games',
    color: 0x3498db,
    commands: [
      { name: '/overwatch herowheel', desc: 'Spin the wheel for a random Overwatch hero' },
      { name: '/overwatch compcheck', desc: 'Check comp balance for a list of heroes' },
      { name: '/overwatch challenge', desc: 'Get a random Overwatch challenge to try' },
      { name: '/overwatch owstats', desc: 'Look up Overwatch player stats' },
    ],
  },
  {
    title: '🌍 RimWorld',
    color: 0x8b4513,
    commands: [
      { name: '/rimworld event', desc: 'Generate a random RimWorld event' },
      { name: '/rimworld colonytip', desc: 'Get a colony survival tip' },
      { name: '/rimworld scenario', desc: 'Generate a random scenario challenge' },
      { name: '/rimworld seed', desc: 'Get or share a RimWorld map seed' },
    ],
  },
  {
    title: '📢 Admin',
    color: 0x95a5a6,
    commands: [
      { name: '/announce', desc: '(Admin) Post a formatted announcement embed to any channel' },
      { name: '/give', desc: '(Admin) Add or remove coins from a user' },
      { name: '/setdaily', desc: '(Admin) Set the daily reward amount for a role, or reset someone\'s cooldown' },
      { name: '/givejackpot', desc: '(Admin) Claim the entire jackpot pool' },
      { name: '/shopmanage', desc: '(Admin) Add/remove items from the server shop' },
      { name: '/lotteryadmin draw', desc: '(Owner) Draw a lottery winner and pay out the pool' },
      { name: '/lotteryadmin seed', desc: '(Owner) Add coins to the lottery prize pool' },
      { name: '/lotteryadmin setup', desc: '(Owner) Set the lottery ticket price' },
    ],
  },
  {
    title: '😄 Fun',
    color: 0x2ecc71,
    commands: [
      { name: '/compliment', desc: 'Send someone a compliment' },
      { name: '/insult', desc: 'Send someone a playful insult' },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all commands grouped by category')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Show only one category')
        .addChoices(
          { name: 'Economy', value: 'economy' },
          { name: 'Gambling', value: 'gambling' },
          { name: 'Slay the Spire', value: 'sts' },
          { name: 'Games', value: 'games' },
          { name: 'RimWorld', value: 'rimworld' },
          { name: 'Fun', value: 'fun' },
          { name: 'Admin', value: 'admin' }
        )
    ),

  async execute(interaction) {
    const filter = interaction.options.getString('category');

    const categoryMap = {
      economy: 0,
      gambling: 1,
      sts: 2,
      games: 3,
      rimworld: 4,
      admin: 5,
      fun: 6,
    };

    const sections = filter !== null ? [SECTIONS[categoryMap[filter]]] : SECTIONS;

    const embeds = sections.map(section =>
      new EmbedBuilder()
        .setColor(section.color)
        .setTitle(section.title)
        .setDescription(
          section.commands.map(c => `**${c.name}** — ${c.desc}`).join('\n')
        )
    );

    // Gambling section gets a footer tip
    if (!filter || filter === 'gambling') {
      const gamblingEmbed = embeds[filter ? 0 : 1];
      gamblingEmbed.setFooter({ text: 'All gambling commands have a 10s cooldown. Win streaks give up to +50% bonus. 10% of every loss feeds the jackpot.' });
    }

    await interaction.reply({ embeds, flags: 64 });
  },
};
