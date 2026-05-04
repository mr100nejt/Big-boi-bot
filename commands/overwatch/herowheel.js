const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { randomHero, HEROES } = require('../../data/ow-heroes');

const ROLE_COLORS = { tank: 0x5865f2, damage: 0xed4245, support: 0x57f287, any: 0xf5c518 };

function getRoleForHero(hero) {
  for (const [role, list] of Object.entries(HEROES)) {
    if (list.includes(hero)) return role;
  }
  return 'any';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('herowheel')
    .setDescription('OW: spin the hero wheel')
    .addStringOption(opt =>
      opt.setName('role').setDescription('Restrict to a role (optional)').setRequired(false)
        .addChoices(
          { name: 'Any', value: 'any' },
          { name: 'Tank', value: 'tank' },
          { name: 'Damage', value: 'damage' },
          { name: 'Support', value: 'support' }
        )
    )
    .addUserOption(opt =>
      opt.setName('target').setDescription('Spin for another user').setRequired(false)
    ),

  async execute(interaction) {
    const role = interaction.options.getString('role') ?? 'any';
    const target = interaction.options.getUser('target') ?? interaction.user;
    const hero = randomHero(role === 'any' ? null : role);
    const heroRole = getRoleForHero(hero);

    const embed = new EmbedBuilder()
      .setColor(ROLE_COLORS[heroRole])
      .setTitle('🎡 Hero Wheel')
      .setDescription(`${target} plays **${hero}**!`)
      .setFooter({ text: `Role: ${heroRole.charAt(0).toUpperCase() + heroRole.slice(1)}` });

    await interaction.reply({ embeds: [embed] });
  }
};
