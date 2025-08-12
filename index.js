require('dotenv').config();
const { buyToken, sellToken, sendPnLSummary } = require('./trader');

// Replace with your token feed / new token detection logic
const exampleToken = {
  symbol: 'sol',   // Must match token symbol for price fetch on Dexscreener
  priceUsd: 25,
  serumMarketAddress: '9wFFyRfZ8iNZc4Jq1uRyFbBybGJKkM2fM8DTWENm2N4', // SOL/USDC Serum market
};

async function main() {
  // Buy example token on start
  await buyToken(exampleToken);

  // Simulate selling after 5 minutes (replace with your own logic)
  setTimeout(async () => {
    const newPrice = 35; // Example increased price to trigger sell
    await sellToken(exampleToken, newPrice);
  }, 5 * 60 * 1000);

  // Schedule PnL summary every 15 minutes
  setInterval(async () => {
    await sendPnLSummary();
  }, 15 * 60 * 1000);
}

main();
