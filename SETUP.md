# 🚛 Fleet Daily Report — Setup Guide

Follow these steps **in order**. Takes about 15–20 minutes total.

---

## STEP 1 — Create Supabase Database

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New Project** → name it `fleet-report` → choose a region close to you → create
3. Wait ~2 minutes for it to start
4. In your project, go to **SQL Editor** (left sidebar)
5. Paste and run this SQL to create the table:

```sql
create table fleet_entries (
  id             bigserial primary key,
  truck_number   text        not null,
  driver_name    text,
  trip_status    text        not null check (trip_status in ('followed','skipped')),
  skipped_stops  text[]      default '{}',
  skip_reason    text,
  monitor_status text        check (monitor_status in ('confirmed','flagged')),
  monitor_notes  text,
  report_date    date        not null default current_date,
  created_at     timestamptz default now()
);

-- Allow the app (anon key) to read and insert
alter table fleet_entries enable row level security;

create policy "Anyone can insert"
  on fleet_entries for insert
  with check (true);

create policy "Anyone can read today"
  on fleet_entries for select
  using (true);

create policy "Anyone can update monitor fields"
  on fleet_entries for update
  using (true)
  with check (true);

create policy "Anyone can delete"
  on fleet_entries for delete
  using (true);
```

6. Go to **Settings → API** in Supabase
7. Copy:
   - **Project URL** → you'll need this
   - **anon/public key** → you'll need this
   - **service_role key** → you'll need this (keep it secret!)

---

## STEP 2 — Configure the App

1. Open `index.html` in a text editor
2. Find these two lines near the top of the `<script>`:

```js
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';
```

3. Replace with your actual values:

```js
const SUPABASE_URL  = 'https://xyzxyzxyz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJ...your anon key...';
```

---

## STEP 3 — Create GitHub Repository

1. Go to **https://github.com** → New repository
2. Name it `fleet-report` → Public → Create
3. Upload all files keeping the folder structure:
   ```
   fleet-report/
   ├── index.html
   ├── SETUP.md
   └── .github/
       └── workflows/
           ├── daily-report.yml
           └── send-report.js
   ```
4. Go to **Settings → Pages**
5. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`
6. Your app is now live at: `https://YOUR-USERNAME.github.io/fleet-report`

---

## STEP 4 — Get Gmail App Password

> ⚠️ Do NOT use your regular Gmail password. You need an **App Password**.

1. Go to your Google Account → **https://myaccount.google.com**
2. Click **Security** → make sure **2-Step Verification is ON**
3. Search for **"App passwords"** or go to **https://myaccount.google.com/apppasswords**
4. Select app: **Mail** → Select device: **Other** → type `Fleet Report Bot`
5. Click **Generate** → copy the **16-character password** (e.g. `abcd efgh ijkl mnop`)
6. Remove the spaces: `abcdefghijklmnop` ← this is your `GMAIL_APP_PASSWORD`

---

## STEP 5 — Add GitHub Secrets

1. In your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret** and add each of these:

| Secret Name             | Value                                          |
|------------------------|------------------------------------------------|
| `SUPABASE_URL`          | Your Supabase project URL                      |
| `SUPABASE_SERVICE_KEY`  | Your Supabase **service_role** key             |
| `GMAIL_USER`            | Your Gmail address (e.g. yourname@gmail.com)   |
| `GMAIL_APP_PASSWORD`    | The 16-char app password from Step 4           |
| `REPORT_EMAIL_TO`       | `kamal.m.taleb@gmail.com`                      |

---

## STEP 6 — Set Your Timezone

The workflow is set for **Lebanon time (UTC+3 in summer, UTC+2 in winter)**.

Open `.github/workflows/daily-report.yml` and check the cron line:

```yaml
- cron: '59 20 * * *'   # 23:59 Beirut time (UTC+3 summer)
```

- **Summer (UTC+3):** `59 20 * * *` = 23:59 Beirut
- **Winter (UTC+2):** `59 21 * * *` = 23:59 Beirut

Update this when clocks change.

---

## STEP 7 — Test It

1. Go to your GitHub repo → **Actions** tab
2. Click **Daily Fleet Report — Email & Clear**
3. Click **Run workflow** → **Run workflow**
4. Watch the logs — should show "Email sent" and "Deleted X entries"
5. Check `kamal.m.taleb@gmail.com` for the report email

---

## How It Works Daily

```
23:59 Beirut time
    ↓
GitHub Actions wakes up
    ↓
Fetches all entries for today from Supabase
    ↓
Builds a PDF-ready HTML report
    ↓
Emails it to kamal.m.taleb@gmail.com
    ↓
Deletes all today's entries from Supabase
    ↓
App is clean and ready for tomorrow
```

---

## Troubleshooting

**App shows "Setup Required"**
→ You haven't filled in `SUPABASE_URL` and `SUPABASE_ANON` in `index.html` yet.

**Connection dot is red**
→ Check your Supabase URL and anon key are correct. Check the SQL policies were created.

**Email not received**
→ Check GitHub Actions logs for errors. Make sure your Gmail App Password is correct (no spaces).

**Entries not deleted after midnight**
→ The service_role key (not the anon key) is required for delete. Make sure `SUPABASE_SERVICE_KEY` is set correctly in GitHub Secrets.

**Wrong time — report sends at wrong hour**
→ Adjust the cron in `daily-report.yml`. Use https://crontab.guru to calculate UTC time.
