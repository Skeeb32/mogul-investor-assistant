# Mogul Investor Assistant

A demo-first real estate investor assistant with an authenticated portfolio dashboard, document-grounded chat, account tools, and voice output. Sample records and documents are fictional and clearly labeled. This is a starter application for evaluation; connect it to verified business data and complete a deployment review before using it with investor records.

## What it includes

- Next.js App Router, TypeScript, and a responsive dashboard/chat workspace
- Auth.js credentials sign-in with bcrypt password hashes and JWT sessions
- PostgreSQL with pgvector, Drizzle ORM, tenant scoped row-level security, audit records, and database-backed rate limits
- OpenAI chat, embeddings, retrieval and reranking, plus hosted text-to-speech
- Browser speech recognition for voice input where the browser supports it
- PDF, DOCX, HTML, CSV, and plain-text document ingestion
- Synthetic Brooklyn and Atlanta sample holdings and source documents
- Docker Compose for a local PostgreSQL and app setup

## Requirements

- Node.js 22.13 or newer and npm
- PostgreSQL 17 with the pgvector extension, or Docker Compose
- An OpenAI API key for chat, embeddings, reranking, and hosted speech output

Chat and sample account pages can run without an OpenAI key; AI answers and voice output require one. Document indexing works without a key using full-text search only, but the demo seed skips embeddings without a key.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `AUTH_SECRET` to a fresh secret, `DATABASE_URL` to your Postgres connection, and `OPENAI_API_KEY` to your key.
3. Install packages and apply the database schema:

   ```sh
   npm install
   npm run db:migrate
   ```

4. Choose a unique `DEMO_USER_PASSWORD` with at least 14 characters. Keep `DEMO_MODE=true` only for a demo environment, then seed the fictional account:

   ```sh
   npm run db:seed
   ```

5. Start the app with `npm run dev` and sign in at `/sign-in` using the values in `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD`.

The seed creates two fictional accounts for tenant-isolation checks. A second investor can sign in with `DEMO_SECOND_USER_EMAIL` and `DEMO_SECOND_USER_PASSWORD`. Use different, unique passwords for both accounts; production-mode seeding rejects the example passwords.

Never use the example password or synthetic records in a public deployment. The seed command refuses the example password when `NODE_ENV=production`.

## Docker Compose

Copy `.env.example` to `.env`, set a new `AUTH_SECRET`, `DEMO_USER_PASSWORD`, and `OPENAI_API_KEY`, then run:

```sh
docker compose up --build
```

The database initializes from `drizzle/0001_initial.sql`. In another terminal, seed the sample account:

```sh
docker compose exec app npm run db:seed
```

Open `http://localhost:3000`. The Compose database credentials are for local development only. Use managed secrets and a managed Postgres/pgvector service for hosted environments.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Secret used to sign Auth.js sessions; generate a unique value for each environment |
| `AUTH_TRUST_HOST` | Set to `true` when running behind a trusted proxy such as Vercel |
| `DATABASE_URL` | PostgreSQL connection URL with pgvector enabled |
| `OPENAI_API_KEY` | Enables model, embedding, reranking, and hosted speech calls |
| `OPENAI_CHAT_MODEL` | Chat model, defaults to `gpt-4.1-mini` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model, defaults to `text-embedding-3-small` (1536 dimensions) |
| `OPENAI_RERANK_MODEL` | Retrieval reranker, defaults to `gpt-4.1-mini` |
| `OPENAI_TTS_MODEL` / `OPENAI_TTS_VOICE` | Hosted speech output model and voice |
| `DEMO_MODE` | Must be `true` to seed synthetic fixtures |
| `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | Admin demo sign-in credentials; set a unique password of at least 14 characters |
| `DEMO_SECOND_USER_EMAIL` / `DEMO_SECOND_USER_PASSWORD` | Separate investor account for tenant-isolation checks; set a different unique password of at least 14 characters |
| `MAX_UPLOAD_MB` | Maximum document file size, capped at 4 MB for Vercel function payload limits |
| `CHAT_RATE_LIMIT_PER_MINUTE` | Per-user chat requests per minute |

## Documents

Analyst and admin users can upload supported documents from the app. Ingestion extracts text, splits it into chunks, generates embeddings when configured, and stores source metadata. Retrieval combines PostgreSQL full-text search and vector similarity, then reranks candidate passages. The assistant treats retrieved documents as evidence, not instructions, and returns citations. The app caps uploads at 4 MB to fit Vercel Functions' 4.5 MB request payload limit; larger files need a direct-to-object-storage upload flow.

To index a local file from the command line:

```sh
npm run ingest -- --file ./path/to/report.pdf --title "Q3 report" --source-type market_report
```

Optional flags are `--property <property-uuid>`, `--date YYYY-MM-DD`, and `--url https://...`. The account user must already exist and have the analyst or admin role. Use HTTPS source links.

## Vercel deployment

1. Provision PostgreSQL with pgvector and apply `drizzle/0001_initial.sql` (or run `npm run db:migrate` from a trusted release environment). Use a pooled connection string for the serverless runtime where your provider offers one.
2. Import the repository into Vercel and configure the environment variables above. Set a unique `AUTH_SECRET`, production database URL, and OpenAI key. Set `DEMO_MODE=false` after deciding whether you want synthetic data.
3. Deploy. Investors can create an individual account from `/sign-up`; each account starts with an empty, isolated portfolio. Email verification and password recovery are not implemented yet, so keep access limited while evaluating the demo.
4. For browser speech recognition, use a supported browser and a secure origin. Hosted speech playback is provided by OpenAI.

Vercel functions have deployment-specific execution and request limits. Confirm your plan's limits against document ingestion and database connection settings; use a background worker for larger ingestion workloads.

## Preview smoke test

Follow [`docs/live-preview-checklist.md`](docs/live-preview-checklist.md) to configure an isolated Vercel Preview environment and verify both seeded accounts before sharing the preview URL.

## Security and operating limits

- Authenticated identity determines account and user scope; model tool inputs cannot choose a user ID.
- Row-level security uses transaction-local identity settings. The runtime database role must not own protected tables or have `BYPASSRLS`; use a separate privileged migration role.
- Document uploads are restricted by role, file type, size, and same-origin checks. URL inputs must use HTTPS.
- Chat, speech, document changes, and sensitive tool actions are rate limited or audited.
- Demo data is fictional. There is no live Mogul platform integration, real-time property feed, payment flow, multi-factor authentication, email verification, or password recovery. Public investor self-registration creates an empty account with no portfolio data.
- Add monitoring, backups, secret rotation, account provisioning, retention rules, abuse controls, and a security review before production use.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## License

No license has been selected yet. Choose one before accepting outside contributions or reuse.
