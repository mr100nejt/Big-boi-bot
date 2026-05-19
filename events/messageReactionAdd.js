const { EmbedBuilder } = require('discord.js');
const { getBalance, removeBalance, addBalance } = require('../utils/currency');

const TIP_TIERS = {
  '💵': 1,
  '🪙': 10,
  '💰': 100,
};

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;

    const amount = TIP_TIERS[reaction.emoji.name];
    if (!amount) return;

    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }

    const message = reaction.message;
    const recipient = message.author;
    if (!recipient) return;
    if (recipient.id === user.id) return;

    const guildId = message.guildId;
    const tipperBalance = getBalance(user.id, guildId);

    if (tipperBalance < amount) {
      try {
        await message.channel.send({
          content: `${user}, you don't have enough coins to tip (need **${amount}**, have **${tipperBalance}**).`,
        });
      } catch { /* channel gone */ }
      return;
    }

    removeBalance(user.id, guildId, amount);
    addBalance(recipient.id, guildId, amount);

    const recipientNewBalance = getBalance(recipient.id, guildId);
    const isBot = recipient.bot;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setDescription(
        `${reaction.emoji.name} ${user} tipped ${recipient} **${amount} coin${amount !== 1 ? 's' : ''}**!\n` +
        `${isBot ? 'House' : recipient.username} balance: **${recipientNewBalance.toLocaleString()} coins**`
      );

    try {
      await message.channel.send({ embeds: [embed] });
    } catch { /* channel gone */ }
  }
};
