# rock em

An open-source programming interview platform.

## Development

### Frontend

Install dependencies:

```bash
cd frontend
npm ci
```

Start the development server:

```bash
npm run dev
```

Run the linter:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

### Problem generator

The home page can generate original practice problems from a topic you want
to learn, an optional industry or theme, and a level. Each problem comes with
test cases, which are checked against a reference solution before the problem
opens.

Generation runs through the backend and needs an Anthropic API key. Add it to
`backend/.env`:

```bash
ANTHROPIC_API_KEY="sk-ant-..."
```

Then start the backend (`go run ./cmd/api` from `backend/` after sourcing
`dev-env.sh`). The frontend dev server proxies `/api` to it.

### Accounts and problem management

The backend supports user accounts, cookie sessions, admin problem management,
and per-user bookmarks/progress. See [API setup and reference](docs/api.md) for
migrations, local cookie settings, admin provisioning, and request examples.
