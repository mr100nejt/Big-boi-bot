const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const INSULTS = [
  'has the strategic genius of a wet paper bag.',
  'could lose a 1v1 against a training dummy.',
  'brings a knife to a gunfight and somehow still loses the knife.',
  'has a face only a Randy Random event could love.',
  'peaked in silver and has been declining ever since.',
  'is the human equivalent of a Wound card in your deck.',
  'plays Roadhog in 2025 unironically.',
  'has the colony management skills of a pyromaniac pawn.',
  'once got outplayed by a turret on its own.',
  'is so bad at Slay the Spire they lost to the tutorial slime.',
  'types "gg ez" and then leaves the game in last place.',
  'has the game sense of a level 1 boar.',
  'is built like a Defect that forgot to channel any orbs.',
  'could not coordinate a 5-stack if they were playing with themselves.',
  'gets bodied by Randy Random on Peaceful difficulty.',
  'picked Wrecking Ball into a Bastion and called it a strategy.',
  'has never won a coin flip in their entire life.',
  'is the reason your colony keeps getting raided.',
  'drafted 10 Strikes and thought it was a good deck.',
  'once used Limit Break with 0 Strength and felt good about it.',
  'has the map awareness of a blindfolded Genji main.',
  'would lose to Hexaghost with a perfect deck.',
  'is the sole reason the phrase "skill issue" was invented.',
  'once tried to counter Pharah by switching to Pharah.',
  'has never once read a card description fully.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insultgabe')
    .setDescription('Fire a silly insult at nolongerlloyd'),

  async execute(interaction) {
    const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setDescription(`<@254709615877423104> ${insult}`)
      .setFooter({ text: `From: ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  }
};
