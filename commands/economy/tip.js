const {
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getBalance, removeBalance, addBalance } = require('../../utils/currency');

async function processTip(interaction, fromUserId, toUserId, amount, guildId) {
  if (isNaN(amount) || amount < 1) {
    return interaction.reply({ content: 'Tip amount must be at least 1 coin.', flags: 64 });
  }

  const balance = getBalance(fromUserId, guildId);
  if (amount > balance) {
    return interaction.reply({ content: `You only have **${balance.toLocaleString()} coins**.`, flags: 64 });
  }

  removeBalance(fromUserId, guildId, amount);
  addBalance(toUserId, guildId, amount);

  const newBalance = getBalance(fromUserId, guildId);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Tip Sent!')
        .addFields(
          { name: 'To', value: `<@${toUserId}>`, inline: true },
          { name: 'Amount', value: `${amount.toLocaleString()} coins`, inline: true },
          { name: 'Your Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
        )
    ]
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Send coins to another user')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Who to tip').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount to tip').setRequired(true).setMinValue(1)
    ),

  contextMenu: new ContextMenuCommandBuilder()
    .setName('Tip')
    .setType(ApplicationCommandType.Message)
    .setDMPermission(false),

  async execute(interaction) {
    const toUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (toUser.id === interaction.user.id) {
      return interaction.reply({ content: "You can't tip yourself.", flags: 64 });
    }
    if (toUser.bot) {
      return interaction.reply({ content: "You can't tip a bot.", flags: 64 });
    }
    await processTip(interaction, interaction.user.id, toUser.id, amount, interaction.guildId);
  },

  async handleContextMenu(interaction) {
    const msg = interaction.targetMessage;
    console.log('[tip] author.bot:', msg.author.bot, '| author.id:', msg.author.id, '| interaction user:', msg.interaction?.user?.id ?? 'none', '| content:', msg.content.slice(0, 100), '| embeds:', msg.embeds.length);
    let recipientId = msg.author.id;
    let recipientName = msg.author.username;

    if (msg.author.bot) {
      // Priority 1: message is a slash command response — interaction.user is who ran the command
      const cmdUser = msg.interaction?.user;
      if (cmdUser && !cmdUser.bot && cmdUser.id !== interaction.user.id) {
        recipientId = cmdUser.id;
        recipientName = cmdUser.username;
      } else {
        // Priority 2: scan content and embeds for raw <@id> mention tokens
        const allText = [
          msg.content,
          ...msg.embeds.flatMap(e => [e.description ?? '', ...e.fields.map(f => f.value)])
        ].join(' ');

        const recipientIdFound = [...allText.matchAll(/<@!?(\d+)>/g)]
          .map(m => m[1])
          .find(id => id !== interaction.user.id && id !== msg.author.id);

        if (!recipientIdFound) {
          return interaction.reply({ content: "Can't tip this message — no user is mentioned in it.", flags: 64 });
        }

        recipientId = recipientIdFound;
        try {
          const member = await interaction.guild.members.fetch(recipientId);
          recipientName = member.user.username;
        } catch {
          recipientName = 'User';
        }
      }
    }

    if (recipientId === interaction.user.id) {
      return interaction.reply({ content: "You can't tip yourself.", flags: 64 });
    }

    const TIP_AMOUNTS = [
      { emoji: '💎', label: '100,000', amount: 100000 },
      { emoji: '💰', label: '1,000',   amount: 1000   },
      { emoji: '🪙', label: '100',     amount: 100    },
      { emoji: '💸', label: '10',      amount: 10     },
    ];

    const row = new ActionRowBuilder().addComponents(
      TIP_AMOUNTS.map(({ emoji, label, amount }) =>
        new ButtonBuilder()
          .setCustomId(`tipbtn_${amount}_${recipientId}`)
          .setLabel(`${emoji} ${label}`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await interaction.reply({
      content: `Tip **${recipientName}**:`,
      components: [row],
      flags: 64,
    });
  },

  async handleButton(interaction) {
    const parts       = interaction.customId.split('_'); // tipbtn_<amount>_<recipientId>
    const amount      = parseInt(parts[1]);
    const recipientId = parts[2];

    await processTip(interaction, interaction.user.id, recipientId, amount, interaction.guildId);
  },

  async handleModal(interaction) {
    const toUserId = interaction.customId.slice('tip_'.length);
    const amount = parseInt(interaction.fields.getTextInputValue('tip_amount'), 10);
    await processTip(interaction, interaction.user.id, toUserId, amount, interaction.guildId);
  },
};
