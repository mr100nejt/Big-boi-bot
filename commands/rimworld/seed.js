const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { randomSeed, TAG_COLORS } = require('../../data/rimworld-data');

const TAG_LABELS = {
  'OP':            '⚡ OP',
  'defensive':     '🏰 Defensive',
  'resource-rich': '⛏️ Resource-Rich',
  'balanced':      '⚖️ Balanced',
  'challenge':     '💀 Challenge',
  'fun':           '🎲 Fun',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rwseed')
    .setDescription('Roll a curated RimWorld seed with coordinates and starting tips')
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Filter by seed type')
        .setRequired(false)
        .addChoices(
          { name: '⚡ OP — busted starts',           value: 'OP' },
          { name: '🏰 Defensive — fortress layouts', value: 'defensive' },
          { name: '⛏️ Resource-Rich — ore & power',  value: 'resource-rich' },
          { name: '⚖️ Balanced — good all-rounders', value: 'balanced' },
          { name: '💀 Challenge — hard mode',         value: 'challenge' },
          { name: '🎲 Fun — weird or interesting',   value: 'fun' },
        )
    ),

  async execute(interaction) {
    const filter = interaction.options.getString('filter');
    const seed = randomSeed(filter);

    if (!seed) {
      return interaction.reply({ content: 'No seeds found for that filter.', flags: 64 });
    }

    const color = TAG_COLORS[seed.tag] ?? 0xf5c518;
    const label = TAG_LABELS[seed.tag] ?? seed.tag;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🌍 RimWorld Seed: \`${seed.seed}\``)
      .addFields(
        { name: 'Biome',     value: seed.biome,   inline: true },
        { name: 'Map Size',  value: seed.mapSize,  inline: true },
        { name: 'Type',      value: label,          inline: true },
        { name: 'Coordinates', value: seed.coords, inline: false },
        { name: 'Why it rips', value: seed.why,    inline: false },
      )
      .setFooter({ text: 'Enter the seed exactly as shown — case-sensitive. Good luck, colonist.' });

    await interaction.reply({ embeds: [embed] });
  }
};
