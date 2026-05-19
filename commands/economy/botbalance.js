const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botbalance')
    .setDescription("Check the bot's coin balance (house funds)"),

  async execute(interaction) {
    const bot = interaction.client.user;
    const balance = getBalance(bot.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('House Balance')
      .setDescription(`**${balance.toLocaleString()} coins**`)
      .setThumbnail(bot.displayAvatarURL())
      .setFooter({ text: 'Funded by your losses 😈' });

    await interaction.reply({ embeds: [embed] });
  }
};
