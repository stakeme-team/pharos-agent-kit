# Pharos Agent Kit

You are working with the Pharos blockchain through an MCP server. This file tells you how to interact with it safely and effectively.

> **For continuing development:** Read `docs/SESSION_CONTEXT.md` for the full history of decisions, bugs fixed, and what's left to do.

## MCP Server

The Pharos MCP server is connected automatically via `.mcp.json`. It provides tools for:
- **Transactions**: `prepare_native_transfer`, `prepare_erc20_transfer`, `prepare_transaction`, `broadcast_signed_raw_transaction`, `wait_for_transaction`
- **Balances**: `get_balance`, `get_token_balance`
- **Blocks**: `list_evm_blocks`, `get_evm_block_by_height`
- **Contracts**: `read_evm_contract`, `verify_evm_contract_standard_json`, `get_evm_compiler_versions`
- **Tokens**: `list_erc20_tokens`, `get_erc20_token_by_address`, `get_erc721_token_by_address`
- **Faucet**: `claim_faucet_tokens`, `get_faucet_payout_status`
- **Explorer**: `explorer_search`, `get_account_by_address`

## SECURITY RULES — MANDATORY

### NEVER do any of the following:
- Read `.env` file (cat, head, tail, less, grep, or any other method)
- Read `.keystore/` directory or any files in it
- Access, print, or log the `PRIVATE_KEY` environment variable
- Run `env`, `printenv`, `set`, or `export` to list environment variables
- Use `generate_disposable_test_wallet` MCP tool (it exposes private keys)
- Store, display, or transmit any private key in any form

### Wallet address
Read `WALLET_ADDRESS` from `.env` using grep:
```bash
grep WALLET_ADDRESS .env | cut -d'=' -f2
```
This is the ONLY value you should read from `.env`.

## Transaction Signing Flow

You CANNOT sign transactions directly. Use the signing script:

### Step 1: Prepare transaction via MCP
Call `prepare_native_transfer` or `prepare_transaction` to get unsigned tx JSON.

### Step 2: Sign via sign-tx.ts
```bash
echo '<unsigned_tx_json>' | npx tsx scripts/sign-tx.ts
```
This reads the private key internally and returns ONLY the signed hex.

### Step 3: Broadcast via MCP
Call `broadcast_signed_raw_transaction` with the signed hex from step 2.

### Step 4: Wait for confirmation
Call `wait_for_transaction` with the tx hash.

## Faucet Flow

1. Get wallet address: `grep WALLET_ADDRESS .env | cut -d'=' -f2`
2. Call `claim_faucet_tokens` with the address
3. Call `get_faucet_payout_status` with the returned requestId (poll until complete)
4. Call `get_balance` to verify tokens received

## Contract Deployment Flow

1. Read bytecode from `contracts/compiled/SimpleStorage.json`
2. Call `prepare_transaction` with `from` = wallet address, no `to` field, `data` = bytecode
3. Sign: `echo '<unsigned_tx>' | npx tsx scripts/sign-tx.ts`
4. Broadcast signed tx
5. Wait for receipt — `contractAddress` field contains the deployed address
6. Verify using `verify_evm_contract_standard_json`

## Contract Verification Flow

1. Call `get_evm_compiler_versions` to find the correct Solidity version
2. Read source from `contracts/SimpleStorage.sol`
3. Call `verify_evm_contract_standard_json` with:
   - `address`: deployed contract address
   - `compilerType`: "solidity"
   - `compilerVersion`: from step 1
   - `standardJson`: compiler standard JSON input

## Wallet Setup

If `grep WALLET_ADDRESS .env` returns empty or .env doesn't exist, create a wallet:
```bash
npx tsx scripts/wallet-manager.ts generate --simple
```
This is SAFE to run — it outputs ONLY the wallet address. The private key is saved to `.env` internally but NEVER printed to stdout.

After creating, read the address:
```bash
grep WALLET_ADDRESS .env | cut -d'=' -f2
```

## Available Scripts

- `npx tsx scripts/sign-tx.ts` — Sign transaction (stdin JSON → stdout signed hex)
- `npx tsx scripts/wallet-manager.ts generate --simple` — Create wallet (safe — only outputs address)
- `npx tsx scripts/signer-daemon.ts` — Signing daemon (DO NOT run this — user runs it manually)
