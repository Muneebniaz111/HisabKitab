# Hisab-Kitab

A personal income, expense, transfer, and savings ledger.

Built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Features

- Account management
- Income, expense, and transfer tracking
- Savings goals and allocations
- Recurring transactions
- Monthly ledger and reports
- Category-based reporting
- Account statements
- CSV exports
- Email notifications
- Responsive interface
- Authentication

## Project Status

The main application phases are complete:

| Phase | Scope | Status |
|---|---|---|
| 1 | Project setup, data model, UI foundation | Complete |
| 2 | Accounts | Complete |
| 3 | Transactions | Complete |
| 4 | Savings goals | Complete |
| 5 | Reports and analytics | Complete |
| 6 | Authentication, recurring transactions, polish | Complete |

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Supabase
- Recharts
- Zod

## Project Structure

```text
app/            Application routes and pages
components/     Reusable UI components
lib/             Application and domain utilities
prisma/          Database schema and migrations
public/          Static assets
```

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Configure the required database and application settings in `.env`.

Generate the Prisma client and apply the database migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## Environment Variables

Keep environment variables in `.env` and never commit secrets to source control.

Use `.env.example` as the reference for the variables required by the project.

For production deployments, configure environment variables through the hosting platform rather than storing them in the repository.

## Database

The project uses Prisma for database access and PostgreSQL for persistent data.

After changing the Prisma schema, create and apply an appropriate migration before running the updated application.

## Authentication

Authentication is handled by the configured authentication provider.

For local development, make sure the application's authentication redirect/callback URL is configured for your local application URL.

For production, configure the corresponding production URL with the authentication provider.

## Recurring Transactions

Recurring transactions can be processed automatically in supported production environments.

Local development also supports normal application-driven processing.

## Notifications

Email notifications are optional. If email delivery is not configured, the application can continue operating without notification delivery.

## Development Notes

- Keep secrets and private configuration outside the repository.
- Do not commit `.env` files containing credentials.
- Review database migrations before applying them to production.
- Test changes locally before deployment.
- Keep dependencies and framework versions consistent with the project configuration.

## Production Deployment

The application can be deployed to a supported Next.js hosting environment with a PostgreSQL database.

Before deployment:

1. Configure production environment variables.
2. Configure authentication URLs.
3. Apply database migrations.
4. Verify database connectivity.
5. Verify the application build.
6. Test authentication and core financial workflows.

## Domain Model

The application tracks:

- Accounts
- Categories
- Transactions
- Recurring transactions
- Savings goals
- Savings activity

Transfers move funds between accounts and are treated separately from income and expenses.

Savings activity is tracked separately from ordinary transaction activity.

Recurring transaction rules create transaction history so past activity remains available even when a recurring rule changes.

## Security Practices

This repository intentionally keeps operational and security-sensitive implementation details out of the public README.

Do not publish:

- API keys or access tokens
- Database connection strings
- Authentication secrets
- Cron or webhook secrets
- Private service credentials
- Internal infrastructure details
- Detailed authorization logic
- Detailed database/security assumptions
- Unnecessary descriptions of race-condition handling or transaction internals

For security issues, avoid publishing sensitive details in public issues. Report them through the project's private security-reporting channel.

## License

Add the project's license information here.
