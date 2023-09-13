use std::collections::{HashSet, BTreeSet};

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

// Create Game

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct CreateGameData {
    pub max_players: u16,
    pub min_deposit: u64,
    pub max_deposit: u64,
    pub token_mint: Pubkey,
}

#[derive(Accounts)]
pub struct CreateGameParams<'info> {
    #[account(init, payer = payer, space =  32 + 2 + 8 + 8 + 2 + 8 + 424 + 2 + 32)]
    pub game_account: Account<'info, GameAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GameAccount {
    pub owner: Pubkey,                   // 32
    pub max_players: u16,                // 2
    pub min_deposit: u64,                // 8
    pub max_deposit: u64,                // 8
    pub players: Box<Vec<SeatedPlayer>>, // 4 + 42 * 10 enough for 10 players;
    pub token_mint: Pubkey,              // 32
}

// Join Game

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    #[account(
        mut, 
        constraint = game_token_account.owner == pda_account.key(), 
        constraint = game_token_account.mint == game_account.token_mint
    )]
    pub game_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.owner == player.key(),
        constraint = player_token_account.mint == game_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        game_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct JoinGameArgs {
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug, PartialEq)]
pub struct SeatedPlayer {
    pub address: Pubkey, // 32
}

// Add Chips
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AddChipsData {
    pub amount: u64,
}

#[derive(Accounts)]
pub struct AddChips<'info> {
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    #[account(
        mut, 
        constraint = game_token_account.owner == pda_account.key(),
        constraint = game_token_account.mint == game_account.token_mint
    )]
    pub game_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.owner == player.key(),
        constraint = player_token_account.mint == game_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        game_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

// Eject Player
#[derive(Accounts)]
pub struct EjectPlayersAccounts<'info> {
    #[account(
        mut, 
        constraint = game_account.owner == payer.key()
    )]
    pub game_account: Account<'info, GameAccount>,
    #[account(
        mut, 
        constraint = token_account.owner == pda_account.key(),
        constraint = game_account.token_mint == token_account.mint
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        game_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct EjectPlayersParams {
    pub amounts: Vec<u64>,
}


// Refund Player
#[derive(Accounts)]
pub struct RefundPlayerAccounts<'info> {
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    #[account(
        mut, 
        constraint = game_token_account.owner == pda_account.key(),
        constraint = game_token_account.mint == game_account.token_mint
    )]
    pub game_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.mint == game_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        game_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct RefundPlayerParams {
    pub amount: u64,
}



// Close game

#[derive(Accounts)]
pub struct CloseGame<'info> {
    #[account(mut, constraint = game_account.owner == payer.key(),  close = payer)]
    pub game_account: Account<'info, GameAccount>,
    #[account(
        mut, 
        constraint = game_token_account.owner == pda_account.key(),
        constraint = game_token_account.mint == game_account.token_mint
    )]
    pub game_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = payer_token_account.owner == payer.key(),
        constraint = payer_token_account.mint == game_account.token_mint
    )]
    pub payer_token_account: Account<'info, TokenAccount>,
    /// CHECK: its a pda fam;
    #[account(
        seeds = [game_account.key().as_ref()],
        bump
    )]
    pub pda_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}



// Tournaments;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct CreateTournamentData {
    pub max_players: u16,
    pub entry_fee: u64,
    pub entry_cost: u64,
    pub token_mint: Pubkey,
    pub registration_open: bool,
    pub initial_payouts: Vec<u16>,
    pub guarantee: u64,
}

#[derive(Accounts)]
pub struct CreateTournamentParams<'info> {
    #[account(init, payer = owner, space =  2 + 8 + 8 + 200 + 32 + 32 + 1 + 1 + 1 + 8 + 32 + 2 + 200)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub transactor: SystemAccount<'info>,
    #[account(seeds = [
        tournament_account.key().as_ref()
    ], bump)]
    pub pda_account: SystemAccount<'info>,
    #[account(
        mut, 
        constraint = owner_token_account.owner == owner.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = tournament_token_account.owner == pda_account.key()
    )]
    pub tournament_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct TournamentAccount {
    // 2
    pub min_players: u16,
    // 2
    pub max_players: u16,
    // 8
    pub entry_fee: u64,
    // 8
    pub entry_cost: u64,
    // 200
    pub payouts: Vec<u16>,
    // 32
    pub token_mint: Pubkey,
    // 32
    pub owner: Pubkey,
    // 32
    pub transactor: Pubkey,
    // 1
    pub registration_open: bool,
    // 1
    pub has_started: bool,
    // 1
    pub players_with_rebuys: u16,
    // 1
    pub players: u16,
    // 8
    pub guarantee: u64,
    // 200
    pub nft_payouts: Vec<u16>,
}

#[derive(Accounts)]
#[instruction(place_paid: u16)]
pub struct AddNFTTournamentPrizeParams<'info> {
    #[account(mut, constraint = tournament_account.has_started == false)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut,
        seeds = [
            tournament_account.key().as_ref(),
            place_paid.to_le_bytes().as_ref()
        ], 
        bump,
    )]
    pub tournament_nft_payout_account: SystemAccount<'info>,
    #[account(
        mut, 
        constraint = tournament_nft_token_account.owner == tournament_nft_payout_account.key(), 
        constraint = tournament_nft_token_account.mint == owner_nft_token_account.mint
    )]
    pub tournament_nft_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = owner_nft_token_account.owner == owner.key(),
        constraint = owner_nft_token_account.amount == 1,
    )]
    pub owner_nft_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = owner.key() == tournament_account.owner)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(place_paid: u16)]
pub struct RemoveNftTournamentPrizeParams<'info> {
    #[account(
        mut, 
        constraint = tournament_account.owner == owner.key(),
        constraint = tournament_account.has_started == false,
    )]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut,
        seeds = [
            tournament_account.key().as_ref(),
            place_paid.to_le_bytes().as_ref()
        ], 
        bump,
    )]
    pub tournament_nft_payout_account: SystemAccount<'info>,
    #[account(
        mut, 
        constraint = tournament_nft_token_account.owner == tournament_nft_payout_account.key(), 
        constraint = tournament_nft_token_account.mint == owner_nft_token_account.mint,
        constraint = owner_nft_token_account.amount == 1,
    )]
    pub tournament_nft_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = owner_nft_token_account.owner == owner.key()
    )]
    pub owner_nft_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = owner.key() == tournament_account.owner)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct NftTournamentPrizeData {
    pub place_paid: u16,
}

#[derive(Accounts)]
pub struct JoinTournamentParams<'info> {
    #[account(mut)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut, 
        constraint = tournament_token_account.owner == pda_account.key(), 
        constraint = tournament_token_account.mint == tournament_account.token_mint
    )]
    pub tournament_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.owner == player.key(),
        constraint = player_token_account.mint == tournament_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(
    init, 
    payer = player, 
    space = 30, 
    seeds = [
        tournament_account.key().as_ref(),
        player.key.as_ref()
    ], 
    bump,
    )]
    pub tournament_player_account: Account<'info, TournamentPlayerAccount>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        tournament_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct TournamentPlayerAccount {
    pub position_finished: u16, // 2
    pub has_busted: bool,       // 1
    pub rebuys: u16,            // 2
}


#[derive(Accounts)]
pub struct UpdateTournamentPayoutsParams<'info> {
    #[account(mut, constraint = tournament_account.owner == owner.key())]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct UpdateTournamentPayoutData {
    pub payouts: Vec<u16>,
}



#[derive(Accounts)]
pub struct FlipTournamentRegistrationParams<'info> {
    #[account(mut, constraint = tournament_account.owner == owner.key())]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UnregisterTournamentParams<'info> {
    #[account(mut)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut,
        seeds = [
            tournament_account.key().as_ref(),
            player.key.as_ref()
        ], 
        bump,
        close = player
        )]
    pub tournament_player_account: Account<'info, TournamentPlayerAccount>,
    #[account(
        mut, 
        constraint = tournament_token_account.owner == pda_account.key(), 
        constraint = tournament_token_account.mint == tournament_account.token_mint
    )]
    pub tournament_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.owner == player.key(),
        constraint = player_token_account.mint == tournament_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        tournament_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct RefundTournamentParams<'info> {
    #[account(mut)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut,
        seeds = [
            tournament_account.key().as_ref(),
            player_token_account.owner.as_ref()
        ], 
        bump,
        close = player
        )]
    pub tournament_player_account: Account<'info, TournamentPlayerAccount>,
    #[account(
        mut, 
        constraint = tournament_token_account.owner == pda_account.key(), 
        constraint = tournament_token_account.mint == tournament_account.token_mint
    )]
    pub tournament_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.mint == tournament_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        tournament_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    #[account(mut, constraint = owner.key() == tournament_account.owner)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub player: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct StartTournamentParams<'info> {
    #[account(mut, constraint = tournament_account.owner == owner.key())]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct BustTournamentParams<'info> {
    #[account(mut)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut,
        seeds = [
            tournament_account.key().as_ref(),
            player_token_account.owner.as_ref()
        ], 
        bump,
        close = player
        )]
    pub tournament_player_account: Account<'info, TournamentPlayerAccount>,
    #[account(
        mut, 
        constraint = tournament_token_account.owner == pda_account.key(), 
        constraint = tournament_token_account.mint == tournament_account.token_mint
    )]
    pub tournament_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, 
        constraint = player_token_account.mint == tournament_account.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    /// CHECK: pda account has no state;
    #[account(seeds = [
        tournament_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    #[account(mut, constraint = owner.key() == tournament_account.owner)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub player: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,   
}




#[derive(Accounts)]
pub struct CloseTournamentParams<'info> {
    #[account(mut, constraint = tournament_account.owner == owner.key(), close = owner)]
    pub tournament_account: Account<'info, TournamentAccount>,
    #[account(
        mut, 
        constraint = tournament_token_account.owner == pda_account.key(), 
        constraint = tournament_token_account.mint == tournament_account.token_mint
    )]
    pub tournament_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == tournament_account.token_mint
    )]
    pub owner_token_account: Account<'info, TokenAccount>, 
    /// CHECK: pda account has no state;
    #[account(seeds = [
        tournament_account.key().as_ref()
    ], bump)]
    pub pda_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,   
    pub system_program: Program<'info, System>,
}