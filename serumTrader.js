const {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
} = require('@solana/web3.js');
const {
  Market,
} = require('@project-serum/serum');
const {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
const wallet = require('./wallet');
const config = require('./config');

const connection = new Connection(config.SOLANA_RPC_URL);

async function getOrCreateATA(mint) {
  const mintPubkey = new PublicKey(mint);
  const ata = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintPubkey,
    wallet.publicKey
  );

  const accountInfo = await connection.getAccountInfo(ata);
  if (!accountInfo) {
    const tx = new Transaction().add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintPubkey,
        ata,
        wallet.publicKey,
        wallet.publicKey
      )
    );
    await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log(`Created ATA for mint ${mint}: ${ata.toBase58()}`);
  }
  return ata;
}

async function loadMarket(marketAddress) {
  return await Market.load(connection, new PublicKey(marketAddress), {}, new PublicKey(config.SERUM_DEX_PROGRAM_ID));
}

async function placeOrder(market, side, price, size) {
  const baseATA = await getOrCreateATA(market.baseMintAddress.toBase58());
  const quoteATA = await getOrCreateATA(market.quoteMintAddress.toBase58());

  const openOrdersAccounts = await market.findOpenOrdersAccountsForOwner(connection, wallet.publicKey);
  let openOrdersAddress = openOrdersAccounts.length > 0 ? openOrdersAccounts[0].address : null;

  const transaction = new Transaction();

  if (!openOrdersAddress) {
    const openOrdersAccountKeypair = new Keypair();
    const createOpenOrdersIx = await market.makeCreateOpenOrdersInstruction(
      connection,
      openOrdersAccountKeypair.publicKey,
      wallet.publicKey
    );
    transaction.add(createOpenOrdersIx);
    openOrdersAddress = openOrdersAccountKeypair.publicKey;
    await sendAndConfirmTransaction(connection, transaction, [wallet, openOrdersAccountKeypair]);
  }

  const placeOrderIx = await market.makePlaceOrderInstruction(connection, {
    owner: wallet.publicKey,
    payer: side === 'buy' ? quoteATA : baseATA,
    side,
    price,
    size,
    orderType: 'limit',
    openOrdersAddressKey: openOrdersAddress,
    clientId: undefined,
    feeDiscountPubkey: null,
  });

  const tx = new Transaction().add(placeOrderIx);
  await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log(`${side} order placed at price ${price} size ${size}`);
}

async function settleFunds(market) {
  const baseATA = await getOrCreateATA(market.baseMintAddress.toBase58());
  const quoteATA = await getOrCreateATA(market.quoteMintAddress.toBase58());

  const openOrdersAccounts = await market.findOpenOrdersAccountsForOwner(connection, wallet.publicKey);
  if (!openOrdersAccounts.length) {
    console.log('No open orders account to settle.');
    return;
  }

  const tx = new Transaction().add(
    market.makeSettleFundsInstruction(
      connection,
      wallet.publicKey,
      openOrdersAccounts[0].address,
      baseATA,
      quoteATA
    )
  );
  await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log('Funds settled.');
}

module.exports = {
  loadMarket,
  placeOrder,
  settleFunds,
};
