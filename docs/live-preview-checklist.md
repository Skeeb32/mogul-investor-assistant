# Vercel Preview smoke test

Use this checklist to evaluate the demo on a Vercel Preview deployment before sharing it. All data and credentials must be synthetic and isolated from production.

## 1. Prepare an isolated Preview

- Connect `Skeeb32/mogul-investor-assistant` to a Vercel project and deploy the `preview-live-smoke-test` branch as a Preview deployment.
- Create a dedicated, disposable PostgreSQL database with `pgvector` enabled. Do not point Preview at production or a database containing investor information.
- Apply `drizzle/0001_initial.sql` with a privileged migration connection. Configure the app's `DATABASE_URL` with a separate runtime role that does not own protected tables and does not have `BYPASSRLS`.
- Set Preview-only environment variables: a fresh `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, the isolated `DATABASE_URL`, `DEMO_MODE=true`, and a Preview-only `OPENAI_API_KEY` if testing AI and hosted speech.
- Set `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_SECOND_USER_EMAIL`, and `DEMO_SECOND_USER_PASSWORD`. Use two different email addresses and unique passwords of at least 14 characters. Never use the example credentials or reuse production secrets.
- Confirm `MAX_UPLOAD_MB` is no greater than 4. Keep Preview access limited to the test group; the demo credentials are intended only for this isolated environment.
- Run `npm run db:seed` from a trusted environment configured for the Preview database. This inserts fictional Brooklyn/Atlanta data for the admin account and a separate fictional Chicago holding for the investor account. The seed requires both demo passwords even if one account is not used.

## 2. Check sign-in and separate account data

- Open the HTTPS Preview URL and sign in as the admin demo user. Confirm the dashboard shows the Brooklyn and Atlanta demo holdings.
- Sign out. Sign in as the second investor in a separate private window or browser profile. Confirm the profile shows only the River North Demo Lofts Chicago holding and its sample distribution.
- In each session, ask the assistant for a portfolio summary and distributions. Check that values match the signed-in account and that the second investor receives no Brooklyn/Atlanta figures.
- Ask the second investor for the Clinton Hill Collection property by name. The assistant should report that the property is unavailable in this account.
- Create a conversation in the first account, then try loading its conversation ID while signed in as the second investor (and vice versa). The foreign conversation must not reveal messages; `GET /api/conversations/{id}` should return 404 for an inaccessible conversation.
- Sign out and confirm a protected API request such as `/api/conversations/{id}` cannot return private data without a valid session.

## 3. Check chat, documents, and permissions

- Ask account questions that exercise holdings, property details, transactions, and dashboard summary. Confirm answers use account tools and do not invent missing values.
- As the admin user, upload one small synthetic PDF, DOCX, HTML, CSV, and TXT file. Confirm each supported format completes, appears in the account's document list, and can be retrieved with a source citation. Repeat one upload to check duplicate handling.
- Include a test document containing an instruction such as “ignore prior directions.” Ask a question that retrieves it; the assistant must treat that text as document content rather than follow it.
- As the second investor, try uploading a file. The request should be rejected with HTTP 403 because investors do not have document-management permission.
- Try an upload larger than the configured limit and a cross-origin upload request; both should be rejected. Confirm unauthenticated chat and upload requests do not access account data.
- Send repeated chat requests and confirm the configured rate limit is enforced without leaking information across accounts.

## 4. Check voice and deployment behavior

- On HTTPS, test browser speech input in a supported Chrome or Edge browser. Confirm the transcript can be submitted and that the user can still type if speech recognition is unavailable or permission is denied.
- Test hosted speech playback with the Preview-only OpenAI key. Check that a missing key or provider error produces a usable failure state rather than breaking the conversation.
- Review Vercel function and database logs for failed requests, connection exhaustion, rate-limit errors, and unexpected secrets or document contents. Logs must not expose passwords, session tokens, API keys, or full uploaded files.
- Test on a narrow mobile viewport and verify sign-in, dashboard, chat, document upload, and audio controls remain usable.

## 5. Pass criteria and cleanup

The Preview is ready for a limited demo when both accounts can sign in, each sees only its own portfolio, foreign conversation reads are denied, role restrictions work, supported uploads return usable citations, and chat/voice fail safely when providers are unavailable. Record any issue and fix it before sharing the Preview.

After testing, remove the Preview-only environment secrets and delete the disposable database. Do not promote the synthetic-data deployment to Production. This checklist is a smoke test; it does not replace security review, load testing, backups, or operational monitoring.
