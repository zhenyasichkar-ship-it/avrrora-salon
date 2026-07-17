// Shared DB access for the booking endpoints. Uses Vercel's Neon Postgres
// integration: creating the database in Vercel -> Storage injects
// DATABASE_URL / POSTGRES_URL automatically.
const { neon } = require('@neondatabase/serverless');

// Hourly consultation slots within salon hours.
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const STATUSES = ['new', 'contacted', 'done', 'cancelled'];

let sql = null;
let ready = null;

function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}

function ensure(s) {
  if (!ready) {
    ready = (async () => {
      await s`CREATE TABLE IF NOT EXISTS bookings (
        id serial PRIMARY KEY,
        name text NOT NULL,
        phone text NOT NULL,
        service text,
        date date NOT NULL,
        time text NOT NULL,
        status text NOT NULL DEFAULT 'new',
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // One active booking per slot; cancelled ones free the slot again.
      await s`CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot
              ON bookings(date, time) WHERE status <> 'cancelled'`;
    })();
  }
  return ready;
}

module.exports = { db, ensure, SLOTS, STATUSES };
