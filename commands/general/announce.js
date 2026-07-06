const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post an announcement embed to a channel')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('title').setDescription('Announcement title').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Announcement body').setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to post in (defaults to current channel)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('color').setDescription('Embed color').setRequired(false)
        .addChoices(
          { name: '🟢 Green — New Feature', value: 'green' },
          { name: '🔵 Blue — Update',       value: 'blue'  },
          { name: '🟡 Yellow — Notice',     value: 'yellow' },
          { name: '🔴 Red — Fix',           value: 'red'   },
        )
    ),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'Only the server owner can use this.', flags: 64 });
    }

    const title       = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const target      = interaction.options.getChannel('channel') ?? interaction.channel;
    const colorKey    = interaction.options.getString('color') ?? 'green';

    const COLORS = { green: 0x57f287, blue: 0x3498db, yellow: 0xf1c40f, red: 0xed4245 };

    const embed = new EmbedBuilder()
      .setColor(COLORS[colorKey])
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: `Posted by ${interaction.user.username}` });

    try {
      await target.send({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: `I don't have permission to post in ${target}.`, flags: 64 });
    }

    const confirmed = target.id === interaction.channelId
      ? 'Announcement posted!'
      : `Announcement posted in ${target}.`;

    await interaction.reply({ content: confirmed, flags: 64 });
  },
};
