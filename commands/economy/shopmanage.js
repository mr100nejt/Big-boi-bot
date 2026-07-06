const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getShopItems, getItemByName, addShopItem, removeShopItem } = require('../../utils/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shopmanage')
    .setDescription('Admin: manage the server shop')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('add-role')
        .setDescription('Add a purchasable Discord role to the shop')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to sell').setRequired(true))
        .addIntegerOption(opt => opt.setName('price').setDescription('Cost in coins').setRequired(true).setMinValue(1))
        .addStringOption(opt => opt.setName('name').setDescription('Display name (defaults to role name)').setRequired(false))
        .addStringOption(opt => opt.setName('description').setDescription('Short description shown in shop').setRequired(false))
        .addBooleanOption(opt => opt.setName('exclusive').setDescription('Only one person can hold this role at a time — buying it transfers it').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('add-consumable')
        .setDescription('Add a consumable buff item to the shop')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Type of buff').setRequired(true)
            .addChoices(
              { name: 'Streak Shield — protects win streak on next loss', value: 'streak_shield' },
              { name: 'Daily Boost — multiplies next /daily payout', value: 'daily_boost' },
              { name: 'Lucky Charm — re-rolls once on your next gambling loss', value: 'lucky_charm' },
              { name: 'Insurance Policy — refunds % of your next gambling loss', value: 'insurance_policy' },
              { name: 'Payday — multiplies profit on your next gambling win', value: 'payday' },
            )
        )
        .addStringOption(opt => opt.setName('name').setDescription('Display name in shop').setRequired(true))
        .addIntegerOption(opt => opt.setName('price').setDescription('Cost in coins').setRequired(true).setMinValue(1))
        .addStringOption(opt => opt.setName('description').setDescription('Short description shown in shop').setRequired(true))
        .addNumberOption(opt => opt.setName('multiplier').setDescription('Boost amount: daily_boost 2=2x | insurance 0.5=50% back | payday 1.5=+50% profit').setMinValue(0.01))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove an item from the shop')
        .addStringOption(opt =>
          opt.setName('item').setDescription('Item name to remove').setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all shop items with their IDs')
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const items = getShopItems(interaction.guildId);
    const matches = items.filter(i => i.name.toLowerCase().includes(focused));
    await interaction.respond(
      matches.slice(0, 25).map(i => ({ name: `[${i.id}] ${i.name} — ${i.price.toLocaleString()} coins`, value: i.name }))
    );
  },

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'Only the server owner can use this.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'add-role') {
      const role = interaction.options.getRole('role');
      const price = interaction.options.getInteger('price');
      const name = interaction.options.getString('name') ?? role.name;
      const description = interaction.options.getString('description') ?? `Grants the ${role.name} role`;
      const exclusive = interaction.options.getBoolean('exclusive') ?? false;

      const existing = getItemByName(guildId, name);
      if (existing) return interaction.reply({ content: `An item named **${name}** already exists in the shop.`, flags: 64 });

      addShopItem(guildId, name, description, 'role', price, role.id, 1, exclusive ? 1 : 0);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('✅ Role Added to Shop')
            .addFields(
              { name: 'Name', value: name, inline: true },
              { name: 'Role', value: `<@&${role.id}>`, inline: true },
              { name: 'Price', value: `${price.toLocaleString()} coins`, inline: true },
              { name: 'Exclusive', value: exclusive ? '🔒 Yes — transfers on purchase' : 'No', inline: true },
              { name: 'Description', value: description, inline: false },
            ),
        ],
        flags: 64,
      });
    }

    if (sub === 'add-consumable') {
      const type = interaction.options.getString('type');
      const name = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const description = interaction.options.getString('description');
      const DEFAULTS = { daily_boost: 2, insurance_policy: 0.5, payday: 1.5, streak_shield: 1, lucky_charm: 1 };
      const multiplier = interaction.options.getNumber('multiplier') ?? DEFAULTS[type] ?? 1;

      const existing = getItemByName(guildId, name);
      if (existing) return interaction.reply({ content: `An item named **${name}** already exists in the shop.`, flags: 64 });

      addShopItem(guildId, name, description, type, price, null, multiplier);

      const TYPE_LABEL_MAP = {
        streak_shield: '🛡️ Streak Shield', daily_boost: '⚡ Daily Boost',
        lucky_charm: '🍀 Lucky Charm', insurance_policy: '🏦 Insurance Policy', payday: '💰 Payday',
      };
      const typeLabel = TYPE_LABEL_MAP[type] ?? type;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`✅ ${typeLabel} Added to Shop`)
            .addFields(
              { name: 'Name', value: name, inline: true },
              { name: 'Price', value: `${price.toLocaleString()} coins`, inline: true },
              ...(['daily_boost', 'insurance_policy', 'payday'].includes(type) ? [{
                name: 'Value',
                value: type === 'insurance_policy' ? `${Math.round(multiplier * 100)}% refund` : `${multiplier}x`,
                inline: true,
              }] : []),
              { name: 'Description', value: description, inline: false },
            ),
        ],
        flags: 64,
      });
    }

    if (sub === 'remove') {
      const name = interaction.options.getString('item');
      const item = getItemByName(guildId, name);
      if (!item) return interaction.reply({ content: `No item named **${name}** found in the shop.`, flags: 64 });

      removeShopItem(item.id, guildId);

      return interaction.reply({
        content: `**${item.name}** has been removed from the shop.`,
        flags: 64,
      });
    }

    if (sub === 'list') {
      const items = getShopItems(guildId);
      if (!items.length) {
        return interaction.reply({ content: 'The shop is empty.', flags: 64 });
      }

      const TYPE_LABELS = {
        role:             '🎖️ Role',
        streak_shield:    '🛡️ Shield',
        daily_boost:      '⚡ Boost',
        lucky_charm:      '🍀 Charm',
        insurance_policy: '🏦 Insurance',
        payday:           '💰 Payday',
      };

      const lines = items.map(i => {
        let meta = TYPE_LABELS[i.type] ?? i.type;
        if (i.type !== 'role' && i.value !== 1) meta += ` (${i.value}x)`;
        if (i.type === 'role' && i.exclusive) meta += ' 🔒 Exclusive';
        return `\`#${i.id}\` **${i.name}** — ${i.price.toLocaleString()} coins | ${meta}`;
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🛒 Shop Items (Admin View)')
            .setDescription(lines.join('\n')),
        ],
        flags: 64,
      });
    }
  },
};
