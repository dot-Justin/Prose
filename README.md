# Prose

## Setup

### Option A - Claude Subscription (recommended, Pro/Max)
1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Run: `claude setup-token`
3. Copy the `sk-ant-oat01-...` token
4. Open Prose -> Settings -> select `Claude Subscription` -> paste token

### Option B - API Key (pay-per-use)
1. Go to `console.anthropic.com` -> API Keys
2. Create a key
3. Open Prose -> Settings -> select `API Key` -> paste key

Note: The Agent SDK requires Claude Code CLI installed locally (`npm install -g @anthropic-ai/claude-code`). This is one-time setup.

Docker users: Claude Code CLI is pre-installed in the container image.
