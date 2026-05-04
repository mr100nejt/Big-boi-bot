const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ask } = require('../../utils/llm');

const SYSTEM = `You are an experienced Overwatch 2 coach. When given a team composition, provide:
- What this comp does well
- 1-2 weaknesses or counters to watch for
- One hero swap suggestion if applicable
Keep it under 250 words. Plain text, no markdown headers.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compcheck')
    .setDescription('OW: describe your team comp and get coaching advice')
    .addStringOption(opt =>
      opt.setName('comp').setDescription('Your team heroes (e.g. "Reinhardt, Zarya, Genji, Sojourn, Ana, Lucio")').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('enemy').setDescription('Enemy team if known (optional)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('map').setDescription('Map name (optional)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const comp = interaction.options.getString('comp');
    const enemy = interaction.options.getString('enemy') ?? 'unknown';
    const map = interaction.options.getString('map') ?? 'unknown map';

    const userMsg = `My team: ${comp}\nEnemy team: ${enemy}\nMap: ${map}`;

    try {
      const advice = await ask(SYSTEM, userMsg);
      const embed = new EmbedBuilder()
        .setColor(0xf99e1a)
        .setTitle('🎮 Comp Analysis')
        .setDescription(advice)
        .setFooter({ text: `Powered by Llama 3.3` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('compcheck LLM error:', err?.message);
      await interaction.editReply('All LLM models are currently rate limited. Try again in a minute.');
    }
  }
};
