const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, removeBalance, getLoan, repayLoan } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repay')
    .setDescription('Pay back your loan to Big Boi Bot')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Amount to repay (omit to pay everything you owe)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const loan = getLoan(userId, guildId);

    if (loan.owed <= 0) {
      return interaction.reply({
        content: "You don't owe Big Boi Bot anything. You're clean.",
        flags: 64,
      });
    }

    const balance = getBalance(userId, guildId);
    const requested = interaction.options.getInteger('amount') ?? loan.owed;
    const paying = Math.min(requested, loan.owed, balance);

    if (paying <= 0) {
      return interaction.reply({
        content: `You don't have enough coins to repay. Your balance: **${balance.toLocaleString()}**. You owe: **${loan.owed.toLocaleString()}**.`,
        flags: 64,
      });
    }

    removeBalance(userId, guildId, paying);
    repayLoan(userId, guildId, paying);

    const remainingDebt = Math.max(0, loan.owed - paying);
    const newBalance = getBalance(userId, guildId);
    const paidOff = remainingDebt === 0;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(paidOff ? 0x57f287 : 0xf5c518)
          .setTitle(paidOff ? '✅ Debt Cleared' : '💸 Partial Repayment')
          .setDescription(
            paidOff
              ? "Big Boi Bot nods slowly. **You're square.** For now."
              : `Payment received. Big Boi Bot is watching.`
          )
          .addFields(
            { name: 'Paid', value: `${paying.toLocaleString()} coins`, inline: true },
            { name: 'Remaining Debt', value: remainingDebt > 0 ? `${remainingDebt.toLocaleString()} coins` : 'None', inline: true },
            { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
          )
          .setFooter({ text: paidOff ? 'Stay out of trouble.' : 'Use /repay again to keep chipping away.' }),
      ],
    });
  },
};
