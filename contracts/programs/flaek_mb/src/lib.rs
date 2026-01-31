use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::access_control::{
    instructions::{
        ClosePermissionCpiBuilder,
        CommitAndUndelegatePermissionCpiBuilder,
        CreatePermissionCpiBuilder,
        UpdatePermissionCpiBuilder,
    },
    structs::{Member, MembersArgs},
};
use ephemeral_rollups_sdk::cpi::DelegateConfig;

const STATE_SEED: &[u8] = b"state";

declare_id!("H2iGiWPCT13u76WXmK19pK5ssGh5gmR2NqcnKMVBfAFM");

#[ephemeral]
#[program]
pub mod flaek_mb {
    use super::*;

    pub fn init_state(ctx: Context<InitState>, value: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.owner = ctx.accounts.owner.key();
        state.value = value;
        Ok(())
    }

    pub fn create_permission(
        ctx: Context<CreatePermission>,
        account_type: AccountType,
        members: Option<Vec<Member>>,
    ) -> Result<()> {
        let seed_data = derive_seeds_from_account_type(&account_type);
        let bump = find_bump(&seed_data);
        let mut seeds = seed_data;
        seeds.push(vec![bump]);
        let seed_refs: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

        CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .permissioned_account(&ctx.accounts.permissioned_account.to_account_info())
            .permission(&ctx.accounts.permission)
            .payer(&ctx.accounts.payer)
            .system_program(&ctx.accounts.system_program)
            .args(MembersArgs { members })
            .invoke_signed(&[seed_refs.as_slice()])?;
        Ok(())
    }

    pub fn update_permission(
        ctx: Context<UpdatePermission>,
        account_type: AccountType,
        members: Option<Vec<Member>>,
    ) -> Result<()> {
        let seed_data = derive_seeds_from_account_type(&account_type);
        let bump = find_bump(&seed_data);
        let mut seeds = seed_data;
        seeds.push(vec![bump]);
        let seed_refs: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

        UpdatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .authority(&ctx.accounts.authority, true)
            .permissioned_account(&ctx.accounts.permissioned_account, true)
            .permission(&ctx.accounts.permission)
            .args(MembersArgs { members })
            .invoke_signed(&[seed_refs.as_slice()])?;
        Ok(())
    }

    pub fn commit_and_undelegate_permission(
        ctx: Context<CommitAndUndelegatePermission>,
        account_type: AccountType,
    ) -> Result<()> {
        let seed_data = derive_seeds_from_account_type(&account_type);
        let bump = find_bump(&seed_data);
        let mut seeds = seed_data;
        seeds.push(vec![bump]);
        let seed_refs: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

        CommitAndUndelegatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .authority(&ctx.accounts.authority, false)
            .permissioned_account(&ctx.accounts.permissioned_account, true)
            .permission(&ctx.accounts.permission)
            .magic_program(&ctx.accounts.magic_program)
            .magic_context(&ctx.accounts.magic_context)
            .invoke_signed(&[seed_refs.as_slice()])?;
        Ok(())
    }

    pub fn close_permission(
        ctx: Context<ClosePermission>,
        account_type: AccountType,
    ) -> Result<()> {
        let seed_data = derive_seeds_from_account_type(&account_type);
        let bump = find_bump(&seed_data);
        let mut seeds = seed_data;
        seeds.push(vec![bump]);
        let seed_refs: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

        ClosePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .payer(&ctx.accounts.payer)
            .authority(&ctx.accounts.authority, false)
            .permissioned_account(&ctx.accounts.permissioned_account, true)
            .permission(&ctx.accounts.permission)
            .invoke_signed(&[seed_refs.as_slice()])?;
        Ok(())
    }

    pub fn delegate_pda(ctx: Context<DelegatePda>, account_type: AccountType, validator: Option<Pubkey>) -> Result<()> {
        let seed_data = derive_seeds_from_account_type(&account_type);
        let seeds_refs: Vec<&[u8]> = seed_data.iter().map(|s| s.as_slice()).collect();

        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &seeds_refs,
            DelegateConfig {
                validator,
                ..Default::default()
            },
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(value: u64)]
pub struct InitState<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + State::LEN,
        seeds = [STATE_SEED, owner.key().as_ref()],
        bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePermission<'info> {
    /// CHECK: Checked by permission program CPI
    pub permissioned_account: UncheckedAccount<'info>,
    /// CHECK: Checked by permission program CPI
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Permission program
    pub permission_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePermission<'info> {
    /// CHECK: Checked by permission program CPI
    pub permissioned_account: UncheckedAccount<'info>,
    /// CHECK: Checked by permission program CPI
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Permission program
    pub permission_program: UncheckedAccount<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitAndUndelegatePermission<'info> {
    /// CHECK: Checked by permission program CPI
    pub permissioned_account: UncheckedAccount<'info>,
    /// CHECK: Checked by permission program CPI
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Permission program
    pub permission_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClosePermission<'info> {
    /// CHECK: Checked by permission program CPI
    pub permissioned_account: UncheckedAccount<'info>,
    /// CHECK: Checked by permission program CPI
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Permission program
    pub permission_program: UncheckedAccount<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegatePda<'info> {
    /// CHECK: PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
    pub payer: Signer<'info>,
    /// CHECK: Validator optional
    pub validator: Option<AccountInfo<'info>>,
}

#[account]
pub struct State {
    pub owner: Pubkey,
    pub value: u64,
}

impl State {
    pub const LEN: usize = 32 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum AccountType {
    State { owner: Pubkey },
}

fn derive_seeds_from_account_type(account_type: &AccountType) -> Vec<Vec<u8>> {
    match account_type {
        AccountType::State { owner } => vec![STATE_SEED.to_vec(), owner.to_bytes().to_vec()],
    }
}

fn find_bump(seed_data: &[Vec<u8>]) -> u8 {
    let seed_refs: Vec<&[u8]> = seed_data.iter().map(|s| s.as_slice()).collect();
    let (_, bump) = Pubkey::find_program_address(&seed_refs, &crate::ID);
    bump
}
