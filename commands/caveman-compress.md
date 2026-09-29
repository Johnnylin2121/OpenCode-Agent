---
description: Compress a natural-language file locally with caveman-compress.
agent: opencode-default
---
Load the `caveman-compress` skill. Before any file write, read the target, confirm the user explicitly authorized overwriting it, create the documented backup, use only the local/manual path by default, and validate the output path with safe-output. Do not send file contents to an external model unless the user explicitly opts in. Record the writer and timezone-aware time in any authorized knowledge-base log. Arguments: $ARGUMENTS
