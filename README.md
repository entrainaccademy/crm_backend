# ENTRAIN CRM backend

Configure `MONGODB_URI` and `JWT_SECRET` (at least 32 characters) in the backend environment. The API refuses to start without a strong JWT secret.

Accounts are created by a Super Admin, who chooses each user's role and temporary password. Public sign-up is disabled. To create the first administrator, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters), then run `npm run bootstrap-admin`. Running that command again for the same Super Admin email updates that administrator's password without deleting data.

Start the API with `npm run dev` or `npm start`. The frontend uses `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:5000/api`. Sign in with the administrator account and create staff accounts in Users & Roles.

The four account roles are Super Admin, Data Analytics Manager, Team Lead, and Sales Executive. Super Admin can review all sales records and manage accounts, but cannot create leads. Data Analytics Manager can review sales records, create leads, and assign them to an active Team Lead or Sales Executive. Only one account can have the `Team Lead` role. That person can review the executives' work and update their own assigned leads and follow-ups, but cannot create leads or manage users. Sales Executive access remains limited to their own assigned work.

`npm run seed` replaces the demo collections. It requires `SEED_USER_PASSWORD` (at least 12 characters) and should only be run against a disposable demo database.
