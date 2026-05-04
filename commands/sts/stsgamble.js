const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ask } = require('../../utils/llm');
const { getBalance, addBalance, removeBalance } = require('../../utils/currency');

const CHARACTERS = ['Ironclad', 'Silent', 'Defect', 'Watcher'];
const BOSSES = ['Slime Boss', 'The Guardian', 'Hexaghost', 'Bronze Automaton', 'Champ', 'Collector', 'Time Eater', 'Awakened One', 'The Heart'];
const FLOORS = [10, 17, 33, 40, 50];

const SYSTEM = `You are a Slay the Spire narrator. Write a single short paragraph (2-4 sentences) of dramatic flavor text describing a run outcome. Be specific to the character, floor, and boss. Keep it under 100 words. Don't use markdown.`;

const WIN_CHANCE = 0.45;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stsgamble')
    .setDescription('STS: bet coins on a character surviving a random scenario')
    .addStringOption(opt =>
      opt.setName('character').setDescription('Pick your champion').setRequired(true)
        .addChoices(
          { name: 'Ironclad', value: 'Ironclad' },
          { name: 'Silent', value: 'Silent' },
          { name: 'Defect', value: 'Defect' },
          { name: 'Watcher', value: 'Watcher' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const character = interaction.options.getString('character');
    const bet = interaction.options.getInteger('bet');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const balance = getBalance(userId, guildId);

    if (bet > balance) {
      return interaction.editReply(`You only have **${balance.toLocaleString()} coins**. Can't bet ${bet.toLocaleString()}.`);
    }

    const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    const floor = FLOORS[Math.floor(Math.random() * FLOORS.length)];
    const won = Math.random() < WIN_CHANCE;

    const prompt = `Character: ${character}, Floor: ${floor}, Boss: ${boss}, Outcome: ${won ? 'VICTORY' : 'DEFEAT'}`;

    let flavor = won
      ? `${character} emerged victorious against ${boss} on floor ${floor}.`
      : `${character} fell to ${boss} on floor ${floor}.`;

    try {
      flavor = await ask(SYSTEM, prompt, 150);
    } catch (err) {
      console.error('stsgamble LLM error:', err);
    }

    if (won) {
      addBalance(userId, guildId, bet);
    } else {
      removeBalance(userId, guildId, bet);
    }

    const newBalance = getBalance(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setTitle(`${won ? '⚔️ Victory!' : '💀 Defeated!'} — ${character} vs ${boss}`)
      .setDescription(`*${flavor}*`)
      .addFields(
        { name: 'Floor', value: `${floor}`, inline: true },
        { name: won ? 'Won' : 'Lost', value: `${bet.toLocaleString()} coins`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
      )
      .setFooter({ text: `Win chance: 45% | Payout: 2x` });

    await interaction.editReply({ embeds: [embed] });
  }
};
