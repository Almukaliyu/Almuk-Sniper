require('dotenv').config();

module.exports = {
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  BUY_AMOUNT_USD: Number(process.env.BUY_AMOUNT_USD) || 5,
  MAX_TOKENS_HELD: Number(process.env.MAX_TOKENS_HELD) || 3,
  SERUM_DEX_PROGRAM_ID: '9xQeWvG816bUx9EPk8shfAq1veCqB4cHifh5a9y3cBXM',
};
