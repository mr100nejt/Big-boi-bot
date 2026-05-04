const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to check (admin only)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const balance = getBalance(target.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0xf5c518)
      .setTitle(`${target.username}'s Balance`)
      .setDescription(`**${balance.toLocaleString()} coins**`)
      .setThumbnail(target.displayAvatarURL());

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
