const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addBalance, removeBalance, getBalance } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Admin: give or remove coins from a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Target user').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount (negative to remove)').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guildId;

    if (amount < 0) {
      removeBalance(target.id, guildId, Math.abs(amount));
    } else {
      addBalance(target.id, guildId, amount);
    }

    const newBalance = getBalance(target.id, guildId);
    const action = amount < 0 ? 'removed' : 'added';

    const embed = new EmbedBuilder()
      .setColor(amount < 0 ? 0xed4245 : 0x57f287)
      .setDescription(`${action === 'added' ? '✅' : '🔻'} **${Math.abs(amount).toLocaleString()} coins** ${action} for ${target}.\nNew balance: **${newBalance.toLocaleString()} coins**`);

    await interaction.reply({ embeds: [embed] });
  }
};
