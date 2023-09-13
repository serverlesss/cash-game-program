use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Transfer};
pub mod errors;
pub use errors::PokerError;
pub mod state;
pub use state::*;
declare_id!("DyQWFkDFMrTm4rcLKC1ayM5fKpYdW3DLpybBPwvdWZS8");

#[program]
pub mod degods_poker_program {

    use anchor_spl::{
        associated_token::get_associated_token_address,
        token::{close_account, CloseAccount},
    };

    use super::*;

    pub fn create_cash_game(ctx: Context<CreateGameParams>, data: CreateGameData) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        msg!(
            "Creating game account with max players: {:?}",
            data.max_players
        );
        game_account.max_players = data.max_players;
        game_account.min_deposit = data.min_deposit;
        game_account.max_deposit = data.max_deposit;
        game_account.owner = *ctx.accounts.payer.key;
        game_account.token_mint = data.token_mint;
        game_account.players = Box::new(Vec::<SeatedPlayer>::with_capacity(
            data.max_players as usize,
        ));
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>, data: JoinGameArgs) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let game_token_account = &mut ctx.accounts.game_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let token_program = &ctx.accounts.token_program;
        let player = &ctx.accounts.player;
        if game_account.players.len() == (game_account.max_players as usize) {
            return Err(PokerError::GameFull.into());
        }
        if data.amount < game_account.min_deposit {
            return Err(PokerError::DepositTooSmall.into());
        }
        if data.amount > game_account.max_deposit {
            return Err(PokerError::DepositTooLarge.into());
        }
        if game_account
            .players
            .iter()
            .any(|p| p.address == player.key())
        {
            return Err(PokerError::AlreadyAtTable.into());
        }
        let cpi_accounts = Transfer {
            from: player_token_account.to_account_info().clone(),
            to: game_token_account.to_account_info().clone(),
            authority: player.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        transfer(CpiContext::new(cpi_program, cpi_accounts), data.amount)?;
        game_account.players.push(SeatedPlayer {
            address: player.key(),
        });
        Ok(())
    }

    pub fn add_chips(ctx: Context<AddChips>, data: AddChipsData) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let game_token_account = &mut ctx.accounts.game_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let token_program = &ctx.accounts.token_program;
        let player = &ctx.accounts.player;
        if game_account
            .players
            .iter()
            .all(|p| p.address != player.key())
        {
            return Err(PokerError::NotAtTable.into());
        }
        if data.amount > game_account.max_deposit {
            return Err(PokerError::DepositTooLarge.into());
        }
        let cpi_accounts = Transfer {
            from: player_token_account.to_account_info().clone(),
            to: game_token_account.to_account_info().clone(),
            authority: player.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        transfer(CpiContext::new(cpi_program, cpi_accounts), data.amount)?;
        Ok(())
    }

    pub fn eject_players<'info>(
        ctx: Context<'_, '_, '_, 'info, EjectPlayersAccounts<'info>>,
        data: EjectPlayersParams,
    ) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let game_token_account = &mut ctx.accounts.token_account;
        let token_program = &ctx.accounts.token_program;
        let pda_account = &mut ctx.accounts.pda_account;
        let from = &mut game_token_account.to_account_info().clone();
        let authority = &mut pda_account.to_account_info().clone();
        let cpi_program: AccountInfo<'_> = token_program.to_account_info();
        let game_account_key = game_account.key();
        let (_pda, _bump_seed) =
            Pubkey::find_program_address(&[game_account.key().as_ref()], ctx.program_id);
        let seed = game_account_key.as_ref();
        let mut i = 0;
        for player_token_account in ctx.remaining_accounts.into_iter() {
            let accounts = Transfer {
                to: player_token_account.clone(),
                authority: authority.clone(),
                from: from.to_account_info().clone(),
            };
            transfer(
                CpiContext::new_with_signer(
                    cpi_program.clone(),
                    accounts,
                    &[&[seed, &[_bump_seed]]],
                ),
                data.amounts[i],
            )?;
            i += 1;
        }
        game_account.players.retain(|p| {
            let token_addr =
                get_associated_token_address(&p.address.key(), &game_token_account.mint.key());
            return !ctx
                .remaining_accounts
                .into_iter()
                .any(|r| r.key() == token_addr);
        });
        Ok(())
    }

    pub fn refund_player(
        ctx: Context<RefundPlayerAccounts>,
        data: RefundPlayerParams,
    ) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let game_token_account = &mut ctx.accounts.game_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let pda_account = &mut ctx.accounts.pda_account;
        let authority = &mut pda_account.to_account_info().clone();
        let token_program = &ctx.accounts.token_program;
        let payer = &ctx.accounts.payer;
        if payer.key() != game_account.owner {
            return Err(PokerError::NotGameOwner.into());
        }
        if game_account
            .players
            .iter()
            .all(|p| p.address != player_token_account.owner.key())
        {
            return Err(PokerError::NotAtTable.into());
        }
        let cpi_accounts = Transfer {
            from: game_token_account.to_account_info().clone(),
            to: player_token_account.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        let game_account_key = game_account.key();
        let (_pda, _bump_seed) =
            Pubkey::find_program_address(&[game_account.key().as_ref()], ctx.program_id);
        let seed = game_account_key.as_ref();
        transfer(
            CpiContext::new_with_signer(
                cpi_program.clone(),
                cpi_accounts,
                &[&[seed, &[_bump_seed]]],
            ),
            data.amount,
        )?;
        Ok(())
    }

    pub fn close_game(ctx: Context<CloseGame>) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let game_token_account = &mut ctx.accounts.game_token_account;
        let payer_token_account = &mut ctx.accounts.payer_token_account;
        let pda_account = &mut ctx.accounts.pda_account;
        let token_program = &ctx.accounts.token_program;
        let payer = &ctx.accounts.payer;
        if game_account.owner != payer.key() {
            return Err(PokerError::NotGameOwner.into());
        }
        if game_account.players.len() > 0 {
            return Err(PokerError::PlayersStillAtTable.into());
        }
        let accounts = Transfer {
            to: payer_token_account.to_account_info().clone(),
            authority: pda_account.to_account_info().clone(),
            from: game_token_account.to_account_info().clone(),
        };
        let game_account_key = game_account.key();
        let seed = game_account_key.as_ref();
        let (_pda, _bump_seed) =
            Pubkey::find_program_address(&[game_account.key().as_ref()], ctx.program_id);
        // this all the tokens left over from the game, basically the rake;
        if game_token_account.amount > 0 {
            transfer(
                CpiContext::new_with_signer(
                    token_program.to_account_info().clone(),
                    accounts,
                    &[&[seed, &[_bump_seed]]],
                ),
                game_token_account.amount,
            )?;
        }
        close_account(CpiContext::new_with_signer(
            token_program.to_account_info(),
            CloseAccount {
                account: game_token_account.to_account_info(),
                destination: payer.to_account_info(),
                authority: pda_account.to_account_info(),
            },
            &[&[seed, &[_bump_seed]]],
        ))?;
        Ok(())
    }

    pub fn create_tournament(
        ctx: Context<CreateTournamentParams>,
        data: CreateTournamentData,
    ) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let transactor = &ctx.accounts.transactor;
        let owner = &ctx.accounts.owner;
        tournament_account.owner = *ctx.accounts.owner.key;
        tournament_account.token_mint = data.token_mint;
        tournament_account.max_players = data.max_players;
        tournament_account.entry_cost = data.entry_cost;
        tournament_account.entry_fee = data.entry_fee;
        tournament_account.players = 0;
        tournament_account.players_with_rebuys = 0;
        tournament_account.registration_open = data.registration_open;
        tournament_account.payouts = data.initial_payouts;
        tournament_account.has_started = false;
        tournament_account.transactor = transactor.key();
        tournament_account.nft_payouts = Vec::from([]);
        if tournament_account.payouts.len() > 1 {
            tournament_account.min_players = tournament_account.payouts.len() as u16;
        } else {
            tournament_account.min_players = 2;
        }
        if data.guarantee != 0 {
            tournament_account.guarantee = data.guarantee;
            let owner_token_account = &mut ctx.accounts.owner_token_account;
            let tournament_token_account = &mut ctx.accounts.tournament_token_account;
            let token_program = &ctx.accounts.token_program;
            let cpi_accounts = Transfer {
                from: owner_token_account.to_account_info().clone(),
                to: tournament_token_account.to_account_info().clone(),
                authority: owner.to_account_info().clone(),
            };
            let cpi_program = token_program.to_account_info();
            transfer(
                CpiContext::new(cpi_program.clone(), cpi_accounts),
                data.guarantee,
            )?;
        }
        Ok(())
    }

    pub fn add_nft_tournament_prize(
        ctx: Context<AddNFTTournamentPrizeParams>,
        data: NftTournamentPrizeData,
    ) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let owner = &ctx.accounts.owner;
        let tournament_nft_token_account = &mut ctx.accounts.tournament_nft_token_account;
        let owner_nft_token_account = &mut ctx.accounts.owner_nft_token_account;
        let token_program = &ctx.accounts.token_program;
        let cpi_accounts = Transfer {
            from: owner_nft_token_account.to_account_info().clone(),
            to: tournament_nft_token_account.to_account_info().clone(),
            authority: owner.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        transfer(CpiContext::new(cpi_program.clone(), cpi_accounts), 1)?;
        tournament_account.nft_payouts.push(data.place_paid);
        if data.place_paid > tournament_account.min_players {
            tournament_account.min_players = data.place_paid;
        }
        Ok(())
    }

    pub fn remove_nft_tournament_prize(
        ctx: Context<RemoveNftTournamentPrizeParams>,
        data: NftTournamentPrizeData,
    ) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let owner = &ctx.accounts.owner;
        let tournament_nft_token_account = &mut ctx.accounts.tournament_nft_token_account;
        let owner_nft_token_account = &mut ctx.accounts.owner_nft_token_account;
        let token_program = &ctx.accounts.token_program;
        let cpi_accounts = Transfer {
            from: owner_nft_token_account.to_account_info().clone(),
            to: tournament_nft_token_account.to_account_info().clone(),
            authority: owner.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        transfer(CpiContext::new(cpi_program.clone(), cpi_accounts), 1)?;
        let index = tournament_account
            .nft_payouts
            .iter()
            .position(|&r| r == data.place_paid)
            .unwrap();
        tournament_account.nft_payouts.remove(index);
        let max = *tournament_account.nft_payouts.iter().max().unwrap();
        if max < tournament_account.min_players && max > 2 {
            tournament_account.min_players = max;
        }
        Ok(())
    }

    pub fn update_tournament_payouts(
        ctx: Context<UpdateTournamentPayoutsParams>,
        data: UpdateTournamentPayoutData,
    ) -> Result<()> {
        let total_payouts = data.payouts.iter().sum::<u16>();
        if total_payouts != 1000 {
            return Err(PokerError::InvalidPayoutsArray.into());
        }
        let tournament_account = &mut ctx.accounts.tournament_account;
        tournament_account.payouts = data.payouts;
        Ok(())
    }

    pub fn flip_tournament_registration(
        ctx: Context<FlipTournamentRegistrationParams>,
    ) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        tournament_account.registration_open = !tournament_account.registration_open;
        Ok(())
    }

    pub fn register_tournament(ctx: Context<JoinTournamentParams>) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let tournament_token_account = &mut ctx.accounts.tournament_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let token_program = &ctx.accounts.token_program;
        let player = &ctx.accounts.player;
        if tournament_account.players == tournament_account.max_players {
            return Err(PokerError::GameFull.into());
        }
        tournament_account.players += 1;
        tournament_account.players_with_rebuys += 1;
        let cpi_accounts = Transfer {
            from: player_token_account.to_account_info().clone(),
            to: tournament_token_account.to_account_info().clone(),
            authority: player.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();

        transfer(
            CpiContext::new(cpi_program, cpi_accounts),
            tournament_account.entry_cost + tournament_account.entry_fee,
        )?;
        Ok(())
    }

    pub fn unregister_tournament(ctx: Context<UnregisterTournamentParams>) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let tournament_token_account = &mut ctx.accounts.tournament_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let pda_account = &mut ctx.accounts.pda_account;
        let token_program = &ctx.accounts.token_program;
        if tournament_account.has_started {
            return Err(PokerError::TournamentAlreadyStarted.into());
        }
        tournament_account.players -= 1;
        tournament_account.players_with_rebuys -= 1;
        let authority = &mut pda_account.to_account_info().clone();
        let cpi_accounts = Transfer {
            from: tournament_token_account.to_account_info().clone(),
            to: player_token_account.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        let tournament_account_key = tournament_account.key();
        let seed = tournament_account_key.as_ref();
        let (_pda, bump_seed) =
            Pubkey::find_program_address(&[tournament_account.key().as_ref()], ctx.program_id);
        transfer(
            CpiContext::new_with_signer(
                cpi_program.clone(),
                cpi_accounts,
                &[&[seed, &[bump_seed]]],
            ),
            tournament_account.entry_cost + tournament_account.entry_fee,
        )?;
        Ok(())
    }

    pub fn refund_tournament(ctx: Context<RefundTournamentParams>) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let tournament_token_account = &mut ctx.accounts.tournament_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let pda_account = &mut ctx.accounts.pda_account;
        let token_program = &ctx.accounts.token_program;
        tournament_account.players -= 1;
        tournament_account.players_with_rebuys -= 1;
        let authority = &mut pda_account.to_account_info().clone();
        let cpi_accounts = Transfer {
            from: tournament_token_account.to_account_info().clone(),
            to: player_token_account.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        let tournament_account_key = tournament_account.key();
        let seed = tournament_account_key.as_ref();
        let (_pda, bump_seed) =
            Pubkey::find_program_address(&[tournament_account.key().as_ref()], ctx.program_id);
        transfer(
            CpiContext::new_with_signer(
                cpi_program.clone(),
                cpi_accounts,
                &[&[seed, &[bump_seed]]],
            ),
            tournament_account.entry_cost + tournament_account.entry_fee,
        )?;
        Ok(())
    }

    pub fn start_tournament(ctx: Context<StartTournamentParams>) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        if tournament_account.has_started {
            return Err(PokerError::TournamentAlreadyStarted.into());
        }
        if tournament_account.players < 2 {
            return Err(PokerError::NotEnoughPlayersToStartTournament.into());
        }
        tournament_account.has_started = true;
        Ok(())
    }

    pub fn payout_tournament_player(ctx: Context<BustTournamentParams>) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let tournament_token_account = &mut ctx.accounts.tournament_token_account;
        let player_token_account = &mut ctx.accounts.player_token_account;
        let pda_account = &mut ctx.accounts.pda_account;
        let token_program = &ctx.accounts.token_program;
        if !tournament_account.has_started {
            return Err(PokerError::TournamentNotStarted.into());
        }
        // technically you could bust before registration closes and be in the money.  We should just not do that...;
        if !tournament_account.registration_open
            // if the number of payouts we send out if great than or equal to the players left, the guy who busted is in the money;
            && tournament_account.payouts.len() >= tournament_account.players as usize
        {
            let mut total_payout =
                tournament_account.entry_cost * tournament_account.players_with_rebuys as u64;
            if tournament_account.guarantee > total_payout {
                total_payout = tournament_account.guarantee;
            }
            let current_payout = (*tournament_account
                .payouts
                .get((tournament_account.players as usize) - 1)
                .unwrap() as u64
                * total_payout)
                / 1000;
            let authority = &mut pda_account.to_account_info().clone();
            let cpi_accounts = Transfer {
                from: tournament_token_account.to_account_info().clone(),
                to: player_token_account.to_account_info().clone(),
                authority: authority.to_account_info().clone(),
            };
            let cpi_program = token_program.to_account_info();
            let tournament_account_key = tournament_account.key();
            let seed = tournament_account_key.as_ref();
            let (_pda, bump_seed) =
                Pubkey::find_program_address(&[tournament_account.key().as_ref()], ctx.program_id);
            transfer(
                CpiContext::new_with_signer(
                    cpi_program.clone(),
                    cpi_accounts,
                    &[&[seed, &[bump_seed]]],
                ),
                current_payout,
            )?;
        }
        tournament_account.players -= 1;
        Ok(())
    }

    pub fn close_tournament(ctx: Context<CloseTournamentParams>) -> Result<()> {
        let tournament_account = &mut ctx.accounts.tournament_account;
        let tournament_token_account = &mut ctx.accounts.tournament_token_account;
        let pda_account = &mut ctx.accounts.pda_account;
        let owner_token_account = &mut ctx.accounts.owner_token_account;
        let owner = &ctx.accounts.owner;
        let token_program = &ctx.accounts.token_program;

        if tournament_account.players != 0 {
            return Err(PokerError::PlayersStillAtTable.into());
        }

        if tournament_account.nft_payouts.len() > 1 {
            return Err(PokerError::NFTsEscrowedInTournament.into());
        }

        let cpi_program = token_program.to_account_info();
        let tournament_account_key = tournament_account.key();
        let seed = tournament_account_key.as_ref();
        let (_pda, bump_seed) =
            Pubkey::find_program_address(&[tournament_account.key().as_ref()], ctx.program_id);
        let authority = &mut pda_account.to_account_info().clone();
        let owner_cpi_accounts = Transfer {
            from: tournament_token_account.to_account_info().clone(),
            to: owner_token_account.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        transfer(
            CpiContext::new_with_signer(
                cpi_program.clone(),
                owner_cpi_accounts,
                &[&[seed, &[bump_seed]]],
            ),
            // there could be left over guarantee here?;
            tournament_token_account.amount,
        )?;
        let (_pda, _bump_seed) =
            Pubkey::find_program_address(&[tournament_account.key().as_ref()], ctx.program_id);
        close_account(CpiContext::new_with_signer(
            token_program.to_account_info(),
            CloseAccount {
                account: tournament_token_account.to_account_info(),
                destination: owner.to_account_info(),
                authority: authority.to_account_info(),
            },
            &[&[seed, &[_bump_seed]]],
        ))?;
        Ok(())
    }
}
