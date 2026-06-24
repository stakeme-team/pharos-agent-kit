#!/bin/bash
#
# guard.sh — Claude Code PreToolUse hook
# Blocks bash commands that attempt to read .env, private keys, or keystore files.
#
# Exit codes:
#   0 = allow command
#   2 = block command (Claude Code convention)
#
# Usage in .claude/settings.json:
#   "hooks": { "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "scripts/guard.sh \"$TOOL_INPUT\"" }] }] }

INPUT="$1"

# ALLOW: grep WALLET_ADDRESS .env (used by skills and CLAUDE.md)
if echo "$INPUT" | grep -qE '^grep WALLET_ADDRESS \.env'; then
  exit 0
fi

# Patterns that indicate an attempt to read secrets
BLOCKED_PATTERNS=(
  # Direct file reads of .env
  'cat.*\.env'
  'head.*\.env'
  'tail.*\.env'
  'less.*\.env'
  'more.*\.env'
  'bat.*\.env'
  'vi.*\.env'
  'vim.*\.env'
  'nano.*\.env'
  'open.*\.env'
  'code.*\.env'

  # Copying/moving .env
  'cp.*\.env'
  'mv.*\.env'

  # Grep/search for private key
  'grep.*PRIVATE_KEY'
  'grep.*\.env'
  'awk.*\.env'
  'sed.*\.env'
  'rg.*\.env'
  'ag.*\.env'

  # Environment variable extraction
  'echo.*PRIVATE_KEY'
  'echo.*PRIVATE'
  'echo.*\$PRIVATE'
  'printf.*PRIVATE_KEY'
  'printf.*PRIVATE'
  'env.*grep.*PRIVATE'
  'printenv.*PRIVATE'
  'set.*grep.*PRIVATE'
  'export.*grep.*PRIVATE'

  # Binary/encoding tools on .env
  'base64.*\.env'
  'xxd.*\.env'
  'od.*\.env'
  'hexdump.*\.env'

  # Scripting language access
  'python.*\.env'
  'python3.*\.env'
  'node.*\.env'
  'ruby.*\.env'
  'perl.*\.env'
  'php.*\.env'

  # Keystore and password file access
  'cat.*\.keystore'
  'head.*\.keystore'
  'tail.*\.keystore'
  'less.*\.keystore'
  'cp.*\.keystore'
  'grep.*\.keystore'
  'cat.*\.password'
  'head.*\.password'
  'cp.*\.password'

  # Process environment sniffing
  '/proc/.*/environ'
  'xargs.*env'
  'strings.*\.env'

  # Exfiltration attempts
  'curl.*PRIVATE'
  'curl.*\$PRIVATE'
  'curl.*\.env'
  'wget.*PRIVATE'
  'wget.*\$PRIVATE'
  'wget.*\.env'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$INPUT" | grep -iqE "$pattern"; then
    echo "BLOCKED: Access to private keys or .env is forbidden" >&2
    echo "The private key is managed by sign-tx.ts — use that instead" >&2
    exit 2
  fi
done

# Allow the command
exit 0
