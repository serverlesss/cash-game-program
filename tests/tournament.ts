import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DegodsPokerProgram } from "../target/types/degods_poker_program";
import { PublicKey, Signer } from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  Account,
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

interface CreateTournamentArgs {
  maxPlayers: number;
  entryFee: anchor.BN;
  entryCost: anchor.BN;
  tokenMint: PublicKey;
  registrationOpen: boolean;
}

const createTournament = async (
  partial: Partial<CreateTournamentArgs> = {}
) => {
  const payer = anchor.web3.Keypair.generate();
  const tournamentAccount = anchor.web3.Keypair.generate();
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
    [tournamentAccount.publicKey.toBuffer()],
    MY_PROGRAM_ID
  );

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    pda,
    true
  );
  await program.methods
    .createTournament({
      entryCost: new anchor.BN(200 * Math.pow(10, decimals)),
      entryFee: new anchor.BN(5 * Math.pow(10, decimals)),
      maxPlayers: 10,
      tokenMint: mint,
      registrationOpen: true,
      ...partial,
    })
    .accounts({
      tournamentAccount: tournamentAccount.publicKey,
      payer: payer.publicKey,
    })
    .signers([payer, tournamentAccount])
    .rpc();

  return { payer, tournamentAccount, mint, tokenAccount, pda };
};

interface JoinGameArgs {
  mint: PublicKey;
  payer: Signer;
  tournamentAccount: PublicKey;
  tokenAccount: PublicKey;
  amount: number;
}

const registerTournament = async (req: JoinGameArgs) => {
  const { mint, payer, tournamentAccount, tokenAccount, amount } = req;
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
  const [tournamentPda] = PublicKey.findProgramAddressSync(
    [tournamentAccount.toBuffer()],
    MY_PROGRAM_ID
  );
  const [playerPda] = PublicKey.findProgramAddressSync(
    [tournamentAccount.toBuffer(), player.publicKey.toBuffer()],
    MY_PROGRAM_ID
  );
  const tx = await program.methods
    .registerTournament()
    .accounts({
      tournamentAccount,
      tournamentTokenAccount: tokenAccount,
      playerTokenAccount: playerTokenAccount.address,
      player: player.publicKey,
      pdaAccount: tournamentPda,
      tournamentPlayerAccount: playerPda,
    })
    .signers([player])
    .rpc();

  return { player, playerTokenAccount, playerPda };
};

describe("Tournaments", () => {
  it("Creates a tournament", async () => {
    const { tournamentAccount, payer } = await createTournament();
    const { data } = await connection.getAccountInfo(
      tournamentAccount.publicKey
    );
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data
    );
    expect(tournamentState.owner).to.eql(payer.publicKey);
  });

  it("registers a tournament, prevents duplicates", async () => {
    const { tournamentAccount, payer, mint, tokenAccount } =
      await createTournament();
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
      500 * Math.pow(10, 9)
    );
    const [tournamentPda] = PublicKey.findProgramAddressSync(
      [tournamentAccount.publicKey.toBuffer()],
      MY_PROGRAM_ID
    );
    const [playerPda] = PublicKey.findProgramAddressSync(
      [tournamentAccount.publicKey.toBuffer(), player.publicKey.toBuffer()],
      MY_PROGRAM_ID
    );
    const tx = await program.methods
      .registerTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        tournamentTokenAccount: tokenAccount.address,
        playerTokenAccount: playerTokenAccount.address,
        player: player.publicKey,
        pdaAccount: tournamentPda,
        tournamentPlayerAccount: playerPda,
      })
      .signers([player])
      .rpc();
    console.log(tx);
    await expect(
      program.methods
        .registerTournament()
        .accounts({
          tournamentAccount: tournamentAccount.publicKey,
          tournamentTokenAccount: tokenAccount.address,
          playerTokenAccount: playerTokenAccount.address,
          player: player.publicKey,
          pdaAccount: tournamentPda,
          tournamentPlayerAccount: playerPda,
        })
        .signers([player])
        .rpc()
    ).to.eventually.rejected;
  });

  it("Unregisters a tournament", async () => {
    const { mint, payer, tokenAccount, tournamentAccount, pda } =
      await createTournament({
        registrationOpen: true,
      });
    const { player, playerTokenAccount, playerPda } = await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      payer,
      tokenAccount: tokenAccount.address,
      tournamentAccount: tournamentAccount.publicKey,
    });
    const balance = await connection.getTokenAccountBalance(
      playerTokenAccount.address
    );
    expect(balance.value.uiAmount).to.be.equal(500 - 205);

    await program.methods
      .unregisterTournament()
      .accounts({
        player: player.publicKey,
        pdaAccount: pda,
        playerTokenAccount: playerTokenAccount.address,
        tournamentAccount: tournamentAccount.publicKey,
        tournamentPlayerAccount: playerPda,
        tournamentTokenAccount: tokenAccount.address,
      })
      .signers([player])
      .rpc();
    const { data } = await connection.getAccountInfo(
      tournamentAccount.publicKey
    );
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data
    );
    expect(tournamentState.players).to.eql(0);
    expect(tournamentState.playersWithRebuys).to.eql(0);
    const balance2 = await connection.getTokenAccountBalance(
      playerTokenAccount.address
    );
    expect(balance2.value.uiAmount).to.equal(500);
  });

  it("Refunds Player", async () => {
    const { mint, payer, tokenAccount, tournamentAccount, pda } =
      await createTournament({
        registrationOpen: true,
      });
    const { player, playerTokenAccount, playerPda } = await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      payer,
      tokenAccount: tokenAccount.address,
      tournamentAccount: tournamentAccount.publicKey,
    });
    const balance = await connection.getTokenAccountBalance(
      playerTokenAccount.address
    );
    expect(balance.value.uiAmount).to.be.equal(500 - 205);

    await program.methods
      .refundTournament()
      .accounts({
        pdaAccount: pda,
        playerTokenAccount: playerTokenAccount.address,
        tournamentAccount: tournamentAccount.publicKey,
        tournamentPlayerAccount: playerPda,
        tournamentTokenAccount: tokenAccount.address,
        payer: payer.publicKey,
        player: player.publicKey,
      })
      .signers([payer])
      .rpc();
    const { data } = await connection.getAccountInfo(
      tournamentAccount.publicKey
    );
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data
    );
    expect(tournamentState.players).to.eql(0);
    expect(tournamentState.playersWithRebuys).to.eql(0);
    const balance2 = await connection.getTokenAccountBalance(
      playerTokenAccount.address
    );
    expect(balance2.value.uiAmount).to.equal(500);
  });

  it("Flips tournaments registration", async () => {
    const { tournamentAccount, payer } = await createTournament({
      registrationOpen: false,
    });
    const tx = await program.methods
      .flipTournamentRegistration()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();
    const { data } = await connection.getAccountInfo(
      tournamentAccount.publicKey
    );
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data
    );
    expect(tournamentState.registrationOpen).to.eql(true);
  });

  it("Starts Tournament", async () => {
    const { mint, payer, pda, tokenAccount, tournamentAccount } =
      await createTournament({
        registrationOpen: true,
      });
    await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      payer,
      tokenAccount: tokenAccount.address,
      tournamentAccount: tournamentAccount.publicKey,
    });
    await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      payer,
      tokenAccount: tokenAccount.address,
      tournamentAccount: tournamentAccount.publicKey,
    });
    await program.methods
      .startTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();
    const { data } = await connection.getAccountInfo(
      tournamentAccount.publicKey
    );
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data
    );
    expect(tournamentState.hasStarted).to.eql(true);
  });

  it("Busts a player and pays them in the money and closes out game", async () => {
    const { mint, payer, pda, tokenAccount, tournamentAccount } =
      await createTournament({
        registrationOpen: true,
      });
    const players = [] as anchor.web3.Keypair[];
    const playerPdas = [] as PublicKey[];
    const playerTokenAccounts = [] as Account[];
    for (let i = 0; i < 6; i++) {
      const { player, playerPda, playerTokenAccount } =
        await registerTournament({
          amount: 500 * Math.pow(10, 9),
          mint,
          payer,
          tokenAccount: tokenAccount.address,
          tournamentAccount: tournamentAccount.publicKey,
        });
      players.push(player);
      playerPdas.push(playerPda);
      playerTokenAccounts.push(playerTokenAccount);
    }
    await program.methods
      .startTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();
    await program.methods
      .updateTournamentPayouts({
        payouts: [700, 300],
      })
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();
    // bust;
    await program.methods
      .bustTournamentPlayer()
      .accounts({
        payer: payer.publicKey,
        pdaAccount: pda,
        player: players[0].publicKey,
        playerTokenAccount: playerTokenAccounts[0].address,
        tournamentAccount: tournamentAccount.publicKey,
        tournamentPlayerAccount: playerPdas[0],
        tournamentTokenAccount: tokenAccount.address,
      })
      .signers([payer])
      .rpc();
    // rebuy;
    await program.methods
      .registerTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        tournamentTokenAccount: tokenAccount.address,
        playerTokenAccount: playerTokenAccounts[0].address,
        player: players[0].publicKey,
        pdaAccount: pda,
        tournamentPlayerAccount: playerPdas[0],
      })
      .signers([players[0]])
      .rpc();
    // registration close;
    await program.methods
      .flipTournamentRegistration()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();
    for (let i = 0; i < 5; i++) {
      console.log("Busting player", i);
      await program.methods
        .bustTournamentPlayer()
        .accounts({
          payer: payer.publicKey,
          pdaAccount: pda,
          player: players[i].publicKey,
          playerTokenAccount: playerTokenAccounts[i].address,
          tournamentAccount: tournamentAccount.publicKey,
          tournamentPlayerAccount: playerPdas[i],
          tournamentTokenAccount: tokenAccount.address,
        })
        .signers([payer])
        .rpc();
      if (i === 4) {
        const ret = await connection.getTokenAccountBalance(
          playerTokenAccounts[i].address
        );
        const total = 7 * 200;
        expect(ret.value.uiAmount).to.equal(300 - 5 + (300 * total) / 1000);
      }
    }
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey,
      true
    );
    await program.methods
      .closeTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        payer: payer.publicKey,
        pdaAccount: pda,
        player: players[5].publicKey,
        playerTokenAccount: playerTokenAccounts[5].address,
        tournamentPlayerAccount: playerPdas[5],
        tournamentTokenAccount: tokenAccount.address,
        ownerTokenAccount: ownerTokenAccount.address,
      })
      .signers([payer])
      .rpc();
    const ret = await connection.getTokenAccountBalance(
      playerTokenAccounts[5].address
    );
    const total = 7 * 200;
    expect(ret.value.uiAmount).to.equal(300 - 5 + (700 * total) / 1000);
    const ownerBalance = await connection.getTokenAccountBalance(
      ownerTokenAccount.address
    );
    expect(ownerBalance.value.uiAmount).to.equal(7 * 5);
  });
});
