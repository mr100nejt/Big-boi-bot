const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CHARACTERS = [
  {
    name: 'Necrobinder',
    description: 'A dark summoner who binds the dead to fight alongside them.',
    color: 0x4b0082,
    emoji: '💀',
    playstyle: 'Summon and empower undead minions. Resource management and sacrifice synergies.',
  },
  {
    name: 'Ironclad',
    description: 'A mercenary haunted by his past. Wields strength and fire to overwhelm enemies.',
    color: 0xb22222,
    emoji: '⚔️',
    playstyle: 'Aggressive, high-damage builds. Strength scaling, exhaust synergies.',
  },
  {
    name: 'Regent',
    description: 'A noble ruler who commands allies and controls the battlefield through authority.',
    color: 0xffd700,
    emoji: '👑',
    playstyle: 'Ally and buff management. Scaling through control and resource generation.',
  },
  {
    name: 'Defect',
    description: 'A defective automaton that harnesses the power of orbs.',
    color: 0x4169e1,
    emoji: '🤖',
    playstyle: 'Orb channeling (Lightning, Frost, Dark, Plasma). Focus scaling.',
  },
  {
    name: 'Silent',
    description: 'A deadly huntress who poisons and evades her way to victory.',
    color: 0x228b22,
    emoji: '🗡️',
    playstyle: 'Poison stacking, shivs, and discard synergies.',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stscharacter')
    .setDescription('STS2: randomly pick a Slay the Spire 2 character for your next run'),

  async execute(interaction) {
    const pick = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

    const embed = new EmbedBuilder()
      .setColor(pick.color)
      .setTitle(`${pick.emoji} Your Character: **${pick.name}**`)
      .setDescription(pick.description)
      .addFields({ name: 'Playstyle', value: pick.playstyle })
      .setFooter({ text: 'No re-rolls. Go make it work.' });

    await interaction.reply({ embeds: [embed] });
  },
};
