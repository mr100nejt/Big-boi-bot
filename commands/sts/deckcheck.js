const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ask } = require('../../utils/llm');

const SYSTEM = `You are an expert Slay the Spire player. When given a deck list, provide concise advice:
- Top 2-3 synergies present
- 1-2 cards to cut if the deck is bloated
- 1 key relic or upgrade that would elevate this deck
Keep your response under 300 words. Use plain text, no markdown headers.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deckcheck')
    .setDescription('STS: describe your deck and get synergy/cut advice')
    .addStringOption(opt =>
      opt.setName('deck').setDescription('List your cards (e.g. "Shiv x3, Accuracy, Blur, Footwork...")').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('character').setDescription('Your character').setRequired(false)
        .addChoices(
          { name: 'Ironclad', value: 'Ironclad' },
          { name: 'Silent', value: 'Silent' },
          { name: 'Defect', value: 'Defect' },
          { name: 'Watcher', value: 'Watcher' }
        )
    )
    .addStringOption(opt =>
      opt.setName('relics').setDescription('Your current relics (optional)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const deck = interaction.options.getString('deck');
    const character = interaction.options.getString('character') ?? 'Unknown character';
    const relics = interaction.options.getString('relics') ?? 'none listed';

    const userMsg = `Character: ${character}\nDeck: ${deck}\nRelics: ${relics}`;

    try {
      const advice = await ask(SYSTEM, userMsg);
      const embed = new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle('🃏 Deck Analysis')
        .setDescription(advice)
        .setFooter({ text: `${character} • Powered by Llama 3.3` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('deckcheck LLM error:', err);
      await interaction.editReply('The LLM is unavailable right now. Try again in a moment.');
    }
  }
};
