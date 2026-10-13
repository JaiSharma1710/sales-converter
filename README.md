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

## How it works

Nothing is stored. Everything happens in the browser, in three steps on one page. All messages are in English and Hindi.

1. **Amazon FBA sales report.** The sheet with the transactions is found automatically. Only `Shipment` rows are used. Orders are grouped by `Ship From State` (one warehouse per state).
2. **Product code file and division file** (`ECOM PRODUCT CODE MASTER.xlsx`, `ECOM DIVISION MASTER.xlsx`: `PRODUCT NAME` + `PRODUCT CODE` / `DIVISION`). Every SKU in the report must be in both files.
3. **One warehouse file per state** in the report (e.g. `Master Sheet - FBA-MAH-WM0B2.xlsx`). It's either uploaded per box or all at once, and each file goes to the right box by its home state.
   - Customers are read from the sheet with `site_code`, `State` and `cust_code`.
   - **TAX_ENV comes from the column next to the repeated State column (usually H).** In several files the labelled `TAX_ENV` column (F) is empty or wrong. If there's no repeated State column, the labelled one is used.
   - The home state is the one state whose tax env is not `SGST01` (e.g. `SMH`).
   - A J&K row whose customer name contains "LADAKH" counts as LADAKH.
   - State names are matched loosely (`&`/`AND`, case, `LAKSHADWEEPISLAND` = `LAKSHADWEEP`).

When a state's file passes, "Open file" shows the generated sales order (Header + Details) with a download button. Every problem says what is wrong, where (file, sheet, row, column), and how to fix it.

The logic lives in `lib/import/`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `APP_PASSWORD` | Production (required) | Shared password for the sign-in page. Without it, production refuses all access. Locally, leaving it unset turns sign-in off. Changing it signs everyone out. |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
