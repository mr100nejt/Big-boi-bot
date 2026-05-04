const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { randomScenario } = require('../../data/rimworld-data');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rwscenario')
    .setDescription('Rimworld: generate a random challenge run scenario'),

  async execute(interaction) {
    const scenario = randomScenario();

    const embed = new EmbedBuilder()
      .setColor(0x8b4513)
      .setTitle(`🎲 Challenge Scenario: ${scenario.title}`)
      .setDescription(scenario.desc)
      .setFooter({ text: 'Randy Random is watching.' });

    await interaction.reply({ embeds: [embed] });
  }
};
