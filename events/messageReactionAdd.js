const { EmbedBuilder } = require('discord.js');
const { getBalance, removeBalance, addBalance } = require('../utils/currency');

const TIP_EMOJIS = {
  '💎': 100000,
  '💰': 1000,
  '🪙': 100,
  '💸': 10,
};

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;

    console.log('[reaction] emoji name:', JSON.stringify(reaction.emoji.name), '| user:', user.id);

    const amount = TIP_EMOJIS[reaction.emoji.name];
    if (!amount) return;

    // Resolve partials
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }
    if (user.partial) {
      try { await user.fetch(); } catch { return; }
    }

    const message = reaction.message;
    const guildId = message.guildId;
    if (!guildId) return; // DMs

    const recipient = message.author;
    if (!recipient) return;
    if (recipient.id === user.id) return;

    const balance = getBalance(user.id, guildId);

    if (balance < amount) {
      try {
        await message.channel.send({
          content: `<@${user.id}> You need **${amount.toLocaleString()} coins** to tip ${reaction.emoji.name} but only have **${balance.toLocaleString()}**.`,
        });
      } catch { /* channel not writable */ }
      return;
    }

    removeBalance(user.id, guildId, amount);
    addBalance(recipient.id, guildId, amount);

    const newBalance = getBalance(user.id, guildId);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`${reaction.emoji.name} Tip Sent!`)
      .addFields(
        { name: 'From',         value: `<@${user.id}>`,                   inline: true },
        { name: 'To',           value: `<@${recipient.id}>`,              inline: true },
        { name: 'Amount',       value: `${amount.toLocaleString()} coins`, inline: true },
        { name: 'Your Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
      );

    try {
      await message.channel.send({ embeds: [embed] });
    } catch { /* channel not writable */ }
  },
};
