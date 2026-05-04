const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setDailyRole, removeDailyRole, getDailyRoles } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdaily')
    .setDescription('Admin: configure daily payout per role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set daily payout for a role')
        .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Coins per day').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove daily payout for a role')
        .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all role daily payouts')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'set') {
      const role = interaction.options.getRole('role');
      const amount = interaction.options.getInteger('amount');
      setDailyRole(guildId, role.id, amount);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Set daily payout for ${role} to **${amount.toLocaleString()} coins**.`)] });

    } else if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      removeDailyRole(guildId, role.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`🔻 Removed daily payout for ${role}.`)] });

    } else if (sub === 'list') {
      const roles = getDailyRoles(guildId);
      if (roles.length === 0) {
        return interaction.reply({ content: 'No role daily payouts configured. Default is **100 coins**.', ephemeral: true });
      }
      const lines = roles.map(r => `<@&${r.role_id}> → **${r.amount.toLocaleString()} coins**`).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Daily Role Payouts').setDescription(lines)] });
    }
  }
};
