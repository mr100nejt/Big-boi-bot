const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { randomChallenge, randomHero, randomMap } = require('../../data/ow-heroes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owchallenge')
    .setDescription('OW: generate a random challenge for yourself or another player')
    .addUserOption(opt =>
      opt.setName('target').setDescription('Assign to another player').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target') ?? interaction.user;
    const challenge = randomChallenge();
    const hero = randomHero();
    const map = randomMap();

    const embed = new EmbedBuilder()
      .setColor(0xf99e1a)
      .setTitle('⚔️ OW Challenge')
      .setDescription(`${target}'s challenge:`)
      .addFields(
        { name: 'Challenge', value: challenge, inline: false },
        { name: 'Suggested Hero', value: hero, inline: true },
        { name: 'Map', value: map, inline: true }
      )
      .setFooter({ text: 'Good luck. You\'ll need it.' });

    await interaction.reply({ embeds: [embed] });
  }
};
