require('dotenv').config();
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

let wallet;

if (process.env.SOLANA_PRIVATE_KEY_JSON) {
  wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY_JSON)));
} else if (process.env.SOLANA_PRIVATE_KEY) {
  wallet = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY));
} else {
  throw new Error('Wallet private key missing in environment variables');
}

module.exports = wallet;
