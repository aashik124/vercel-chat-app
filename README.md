# Vercel Remote Chat App

This version is made for Vercel and remote users. It uses:

- Static browser UI in `public/`
- Vercel API routes in `api/`
- Supabase database for permanent accounts, sessions, messages, and admin management

## 1. Create Supabase Project

1. Go to Supabase and create a project.
2. Open the SQL editor.
3. Run everything in `supabase-schema.sql`.

## 2. Add Environment Variables

In Vercel project settings, add:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=choose-a-strong-admin-password
```

Use the Supabase `service_role` key only in Vercel environment variables. Do not put it in frontend JavaScript.

## 3. Deploy to Vercel

From this folder:

```powershell
npm install
npx vercel
```

For production:

```powershell
npx vercel --prod
```

You can also upload/import this folder in the Vercel dashboard.

## Features

- Remote users can create accounts and passwords.
- Users can log in later from any browser.
- Users can search by name or ID.
- Messages are stored permanently in Supabase.
- Admin mode can view accounts, passwords, message counts, sessions, and delete accounts.
- Admin password is controlled by `ADMIN_PASSWORD`.

## Important Security Note

This learning project stores readable passwords because you asked to show forgotten passwords. Real public apps should never store readable passwords. A production app should use password reset links instead.

## Local Development

Create `.env.local` from `.env.example`, fill in values, then run:

```powershell
npm install
npx vercel dev
```
