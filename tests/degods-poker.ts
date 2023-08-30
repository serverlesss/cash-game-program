import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DegodsPokerProgram } from "../target/types/degods_poker_program";
import { PublicKey, Signer } from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { describe, it } from "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

const MY_PROGRAM_ID = new PublicKey(
  "DyQWFkDFMrTm4rcLKC1ayM5fKpYdW3DLpybBPwvdWZS8"
);

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace
  .DegodsPokerProgram as Program<DegodsPokerProgram>;
const connection = anchor.getProvider().connection;

const createGame = async (
  data: Partial<{
    minDeposit: anchor.BN;
    maxDeposit: anchor.BN;
    maxPlayers: number;
  }> = {}
) => {
  const payer = anchor.web3.Keypair.generate();
  const gameAccount = anchor.web3.Keypair.generate();
  // Specify the rent-exempt reserve to fund the account creation
  const airdropTx = await connection.requestAirdrop(
    payer.publicKey,
    2000000000
  );
  await connection.confirmTransaction(airdropTx);
  const decimals = 9;
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    decimals
  );
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [gameAccount.publicKey.toBuffer()],
    MY_PROGRAM_ID
  );
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    pda,
    true
  );
  // Add your test here.
  await program.methods
    .createCashGame({
      maxDeposit: new anchor.BN(200 * Math.pow(10, decimals)),
      maxPlayers: 8,
      minDeposit: new anchor.BN(100 * Math.pow(10, decimals)),
      tokenMint: mint,
      ...data,
    })
    .accounts({
      gameAccount: gameAccount.publicKey,
      payer: payer.publicKey,
    })
    .signers([payer, gameAccount])
    .rpc();

  return { payer, gameAccount, mint, tokenAccount };
};

interface JoinGameArgs {
  mint: PublicKey;
  payer: Signer;
  amount: number;
  gameAccount: PublicKey;
  tokenAccount: PublicKey;
}

const joinGame = async (req: JoinGameArgs) => {
  const { mint, payer, amount, gameAccount, tokenAccount } = req;
  const player = anchor.web3.Keypair.generate();
  const airdropTx = await connection.requestAirdrop(
    player.publicKey,
    2000000000
  );
  await connection.confirmTransaction(airdropTx);
  const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    player,
    mint,
    player.publicKey,
    true
  );
  await mintTo(
    connection,
    player,
    mint,
    playerTokenAccount.address,
    payer,
    amount
  );
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [gameAccount.toBuffer()],
    MY_PROGRAM_ID
  );
  const tx = await program.methods
    .joinGame({
      amount: new anchor.BN(amount),
    })
    .accounts({
      gameAccount: gameAccount,
      gameTokenAccount: tokenAccount,
      playerTokenAccount: playerTokenAccount.address,
      player: player.publicKey,
      pdaAccount: pda,
    })
    .signers([player])
    .rpc();

  return { player, playerTokenAccount };
};

describe("degods-poker-program", () => {
  it("Creates Game", async () => {
    const { gameAccount, payer } = await createGame();
    const { data } = await connection.getAccountInfo(gameAccount.publicKey);
    const gameState = program.coder.accounts.decode("GameAccount", data);
    expect(gameState.owner).to.eql(payer.publicKey);
    expect(gameState.players.length).to.eq(0);
  });
  describe("Join Game", () => {
    it("happy path", async () => {
      const amount = 200 * Math.pow(10, 9);
      const { gameAccount, tokenAccount, mint, payer } = await createGame();
      const { player } = await joinGame({
        amount,
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });
      const { data } = await connection.getAccountInfo(gameAccount.publicKey);
      const gameState = program.coder.accounts.decode("GameAccount", data);
      expect(gameState.players.length).to.eq(1);
      expect(gameState.players[0].address).to.eql(player.publicKey);
    });

    it("fails when deposits are wrong amounts", async () => {
      const amount = 200 * Math.pow(10, 9);
      const { gameAccount, tokenAccount, mint, payer } = await createGame();
      await expect(
        joinGame({
          amount: amount + 1,
          gameAccount: gameAccount.publicKey,
          mint,
          payer,
          tokenAccount: tokenAccount.address,
        })
      ).to.eventually.rejected;
      await expect(
        joinGame({
          amount: 100 * Math.pow(10, 9) - 1,
          gameAccount: gameAccount.publicKey,
          mint,
          payer,
          tokenAccount: tokenAccount.address,
        })
      ).to.eventually.rejected;
    });

    it("fails if table is full", async () => {
      const { gameAccount, tokenAccount, mint, payer } = await createGame({
        maxPlayers: 2,
      });
      await joinGame({
        amount: 200 * Math.pow(10, 9),
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });
      await joinGame({
        amount: 200 * Math.pow(10, 9),
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });
      await expect(
        joinGame({
          amount: 200 * Math.pow(10, 9),
          gameAccount: gameAccount.publicKey,
          mint,
          payer,
          tokenAccount: tokenAccount.address,
        })
      ).to.eventually.rejected;
    });
  });

  describe("Add Chips", () => {
    it("happy path add chips and game inactive", async () => {
      const { gameAccount, payer, tokenAccount, mint } = await createGame();
      const { player, playerTokenAccount } = await joinGame({
        amount: 100 * Math.pow(10, 9),
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });

      await mintTo(
        connection,
        payer,
        mint,
        playerTokenAccount.address,
        payer,
        100 * Math.pow(10, 9)
      );
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [gameAccount.publicKey.toBuffer()],
        MY_PROGRAM_ID
      );
      await program.methods
        .addChips({ amount: new anchor.BN(100 * Math.pow(10, 9)) })
        .accounts({
          gameAccount: gameAccount.publicKey,
          gameTokenAccount: tokenAccount.address,
          player: player.publicKey,
          playerTokenAccount: playerTokenAccount.address,
          pdaAccount: pda,
        })
        .signers([player])
        .rpc();
    });

    it("happy path add chips and game active", async () => {
      const { gameAccount, payer, tokenAccount, mint } = await createGame();
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [gameAccount.publicKey.toBuffer()],
        MY_PROGRAM_ID
      );
      const { player, playerTokenAccount } = await joinGame({
        amount: 100 * Math.pow(10, 9),
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });
      await mintTo(
        connection,
        payer,
        mint,
        playerTokenAccount.address,
        payer,
        100 * Math.pow(10, 9)
      );
      await program.methods
        .addChips({ amount: new anchor.BN(100 * Math.pow(10, 9)) })
        .accounts({
          gameAccount: gameAccount.publicKey,
          gameTokenAccount: tokenAccount.address,
          player: player.publicKey,
          playerTokenAccount: playerTokenAccount.address,
          pdaAccount: pda,
        })
        .signers([player])
        .rpc();
    });
  });

  it("Ejects Players", async () => {
    const { gameAccount, tokenAccount, mint, payer } = await createGame();
    const { player: player1, playerTokenAccount: playerTokenAccount1 } =
      await joinGame({
        amount: 200 * Math.pow(10, 9),
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });
    const { player: player2, playerTokenAccount: playerTokenAccount2 } =
      await joinGame({
        amount: 200 * Math.pow(10, 9),
        gameAccount: gameAccount.publicKey,
        mint,
        payer,
        tokenAccount: tokenAccount.address,
      });
    const [pda, bump] = await PublicKey.findProgramAddressSync(
      [gameAccount.publicKey.toBuffer()],
      MY_PROGRAM_ID
    );
    const tx = await program.methods
      .ejectPlayers({
        amounts: [
          new anchor.BN(200 * Math.pow(10, 9)),
          new anchor.BN(200 * Math.pow(10, 9)),
        ],
      })
      .accounts({
        gameAccount: gameAccount.publicKey,
        payer: payer.publicKey,
        pdaAccount: pda,
        tokenAccount: tokenAccount.address,
      })
      .remainingAccounts([
        {
          isSigner: false,
          isWritable: true,
          pubkey: playerTokenAccount1.address,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: playerTokenAccount2.address,
        },
      ])
      .signers([payer])
      .rpc();
    console.log(tx);
    const { data } = await connection.getAccountInfo(gameAccount.publicKey);
    const gameState = program.coder.accounts.decode("GameAccount", data);
    expect(gameState.players.length).to.eq(0);
  });

  it("Handles add ons", async () => {
    const { gameAccount, tokenAccount, mint, payer } = await createGame();
    const { player, playerTokenAccount } = await joinGame({
      amount: 100 * Math.pow(10, 9),
      gameAccount: gameAccount.publicKey,
      mint,
      payer,
      tokenAccount: tokenAccount.address,
    });
    const [pda, bump] = await PublicKey.findProgramAddressSync(
      [gameAccount.publicKey.toBuffer()],
      MY_PROGRAM_ID
    );
    await mintTo(
      connection,
      payer,
      mint,
      playerTokenAccount.address,
      payer,
      200 * Math.pow(10, 9)
    );
    await program.methods
      .addChips({ amount: new anchor.BN(200 * Math.pow(10, 9)) })
      .accounts({
        gameAccount: gameAccount.publicKey,
        gameTokenAccount: tokenAccount.address,
        player: player.publicKey,
        playerTokenAccount: playerTokenAccount.address,
        pdaAccount: pda,
      })
      .signers([player])
      .rpc();
  });

  it("Handles Refunds", async () => {
    const { gameAccount, tokenAccount, mint, payer } = await createGame();
    const { player, playerTokenAccount } = await joinGame({
      amount: 100 * Math.pow(10, 9),
      gameAccount: gameAccount.publicKey,
      mint,
      payer,
      tokenAccount: tokenAccount.address,
    });
    const [pda, bump] = await PublicKey.findProgramAddressSync(
      [gameAccount.publicKey.toBuffer()],
      MY_PROGRAM_ID
    );
    await program.methods
      .refundPlayer({ amount: new anchor.BN(50 * Math.pow(10, 9)) })
      .accounts({
        gameAccount: gameAccount.publicKey,
        gameTokenAccount: tokenAccount.address,
        playerTokenAccount: playerTokenAccount.address,
        pdaAccount: pda,
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();
    const ret = await connection.getTokenAccountBalance(
      playerTokenAccount.address
    );
    expect(ret.value.amount).to.eq("50000000000");
  });

  describe("Close Game", () => {
    it("happy path", async () => {
      const { gameAccount, payer, tokenAccount, mint } = await createGame();
      const [pda, bump] = await PublicKey.findProgramAddressSync(
        [gameAccount.publicKey.toBuffer()],
        MY_PROGRAM_ID
      );
      await mintTo(connection, payer, mint, tokenAccount.address, payer, 1000);
      const payerTokenAccount = await createAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
      );
      await program.methods
        .closeGame()
        .accounts({
          gameAccount: gameAccount.publicKey,
          gameTokenAccount: tokenAccount.address,
          payer: payer.publicKey,
          payerTokenAccount,
          pdaAccount: pda,
        })
        .signers([payer])
        .rpc();
      const ret = await connection.getAccountInfo(gameAccount.publicKey);
      const ret2 = await connection.getAccountInfo(tokenAccount.address);
      expect(ret).to.eq(null);
      expect(ret2).to.eq(null);
      const ret3 = await connection.getTokenAccountBalance(payerTokenAccount);
      expect(ret3.value.amount).to.eq("1000");
    });
  });
});
