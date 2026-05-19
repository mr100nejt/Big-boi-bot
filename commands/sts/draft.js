const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomCards, STARTING_DECKS } = require('../../data/sts-cards');

const DRAFT_ROUNDS = 10;
const drafts = new Map(); // userId -> { character, deck, round, messageId }

function buildDraftEmbed(character, round, deck, choices) {
  const embed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle(`🃏 Draft — ${character} (Round ${round}/${DRAFT_ROUNDS})`)
    .setDescription('Pick one card to add to your deck:')
    .addFields(choices.map((c, i) => ({
      name: `${i + 1}. ${c.name} [${c.rarity} ${c.type}]`,
      value: c.desc,
      inline: false
    })));

  if (deck.length > 0) {
    embed.setFooter({ text: `Current picks: ${deck.join(', ')}` });
  }

  return embed;
}

function buildButtons(userId, choices) {
  return new ActionRowBuilder().addComponents(
    choices.map((c, i) =>
      new ButtonBuilder()
        .setCustomId(`draft_${userId}_${i}`)
        .setLabel(`${i + 1}. ${c.name}`)
        .setStyle(ButtonStyle.Primary)
    )
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('draft')
    .setDescription('STS: draft a deck 3 cards at a time for 10 rounds')
    .addStringOption(opt =>
      opt.setName('character').setDescription('Character to draft for').setRequired(true)
        .addChoices(
          { name: 'Ironclad', value: 'ironclad' },
          { name: 'Silent', value: 'silent' },
          { name: 'Defect', value: 'defect' },
          { name: 'Watcher', value: 'watcher' }
        )
    ),

  async execute(interaction) {
    const character = interaction.options.getString('character');
    const userId = interaction.user.id;

    if (drafts.has(userId)) {
      return interaction.reply({ content: 'You already have an active draft! Finish it first or wait 10 minutes for it to expire.', flags: 64 });
    }

    const choices = getRandomCards(character, 3);
    drafts.set(userId, { character, deck: [], round: 1, choices });

    // Auto-expire after 10 minutes
    setTimeout(() => drafts.delete(userId), 10 * 60 * 1000);

    const embed = buildDraftEmbed(character.charAt(0).toUpperCase() + character.slice(1), 1, [], choices);
    const row = buildButtons(userId, choices);

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');
    const userId = parts[1];
    const choiceIndex = parseInt(parts[2]);

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "That's not your draft!", flags: 64 });
    }

    const draft = drafts.get(userId);
    if (!draft) {
      return interaction.reply({ content: 'This draft has expired. Start a new one with /draft.', flags: 64 });
    }

    const picked = draft.choices[choiceIndex];
    draft.deck.push(picked.name);
    draft.round++;

    if (draft.round > DRAFT_ROUNDS) {
      drafts.delete(userId);
      const charName = draft.character.charAt(0).toUpperCase() + draft.character.slice(1);
      const startingDeck = STARTING_DECKS[draft.character];

      const finalEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`✅ Draft Complete — ${charName}`)
        .addFields(
          { name: 'Starting Deck', value: startingDeck.join(', '), inline: false },
          { name: `Drafted Cards (${draft.deck.length})`, value: draft.deck.join(', '), inline: false }
        )
        .setFooter({ text: 'Use /deckcheck to get synergy advice on this deck!' });

      return interaction.update({ embeds: [finalEmbed], components: [] });
    }

    const newChoices = getRandomCards(draft.character, 3);
    draft.choices = newChoices;

    const charName = draft.character.charAt(0).toUpperCase() + draft.character.slice(1);
    const embed = buildDraftEmbed(charName, draft.round, draft.deck, newChoices);
    const row = buildButtons(userId, newChoices);

    await interaction.update({ embeds: [embed], components: [row] });
  }
};
