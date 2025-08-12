const fetch = require('node-fetch');
const config = require('./config');
const { sendMessage } = require('./telegramBot');
const { loadMarket, placeOrder, settleFunds } = require('./serumTrader');

const holdings = new Map();

const MAX_TOKENS_HELD = config.MAX_TOKENS_HELD;
const BUY_AMOUNT_USD = config.BUY_AMOUNT_USD;

async function fetchSolPriceUSD() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const json = await res.json();
    return json.solana.usd;
  } catch (e) {
    console.error('Failed to fetch SOL price:', e);
    return 25; // fallback
  }
}

async function fetchTokenPriceUSD(symbol) {
  try {
    // Dexscreener API for Solana token by symbol
    const url = `https://api.dexscreener.com/latest/dex/tokens/solana/${symbol}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.pairs && data.pairs.length > 0) {
      return parseFloat(data.pairs[0].priceUsd);
    }
    return null;
  } catch (err) {
    console.error('Price fetch error:', err);
    return null;
  }
}

function getHoldingsCount() {
  return holdings.size;
}

function recordBuy(symbol, amount, price) {
  holdings.set(symbol, { amount, buyPrice: price, peakPrice: price, buyTimestamp: Date.now() });
}

function recordSell(symbol) {
  holdings.delete(symbol);
}

async function buyToken(token) {
  if (getHoldingsCount() >= MAX_TOKENS_HELD && !holdings.has(token.symbol)) {
    await sendMessage(`Max holdings (${MAX_TOKENS_HELD}) reached. Skipping buy for ${token.symbol}`);
    return;
  }

  const solPrice = await fetchSolPriceUSD();
  const amountSOL = BUY_AMOUNT_USD / solPrice;
  const marketAddress = token.serumMarketAddress;

  try {
    const market = await loadMarket(marketAddress);
    await placeOrder(market, 'buy', token.priceUsd, amountSOL);

    recordBuy(token.symbol, amountSOL, token.priceUsd);

    await sendMessage(`✅ Bought ${token.symbol} approx ${amountSOL.toFixed(4)} tokens at $${token.priceUsd}`);
  } catch (error) {
    console.error('Buy failed:', error);
    await sendMessage(`❌ Buy failed for ${token.symbol}: ${error.message}`);
  }
}

async function sellToken(token, price) {
  if (!holdings.has(token.symbol)) {
    console.log(`No holdings for ${token.symbol} to sell.`);
    return;
  }

  const { amount } = holdings.get(token.symbol);
  const marketAddress = token.serumMarketAddress;

  try {
    const market = await loadMarket(marketAddress);
    await placeOrder(market, 'sell', price, amount);
    await settleFunds(market);

    recordSell(token.symbol);
    await sendMessage(`🟢 Sold ${token.symbol} at $${price.toFixed(4)}`);
  } catch (error) {
    console.error('Sell failed:', error);
    await sendMessage(`❌ Sell failed for ${token.symbol}: ${error.message}`);
  }
}

// Send PnL summary to Telegram every 15 minutes
async function sendPnLSummary() {
  if (holdings.size === 0) {
    await sendMessage("📊 PnL Summary: No holdings currently.");
    return;
  }

  let message = '📊 *PnL Summary*\n\n';

  for (const [symbol, data] of holdings.entries()) {
    const currentPrice = await fetchTokenPriceUSD(symbol);
    if (currentPrice === null) {
      message += `${symbol}: Current price unavailable\n\n`;
      continue;
    }

    const pnlPercent = ((currentPrice - data.buyPrice) / data.buyPrice) * 100;
    message += `${symbol}:\n  Amount: ${data.amount.toFixed(4)}\n  Buy Price: $${data.buyPrice.toFixed(4)}\n  Current Price: $${currentPrice.toFixed(4)}\n  PnL: ${pnlPercent.toFixed(2)}%\n\n`;
  }

  await sendMessage(message);
}

module.exports = { buyToken, sellToken, holdings, sendPnLSummary };
