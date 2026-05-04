const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { randomEvent } = require('../../data/rimworld-data');

const EVENT_COLORS = {
  'Raid!': 0xed4245,
  'Mental Break': 0x9b59b6,
  'Fire!': 0xff6600,
  'Disease Outbreak': 0x57f287,
  'Animal Manhunter': 0xe74c3c,
  'Mechanoid Cluster': 0x95a5a6,
  default: 0xf5c518
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rwevent')
    .setDescription('Rimworld: generate a random colony event'),

  async execute(interaction) {
    const event = randomEvent();
    const color = EVENT_COLORS[event.title] ?? EVENT_COLORS.default;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🌍 ${event.title}`)
      .setDescription(event.desc)
      .setFooter({ text: 'What do you do, colonist?' });

    await interaction.reply({ embeds: [embed] });
  }
};
