This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Mappings database

Warehouse (GST prefix → site), product (SKU) and customer (site + state) mappings are stored in a SQLite database ([libSQL](https://docs.turso.tech/sdk/ts/quickstart)) and edited from the **Mappings** button in the app.

- **Locally**, with no `TURSO_DATABASE_URL` set, the database is the file `data/sales-converter.db` (git-ignored).
- **On Vercel**, the filesystem is read-only, so a hosted [Turso](https://turso.tech) database is required.
- Tables are created and seeded on the first request. Migrations live in `lib/db/migrations.ts`, and the seed copies the mappings that used to be hard-coded (`lib/db/seed-data/`).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `TURSO_DATABASE_URL` | Production (required on Vercel) | e.g. `libsql://sales-converter-<org>.turso.io`. A `file:` URL also works. |
| `TURSO_AUTH_TOKEN` | Production | Turso database token. |
| `APP_PASSWORD` | Production (required) | Shared password for the sign-in page. Without it, production refuses all access. Locally, leaving it unset turns sign-in off. Changing it signs everyone out. |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
