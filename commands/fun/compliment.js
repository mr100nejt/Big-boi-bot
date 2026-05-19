const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const COMPLIMENTS = [
  'has the game sense of a grandmaster Reinhardt main.',
  'could draft a winning STS deck blindfolded.',
  'keeps the colony alive when everyone else would have rage quit.',
  'is the Ana player that actually hits their sleep darts.',
  'has the strategic mind of a 20-win Ironclad run.',
  'single-handedly carries harder than a 6-stack Zarya bubble.',
  'is the reason the colony survived that raid.',
  'plays better than most people who stream for a living.',
  'has the mechanical skill of a Diamond Genji and the IQ of a pro coach.',
  'is built different — like a Barricade Impervious Ironclad.',
  'could talk Randy Random into giving good events.',
  'has never made a bad decision in their life, in-game or otherwise.',
  'is the Limit Break to everyone else\'s base Strength.',
  'is genuinely cracked and everyone knows it.',
  'would win a run with a starter deck and no relics.',
  'is the kind of teammate that makes you queue again immediately.',
  'has the calmest Watcher energy of anyone in this server.',
  'could out-macro a pro RimWorld streamer with one hand.',
  'is so good it should be considered a relic in itself.',
  'makes every comp better just by being in the lobby.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Shower someone with a well-deserved compliment')
    .addUserOption(opt =>
      opt.setName('target').setDescription('Who deserves the love?').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`<@${target.id}> ${compliment}`)
      .setFooter({ text: `From: ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  }
};
//todo wateer check