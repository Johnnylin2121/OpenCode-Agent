---
description: Run a user-triggered intraday trading validation.
agent: opencode-trading
---
Use the `trading-daily-review` skill for the intraday phase. Use `trading-researcher` for public data and `document-reader` for Vault reads. Do not create background jobs or send notifications. Read Vault files only, access public data only when required, and validate output paths with `safe-output`. Arguments: $ARGUMENTS
