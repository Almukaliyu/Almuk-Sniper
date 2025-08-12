// Simple placeholder scam detection logic (replace with AI model or API)

async function isScamToken(token) {
  if (!token.symbol || token.symbol.length < 2) return true;
  if (token.liquidity < 2000) return true;
  // Add more advanced checks or call external AI API here
  return false;
}

module.exports = {
  isScamToken,
};
