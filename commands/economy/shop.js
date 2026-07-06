const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, removeBalance, addBalance } = require('../../utils/currency');
const { getShopItems, getItemByName, getInventory, addToInventory, activateItem } = require('../../utils/shop');

const TYPE_LABELS = {
  role:             '🎖️ Role',
  streak_shield:    '🛡️ Streak Shield',
  daily_boost:      '⚡ Daily Boost',
  lucky_charm:      '🍀 Lucky Charm',
  insurance_policy: '🏦 Insurance',
  payday:           '💰 Payday',
};

// Types that require manual arming via /shop use before they fire in games
const MANUAL_TYPES = new Set(['lucky_charm', 'insurance_policy', 'payday']);

const ITEM_DESCRIPTIONS = {
  lucky_charm:      (v) => 'When armed, re-rolls once if you lose your next gambling game.',
  insurance_policy: (v) => `When armed, refunds **${Math.round((v ?? 0.5) * 100)}%** of your next gambling loss.`,
  payday:           (v) => `When armed, adds **+${Math.round(((v ?? 1.5) - 1) * 100)}%** bonus to your next gambling win.`,
  streak_shield:    (v) => 'Auto-fires the next time you lose a gambling game, protecting your win streak.',
  daily_boost:      (v) => `Auto-fires on your next \`/daily\`, multiplying your payout by **${v ?? 2}x**.`,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse and buy items from the server shop')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Browse all available items')
    )
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Purchase an item from the shop')
        .addStringOption(opt =>
          opt.setName('item').setDescription('Item to buy').setRequired(true).setAutocomplete(true)
        )
        .addUserOption(opt =>
          opt.setName('for').setDescription('Buy this item as a gift for another user').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('inventory').setDescription('View items you own')
    )
    .addSubcommand(sub =>
      sub.setName('use')
        .setDescription('Use a consumable item from your inventory')
        .addStringOption(opt =>
          opt.setName('item').setDescription('Item to use').setRequired(true).setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    const focused = interaction.options.getFocused().toLowerCase();
    const guildId = interaction.guildId;

    if (sub === 'buy') {
      const items = getShopItems(guildId);
      const matches = items.filter(i => i.name.toLowerCase().includes(focused));
      await interaction.respond(
        matches.slice(0, 25).map(i => ({ name: `${i.name} — ${i.price.toLocaleString()} coins`, value: i.name }))
      );
    } else if (sub === 'use') {
      const userId = interaction.user.id;
      const owned = getInventory(userId, guildId).filter(i => i.type !== 'role');
      const matches = owned.filter(i => i.name.toLowerCase().includes(focused));
      await interaction.respond(
        matches.slice(0, 25).map(i => ({ name: `${i.name} (x${i.quantity})`, value: i.name }))
      );
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (sub === 'list') {
      const items = getShopItems(guildId);
      if (!items.length) {
        return interaction.reply({ content: 'The shop is empty. Ask an admin to add items with `/shopmanage`.', flags: 64 });
      }

      const lines = items.map(i => {
        let label = TYPE_LABELS[i.type] ?? i.type;
        if (i.type === 'role' && i.exclusive) label += ' 🔒 Exclusive';
        return `**${i.name}** — ${i.price.toLocaleString()} coins\n${label} | *${i.description}*`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🛒 Server Shop')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Use /shop buy <item> to purchase' });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'buy') {
      const name = interaction.options.getString('item');
      const item = getItemByName(guildId, name);
      if (!item) return interaction.reply({ content: `No item named **${name}** found in the shop.`, flags: 64 });

      const balance = getBalance(userId, guildId);
      if (balance < item.price) {
        return interaction.reply({
          content: `You need **${item.price.toLocaleString()} coins** but only have **${balance.toLocaleString()}**.`,
          flags: 64,
        });
      }

      const giftUser = interaction.options.getUser('for');
      const isGift = giftUser !== null && giftUser.id !== userId;

      if (item.type === 'role') {
        if (!item.role_id) return interaction.reply({ content: 'This item has no role configured. Contact an admin.', flags: 64 });

        // Resolve the recipient
        let recipientMember;
        try {
          recipientMember = giftUser ? await interaction.guild.members.fetch(giftUser.id) : interaction.member;
        } catch {
          return interaction.reply({ content: 'Could not find that user in this server.', flags: 64 });
        }

        if (recipientMember.roles.cache.has(item.role_id)) {
          const who = isGift ? `**${recipientMember.user.username}** already has` : 'You already have';
          return interaction.reply({ content: `${who} the **${item.name}** role.`, flags: 64 });
        }

        let role;
        try {
          role = await interaction.guild.roles.fetch(item.role_id);
        } catch {
          return interaction.reply({ content: 'Could not find that role. Contact an admin.', flags: 64 });
        }

        // Exclusive: strip the role from any current holders
        const strippedUsers = [];
        if (item.exclusive) {
          for (const [memberId, m] of role.members) {
            if (memberId !== recipientMember.id) {
              try {
                await m.roles.remove(role);
                strippedUsers.push(m.user.username);
              } catch {}
            }
          }
        }

        try {
          await recipientMember.roles.add(role);
        } catch {
          return interaction.reply({ content: "I don't have permission to assign that role. Make sure my role is above it.", flags: 64 });
        }

        removeBalance(userId, guildId, item.price);
        const newBalance = getBalance(userId, guildId);

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle(isGift ? '🎁 Role Gifted!' : '🎖️ Role Purchased!')
          .addFields(
            { name: 'Role', value: `<@&${role.id}>`, inline: true },
            { name: isGift ? 'Given To' : 'Paid', value: isGift ? `<@${recipientMember.id}>` : `${item.price.toLocaleString()} coins`, inline: true },
            { name: isGift ? 'Paid By You' : 'Balance', value: isGift ? `${item.price.toLocaleString()} coins` : `${newBalance.toLocaleString()} coins`, inline: true },
          );

        if (isGift) embed.addFields({ name: 'Your Balance', value: `${newBalance.toLocaleString()} coins`, inline: true });
        if (strippedUsers.length) embed.addFields({ name: '🔒 Transferred From', value: strippedUsers.join(', '), inline: false });

        return interaction.reply({ embeds: [embed] });
      }

      // Consumable / buff item
      const recipientId = giftUser ? giftUser.id : userId;
      removeBalance(userId, guildId, item.price);
      addToInventory(recipientId, guildId, item.id);
      const newBalance = getBalance(userId, guildId);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(isGift ? '🎁 Item Gifted!' : '✅ Purchased!')
        .addFields(
          { name: 'Item', value: item.name, inline: true },
          { name: 'Paid', value: `${item.price.toLocaleString()} coins`, inline: true },
          { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
          { name: 'Description', value: item.description, inline: false },
        )
        .setFooter({ text: MANUAL_TYPES.has(item.type) ? 'Run /shop use to arm this item before it will fire.' : 'This item activates automatically when triggered.' });

      if (isGift) embed.addFields({ name: 'Gifted To', value: `<@${giftUser.id}>`, inline: true });

      return interaction.reply({
        embeds: [embed],
        flags: 64,
      });
    }

    if (sub === 'inventory') {
      const owned = getInventory(userId, guildId);
      if (!owned.length) {
        return interaction.reply({ content: "You don't own any items. Visit `/shop list` to browse!", flags: 64 });
      }

      const lines = owned.map(i => {
        const label = TYPE_LABELS[i.type] ?? i.type;
        if (i.type === 'role') return `**${i.name}** — ${label}\n*${i.description}*`;

        const isManual = MANUAL_TYPES.has(i.type);
        if (isManual) {
          const inactive = i.quantity - i.active;
          const statusParts = [];
          if (i.active > 0) statusParts.push(`🟢 ${i.active} armed`);
          if (inactive > 0) statusParts.push(`⚪ ${inactive} inactive`);
          return `**${i.name}** (x${i.quantity}) — ${label}\n${statusParts.join(', ')} | *Use \`/shop use\` to arm* | *${i.description}*`;
        }
        return `**${i.name}** (x${i.quantity}) — ${label}\n🔄 Auto-fires next trigger | *${i.description}*`;
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🎒 Your Inventory')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: 'Armed items fire automatically when triggered in-game. Use /shop use to arm.' }),
        ],
        flags: 64,
      });
    }

    if (sub === 'use') {
      const name = interaction.options.getString('item');
      const item = getItemByName(guildId, name);
      if (!item) return interaction.reply({ content: `No item named **${name}** found.`, flags: 64 });
      if (item.type === 'role') return interaction.reply({ content: 'Roles are applied automatically on purchase — nothing to activate.', flags: 64 });

      const owned = getInventory(userId, guildId).find(i => i.id === item.id);
      if (!owned || owned.quantity <= 0) return interaction.reply({ content: `You don't own **${item.name}**.`, flags: 64 });

      // Manual-arm types: require /shop use to become active
      if (MANUAL_TYPES.has(item.type)) {
        if (owned.active >= owned.quantity) {
          return interaction.reply({
            content: `All ${owned.quantity} cop${owned.quantity === 1 ? 'y' : 'ies'} of **${item.name}** are already armed and ready to fire.`,
            flags: 64,
          });
        }
        const armed = activateItem(userId, guildId, item.id);
        if (!armed) return interaction.reply({ content: 'Could not arm that item.', flags: 64 });

        const newActive = owned.active + 1;
        const desc = ITEM_DESCRIPTIONS[item.type]?.(item.value) ?? item.description;

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle(`✅ ${item.name} Armed!`)
              .setDescription(desc)
              .addFields({ name: 'Armed', value: `${newActive} / ${owned.quantity}`, inline: true }),
          ],
          flags: 64,
        });
      }

      // Auto-consume types: explain how they work
      const desc = ITEM_DESCRIPTIONS[item.type]?.(item.value) ?? item.description;
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`${TYPE_LABELS[item.type] ?? item.type} — ${item.name}`)
            .setDescription(desc)
            .addFields({ name: 'Owned', value: `x${owned.quantity}`, inline: true })
            .setFooter({ text: 'This item activates automatically — no action needed.' }),
        ],
        flags: 64,
      });
    }
  },
};
