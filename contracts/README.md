# Flaek MagicBlock Contracts

This workspace replaces the old `flaek_mxe` Arcium program. It provides a MagicBlock‑compatible Anchor program (`flaek_mb`) with permission and delegation hooks.

What’s included:
- Permission CPI helpers (create/update/commit/close)
- Delegation hook for PDAs
- Minimal `State` PDA example

Docs to follow when integrating:
- ER quickstart: https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart
- PER quickstart: https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/quickstart
- PER access control lifecycle: https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/access-control
- TEE client auth: https://docs.magicblock.gg/pages/tools/tee/client-implementation

Build + deploy:
```bash
anchor build
anchor deploy
```

Update `Anchor.toml` with your program ID and network wallet.
