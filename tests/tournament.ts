import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DegodsPokerProgram } from "../target/types/degods_poker_program";
import { Keypair, PublicKey, Signer } from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  Account,
} from "@solana/spl-token";
import { describe, it } from "mocha";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";

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
  initialPayouts: number[];
  guarantee: anchor.BN;
}

const mintNFT = async (owner: PublicKey, creator: Keypair) => {
  const metaplex = new Metaplex(connection, { cluster: "localnet" }).use(
    keypairIdentity(creator)
  );

  return metaplex.nfts().create({
    uri: "test",
    name: "test",
    sellerFeeBasisPoints: 1000,
    tokenStandard: TokenStandard.NonFungible,
    tokenOwner: owner,
    isMutable: true,
    creators: [
      {
        address: new PublicKey(metaplex.identity().publicKey.toString()),
        share: 100,
      },
    ],
  });
};

const createTournament = async (
  partial: Partial<CreateTournamentArgs> = {}
) => {
  const owner = anchor.web3.Keypair.generate();
  const transactor = anchor.web3.Keypair.generate();
  const tournamentAccount = anchor.web3.Keypair.generate();
  // Specify the rent-exempt reserve to fund the account creation
  const airdropTx = await connection.requestAirdrop(
    owner.publicKey,
    2000000000
  );
  await connection.confirmTransaction(airdropTx);
  const airdropTxTransactor = await connection.requestAirdrop(
    transactor.publicKey,
    2000000000
  );
  await connection.confirmTransaction(airdropTxTransactor);
  const decimals = 9;
  const mint = await createMint(
    connection,
    owner,
    owner.publicKey,
    null,
    decimals
  );
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [tournamentAccount.publicKey.toBuffer()],
    MY_PROGRAM_ID
  );
  const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
    mint,
    owner.publicKey,
    true
  );
  if (partial.guarantee) {
    await mintTo(
      connection,
      owner,
      mint,
      ownerTokenAccount.address,
      owner,
      partial.guarantee.toNumber()
    );
  }
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
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
      initialPayouts: [1000],
      guarantee: new anchor.BN(0 * Math.pow(10, decimals)),
      ...partial,
    })
    .accounts({
      tournamentAccount: tournamentAccount.publicKey,
      owner: owner.publicKey,
      ownerTokenAccount: ownerTokenAccount.address,
      pdaAccount: pda,
      tournamentTokenAccount: tokenAccount.address,
      transactor: transactor.publicKey,
    })
    .signers([owner, tournamentAccount])
    .rpc();

  return { owner, tournamentAccount, mint, tokenAccount, pda, transactor };
};

interface JoinGameArgs {
  mint: PublicKey;
  owner: Signer;
  tournamentAccount: PublicKey;
  tokenAccount: PublicKey;
  amount: number;
}

const registerTournament = async (req: JoinGameArgs) => {
  const { mint, owner, tournamentAccount, tokenAccount, amount } = req;
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
    owner,
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
    const { tournamentAccount, owner, transactor, tokenAccount } =
      await createTournament({
        guarantee: new anchor.BN(100 * Math.pow(10, 9)),
      });
    const { data } = await connection.getAccountInfo(
      tournamentAccount.publicKey
    );
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data
    );
    expect(tournamentState.owner).to.eql(owner.publicKey);
    const balance = await connection.getTokenAccountBalance(
      tokenAccount.address
    );
    expect(balance.value.uiAmount).to.equal(100);
  });

  it.only("Adds an NFT prize", async () => {
    const { tournamentAccount, owner, transactor } = await createTournament({
      guarantee: new anchor.BN(100 * Math.pow(10, 9)),
    });

    const { tokenAddress: nftTokenAddress, mintAddress } = await mintNFT(
      owner.publicKey,
      transactor
    );

    const [tournamentNftPayoutAccount] = PublicKey.findProgramAddressSync(
      [
        tournamentAccount.publicKey.toBuffer(),
        new anchor.BN(1).toBuffer("le", 2),
      ],
      MY_PROGRAM_ID
    );
    const tournamentNftAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      owner,
      mintAddress,
      tournamentNftPayoutAccount,
      true
    );
    await program.methods
      .addNftTournamentPrize({ placePaid: 1 })
      .accounts({
        nftTokenAccount: nftTokenAddress,
        owner: owner.publicKey,
        tournamentAccount: tournamentAccount.publicKey,
        tournamentNftTokenAccount: tournamentNftAccount.address,
        tournamentNftPayoutAccount,
      })
      .signers([owner])
      .rpc();

    const { tokenAddress: nftTokenAddress2, mintAddress: mintAddress2 } =
      await mintNFT(owner.publicKey, transactor);
    const tournamentNftAccount2 = await getOrCreateAssociatedTokenAccount(
      connection,
      owner,
      mintAddress2,
      tournamentNftPayoutAccount,
      true
    );
    await program.methods
      .addNftTournamentPrize({ placePaid: 1 })
      .accounts({
        nftTokenAccount: nftTokenAddress2,
        owner: owner.publicKey,
        tournamentAccount: tournamentAccount.publicKey,
        tournamentNftTokenAccount: tournamentNftAccount2.address,
        tournamentNftPayoutAccount,
      })
      .signers([owner])
      .rpc();
    const balance = await connection.getTokenAccountBalance(
      tournamentNftAccount.address
    );
    const ownerBalance = await connection.getTokenAccountBalance(
      nftTokenAddress
    );
    expect(balance.value.uiAmount).to.equal(1);
    expect(ownerBalance.value.uiAmount).to.equal(0);
    const data = await connection.getAccountInfo(tournamentAccount.publicKey);
    const tournamentState = program.coder.accounts.decode(
      "TournamentAccount",
      data.data
    );
    expect(tournamentState.nftPayouts).to.eql([1]);
  });

  it("registers a tournament, prevents duplicates", async () => {
    const { tournamentAccount, owner, mint, tokenAccount } =
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
      owner,
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
    const { mint, owner, tokenAccount, tournamentAccount, pda } =
      await createTournament({
        registrationOpen: true,
      });
    const { player, playerTokenAccount, playerPda } = await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      owner,
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
    const { mint, owner, tokenAccount, tournamentAccount, pda } =
      await createTournament({
        registrationOpen: true,
      });
    const { player, playerTokenAccount, playerPda } = await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      owner,
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
        owner: owner.publicKey,
        player: player.publicKey,
      })
      .signers([owner])
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
    const { tournamentAccount, owner } = await createTournament({
      registrationOpen: false,
    });
    const tx = await program.methods
      .flipTournamentRegistration()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        owner: owner.publicKey,
      })
      .signers([owner])
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
    const { mint, owner, pda, tokenAccount, tournamentAccount } =
      await createTournament({
        registrationOpen: true,
      });
    await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      owner,
      tokenAccount: tokenAccount.address,
      tournamentAccount: tournamentAccount.publicKey,
    });
    await registerTournament({
      amount: 500 * Math.pow(10, 9),
      mint,
      owner,
      tokenAccount: tokenAccount.address,
      tournamentAccount: tournamentAccount.publicKey,
    });
    await program.methods
      .startTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        owner: owner.publicKey,
      })
      .signers([owner])
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
    const { mint, owner, pda, tokenAccount, tournamentAccount } =
      await createTournament({
        registrationOpen: true,
        guarantee: new anchor.BN(10 * 205 * Math.pow(10, 9)),
        entryCost: new anchor.BN(200 * Math.pow(10, 9)),
        entryFee: new anchor.BN(5 * Math.pow(10, 9)),
      });
    const players = [] as anchor.web3.Keypair[];
    const playerPdas = [] as PublicKey[];
    const playerTokenAccounts = [] as Account[];
    for (let i = 0; i < 6; i++) {
      const { player, playerPda, playerTokenAccount } =
        await registerTournament({
          amount: 500 * Math.pow(10, 9),
          mint,
          owner,
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
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    await program.methods
      .updateTournamentPayouts({
        payouts: [700, 300],
      })
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    // bust;
    await program.methods
      .payoutTournamentPlayer()
      .accounts({
        owner: owner.publicKey,
        pdaAccount: pda,
        player: players[0].publicKey,
        playerTokenAccount: playerTokenAccounts[0].address,
        tournamentAccount: tournamentAccount.publicKey,
        tournamentPlayerAccount: playerPdas[0],
        tournamentTokenAccount: tokenAccount.address,
      })
      .signers([owner])
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
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    for (let i = 0; i < 6; i++) {
      console.log("Busting player", i);
      await program.methods
        .payoutTournamentPlayer()
        .accounts({
          owner: owner.publicKey,
          pdaAccount: pda,
          player: players[i].publicKey,
          playerTokenAccount: playerTokenAccounts[i].address,
          tournamentAccount: tournamentAccount.publicKey,
          tournamentPlayerAccount: playerPdas[i],
          tournamentTokenAccount: tokenAccount.address,
        })
        .signers([owner])
        .rpc();
      if (i === 4) {
        const ret = await connection.getTokenAccountBalance(
          playerTokenAccounts[i].address
        );
        const total = 10 * 205;
        expect(ret.value.uiAmount).to.equal(300 - 5 + (300 * total) / 1000);
      }
    }
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      owner,
      mint,
      owner.publicKey,
      true
    );
    await program.methods
      .closeTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        owner: owner.publicKey,
        pdaAccount: pda,
        tournamentTokenAccount: tokenAccount.address,
        ownerTokenAccount: ownerTokenAccount.address,
      })
      .signers([owner])
      .rpc();
    const ret = await connection.getTokenAccountBalance(
      playerTokenAccounts[5].address
    );
    const total = 10 * 205;
    expect(ret.value.uiAmount).to.equal(300 - 5 + (700 * total) / 1000);
    const ownerBalance = await connection.getTokenAccountBalance(
      ownerTokenAccount.address
    );
    // 35 in fees, 7 * 200 in refunds on guanrantee;
    expect(ownerBalance.value.uiAmount).to.equal(7 * 200 + 35);
  });

  it("Closes a tournament with a guanrantee and returns it", async () => {
    const { tournamentAccount, owner, tokenAccount, mint, pda } =
      await createTournament({
        guarantee: new anchor.BN(100 * Math.pow(10, 9)),
      });
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      owner,
      mint,
      owner.publicKey,
      true
    );
    await program.methods
      .closeTournament()
      .accounts({
        tournamentAccount: tournamentAccount.publicKey,
        owner: owner.publicKey,
        pdaAccount: pda,
        tournamentTokenAccount: tokenAccount.address,
        ownerTokenAccount: ownerTokenAccount.address,
      })
      .signers([owner])
      .rpc();
    const ownerBalance = await connection.getTokenAccountBalance(
      ownerTokenAccount.address
    );
    expect(ownerBalance.value.uiAmount).to.equal(100);
  });
});
