---
description: Run a user-triggered post-market trading review.
agent: opencode-trading
---
Use the `trading-daily-review` skill for the post-market phase and invoke the contradiction-check logic when inputs are available. Use `document-reader` for memory review and `data-analyst` for market files. Never write Vault files or memory tables. Validate output paths with `safe-output`. Arguments: $ARGUMENTS
