const { handleButton: draftButton } = require('../commands/sts/draft');
const { handleButton: bjButton } = require('../commands/games/blackjack');
const { handleButton: vpButton } = require('../commands/games/videopoker');
const { handleButton: crapsButton } = require('../commands/games/craps');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        if (err.code === 10062) { console.debug(`[10062] Stale: /${interaction.commandName}`); return; }
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
        } else if (interaction.customId.startsWith('bj_')) {
          await bjButton(interaction);
        } else if (interaction.customId.startsWith('vp_')) {
          await vpButton(interaction);
        } else if (interaction.customId.startsWith('cr_')) {
          await crapsButton(interaction);
        } else if (interaction.customId.startsWith('tipbtn_')) {
          const tipCmd = interaction.client.commands.get('tip');
          if (tipCmd?.handleButton) await tipCmd.handleButton(interaction);
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

    } else if (interaction.isMessageContextMenuCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.handleContextMenu) return;
      try {
        await command.handleContextMenu(interaction);
      } catch (err) {
        console.error('Context menu error:', err);
        try {
          const msg = { content: 'Something went wrong.', flags: 64 };
          if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
          else await interaction.reply(msg);
        } catch { /* expired */ }
      }

    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('tip_')) {
        const command = interaction.client.commands.get('Tip');
        if (!command?.handleModal) return;
        try {
          await command.handleModal(interaction);
        } catch (err) {
          console.error('Modal error:', err);
          try {
            const msg = { content: 'Something went wrong.', flags: 64 };
            if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
            else await interaction.reply(msg);
          } catch { /* expired */ }
        }
      }
    }
  }
};
