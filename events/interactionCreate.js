const { handleButton: draftButton } = require('../commands/sts/draft');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Error in /${interaction.commandName}:`, err);
        const msg = { content: 'Something went wrong. Try again.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }

    } else if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('draft_')) {
          await draftButton(interaction);
        }
      } catch (err) {
        console.error('Button handler error:', err);
        const msg = { content: 'Something went wrong with that button.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    }
  }
};
