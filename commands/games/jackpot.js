const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getJackpot } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jackpot')
    .setDescription('See the current server jackpot pot')
    .setDMPermission(false),

  async execute(interaction) {
    const amount = getJackpot(interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🏆 Server Jackpot')
      .setDescription(
        amount > 0
          ? `The jackpot is sitting at **${amount.toLocaleString()} coins**.\n\nEvery gambling loss feeds 10% into this pot. Win any gamble with enough luck (0.5% chance) and you'll scoop it all.`
          : 'The jackpot pot is empty. Start gambling to build it up!'
      );

    await interaction.reply({ embeds: [embed] });
  },
};
