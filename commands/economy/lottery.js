const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, removeBalance } = require('../../utils/currency');
const {
  ensureLottery, getLottery,
  getLotteryTickets, addLotteryTickets, getAllLotteryTickets, addToLotteryPool,
} = require('../../utils/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lottery')
    .setDescription('Server lottery — buy tickets for a chance at the prize pool')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Buy lottery tickets')
        .addIntegerOption(opt =>
          opt.setName('tickets').setDescription('Number of tickets to buy').setRequired(true).setMinValue(1).setMaxValue(100)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check the current lottery prize pool and your tickets')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === 'buy') {
      const lottery = ensureLottery(guildId);
      const qty = interaction.options.getInteger('tickets');
      const total = lottery.ticket_price * qty;
      const balance = getBalance(userId, guildId);

      if (balance < total) {
        return interaction.reply({
          content: `${qty} ticket${qty !== 1 ? 's' : ''} costs **${total.toLocaleString()} coins** but you only have **${balance.toLocaleString()}**.`,
          flags: 64,
        });
      }

      removeBalance(userId, guildId, total);
      addToLotteryPool(guildId, total);
      addLotteryTickets(guildId, userId, qty);

      const myTickets = getLotteryTickets(guildId, userId);
      const allTickets = getAllLotteryTickets(guildId);
      const totalTickets = allTickets.reduce((s, r) => s + r.quantity, 0);
      const winChance = totalTickets > 0 ? Math.round((myTickets / totalTickets) * 100) : 0;
      const updatedLottery = getLottery(guildId);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('🎟️ Tickets Purchased!')
            .addFields(
              { name: 'Bought',      value: `${qty} ticket${qty !== 1 ? 's' : ''}`,          inline: true },
              { name: 'Paid',        value: `${total.toLocaleString()} coins`,                 inline: true },
              { name: 'Your Tickets', value: `${myTickets} (${winChance}% win chance)`,        inline: true },
              { name: 'Prize Pool',  value: `${updatedLottery.prize_pool.toLocaleString()} coins`, inline: true },
            ),
        ],
      });
    }

    if (sub === 'status') {
      const lottery = ensureLottery(guildId);
      const myTickets = getLotteryTickets(guildId, userId);
      const allTickets = getAllLotteryTickets(guildId);
      const totalTickets = allTickets.reduce((s, r) => s + r.quantity, 0);
      const winChance = totalTickets > 0 && myTickets > 0 ? Math.round((myTickets / totalTickets) * 100) : 0;

      const topHolders = [...allTickets]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((r, i) => `${i + 1}. <@${r.user_id}> — ${r.quantity} ticket${r.quantity !== 1 ? 's' : ''}`)
        .join('\n') || 'No tickets sold yet';

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🎰 Server Lottery')
            .addFields(
              { name: '💰 Prize Pool',   value: `${lottery.prize_pool.toLocaleString()} coins`,  inline: true },
              { name: '🎟️ Ticket Price', value: `${lottery.ticket_price.toLocaleString()} coins`, inline: true },
              { name: '🎫 Total Tickets', value: `${totalTickets}`,                               inline: true },
              { name: '🎯 Your Tickets', value: myTickets > 0 ? `${myTickets} (${winChance}% chance)` : 'None — buy with `/lottery buy`', inline: false },
              { name: '🏆 Top Holders',  value: topHolders,                                       inline: false },
            )
            .setFooter({ text: 'Admin draws the winner with /lotteryadmin draw' }),
        ],
      });
    }
  },
};
