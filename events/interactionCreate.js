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
        if (err.code === 10062) { console.warn(`⚠️ Stale interaction slipped through: /${interaction.commandName}`); return; }
        console.error(`Error in /${interaction.commandName}:`, err);
        const msg = { content: 'Something went wrong. Try again.', flags: 64 };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(msg);
          } else {
            await interaction.reply(msg);
          }
        } catch { /* interaction expired — silently drop */ }
      }

    } else if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('draft_')) {
          await draftButton(interaction);
        }
      } catch (err) {
        console.error('Button handler error:', err);
        const msg = { content: 'Something went wrong with that button.', flags: 64 };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(msg);
          } else {
            await interaction.reply(msg);
          }
        } catch { /* interaction expired — silently drop */ }
      }
    }
  }
};
