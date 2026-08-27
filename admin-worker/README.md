# Growth Record admin API

Cloudflare Worker used by `/admin/`. It authenticates the repository owner with a GitHub App and writes Markdown posts and uploaded images through GitHub's Contents API.

Required Worker secrets:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`

The GitHub App must be installed only on `JM1260/Growth-Record` with **Contents: Read and write** and **Metadata: Read-only**.
