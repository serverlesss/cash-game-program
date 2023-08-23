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
    pub status: GameStatus,              // 2
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
    // 42
    pub address: Pubkey, // 32
    pub balance: u64,    // 8
    pub add_on: u64,     // 8
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GameStatusData {
    pub status: GameStatus,
}

// Game Status

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum GameStatus {
    Active,
    Inactive,
}

#[derive(Accounts)]
pub struct SetGameStatus<'info> {
    #[account(mut, constraint = game_account.owner == payer.key())]
    pub game_account: Account<'info, GameAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
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

// Settle;

#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum SettleOp {
    Add(u64),
    Sub(u64),
}

#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct Settle {
    pub addr: Pubkey,
    pub op: SettleOp,
}

#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct SettleParams {
    pub settles: Vec<Settle>,
}

#[derive(Accounts)]
pub struct SettleAccounts<'info> {
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
