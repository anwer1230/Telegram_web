---
name: GitHub push safety
description: Safe credential handling for GitHub pushes when source-control OAuth is unavailable.
---

Use the secure secrets flow for a replacement GitHub token and pass it only through a temporary, deleted askpass process. Never embed tokens in remote URLs, shell history, project files, logs, or chat.

**Why:** A token pasted into a chat or remote URL is exposed and must be revoked, even if the push succeeds.

**How to apply:** Prefer the connected GitHub integration. If it is unavailable, request a new token through the secrets flow, use it ephemerally for the push, remove the askpass file, and verify the remote commit without printing credentials.