const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ask } = require('../../utils/llm');

const SYSTEM = `You are an experienced RimWorld player giving colony advice. When given a situation, provide:
- Immediate priority action
- One thing the player might be overlooking
- A longer-term suggestion if relevant
Keep it under 250 words. Be practical. Plain text only.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('colonytip')
    .setDescription('Rimworld: describe your situation and get colony advice')
    .addStringOption(opt =>
      opt.setName('situation').setDescription('Describe your current colony situation').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('biome').setDescription('Your biome (optional)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('year').setDescription('Year into the run (optional)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const situation = interaction.options.getString('situation');
    const biome = interaction.options.getString('biome') ?? 'unknown';
    const year = interaction.options.getString('year') ?? 'unknown';

    const userMsg = `Situation: ${situation}\nBiome: ${biome}\nYear: ${year}`;

    try {
      const advice = await ask(SYSTEM, userMsg);
      const embed = new EmbedBuilder()
        .setColor(0x8b4513)
        .setTitle('🏠 Colony Advisor')
        .setDescription(advice)
        .setFooter({ text: 'Powered by Llama 3.3' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('colonytip LLM error:', err);
      await interaction.editReply('The LLM is unavailable right now. Try again in a moment.');
    }
  }
};
