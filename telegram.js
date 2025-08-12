const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });

async function sendMessage(text) {
  try {
    await bot.sendMessage(config.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Telegram send message error:', error);
  }
}

module.exports = { sendMessage };
