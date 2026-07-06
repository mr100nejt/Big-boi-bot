const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getJackpot, claimJackpot, addBalance, getBalance } = require('../../utils/currency');
const { safeDefer } = require('../../utils/interact');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('givejackpot')
    .setDescription('Claim the entire jackpot pot (admin only)')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await safeDefer(interaction);

    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const pot = getJackpot(guildId);
    if (pot <= 0) {
      return interaction.editReply('The jackpot pot is empty.');
    }

    claimJackpot(guildId);
    addBalance(userId, guildId, pot);

    const newBalance = getBalance(userId, guildId);
    return interaction.editReply(
      `💰 Jackpot claimed! **+${pot.toLocaleString()} coins** added to your balance.\nNew balance: **${newBalance.toLocaleString()} coins**`
    );
  },
};
