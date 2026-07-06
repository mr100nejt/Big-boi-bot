const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addBalance } = require('../../utils/currency');
const {
  ensureLottery, getLottery, setLotteryTicketPrice,
  addToLotteryPool, resetLottery, getAllLotteryTickets, drawLotteryWinner,
} = require('../../utils/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lotteryadmin')
    .setDescription('Owner: manage the server lottery')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('draw').setDescription('Draw a winner and pay out the prize pool')
    )
    .addSubcommand(sub =>
      sub.setName('seed')
        .setDescription('Add coins to the prize pool')
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Coins to add').setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set the ticket price')
        .addIntegerOption(opt =>
          opt.setName('price').setDescription('Cost per ticket in coins').setRequired(true).setMinValue(1)
        )
    ),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'Only the server owner can use this.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'draw') {
      const lottery = getLottery(guildId);
      if (!lottery || lottery.prize_pool <= 0) {
        return interaction.reply({ content: 'The prize pool is empty. Use `/lotteryadmin seed` first.', flags: 64 });
      }

      const allTickets = getAllLotteryTickets(guildId);
      if (!allTickets.length) {
        return interaction.reply({ content: 'No tickets have been sold yet.', flags: 64 });
      }

      const winnerId = drawLotteryWinner(guildId);
      const prize = lottery.prize_pool;

      addBalance(winnerId, guildId, prize);
      resetLottery(guildId);

      let winnerTag = `<@${winnerId}>`;
      try {
        const member = await interaction.guild.members.fetch(winnerId);
        winnerTag = `**${member.user.username}** (<@${winnerId}>)`;
      } catch { /* user may have left */ }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🎉 LOTTERY WINNER!')
            .setDescription(`${winnerTag} wins the lottery!`)
            .addFields(
              { name: '💰 Prize',        value: `${prize.toLocaleString()} coins`,                              inline: true },
              { name: '🎟️ Total Tickets', value: `${allTickets.reduce((s, r) => s + r.quantity, 0)}`,           inline: true },
            )
            .setFooter({ text: 'Lottery has been reset for the next round.' }),
        ],
      });
    }

    if (sub === 'seed') {
      const amount = interaction.options.getInteger('amount');
      ensureLottery(guildId);
      addToLotteryPool(guildId, amount);
      const lottery = getLottery(guildId);

      return interaction.reply({
        content: `Added **${amount.toLocaleString()} coins** to the prize pool. New total: **${lottery.prize_pool.toLocaleString()} coins**.`,
        flags: 64,
      });
    }

    if (sub === 'setup') {
      const price = interaction.options.getInteger('price');
      ensureLottery(guildId);
      setLotteryTicketPrice(guildId, price);

      return interaction.reply({
        content: `Ticket price set to **${price.toLocaleString()} coins** per ticket.`,
        flags: 64,
      });
    }
  },
};
