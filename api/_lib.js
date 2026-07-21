// Shared DB access for the booking endpoints. Uses Vercel's Neon Postgres
// integration: creating the database in Vercel -> Storage injects
// DATABASE_URL / POSTGRES_URL automatically.
const { neon } = require('@neondatabase/serverless');

// Consultations: Mon-Fri, half-hour slots from 10:00, last one at 18:30.
const SLOTS = [];
for (let h = 10; h < 19; h++) {
  SLOTS.push(String(h).padStart(2, '0') + ':00');
  SLOTS.push(String(h).padStart(2, '0') + ':30');
}
const BOOKING_DAYS = 14; // how far ahead clients can book
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
      await s`CREATE TABLE IF NOT EXISTS avrrora_bookings (
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
      await s`CREATE UNIQUE INDEX IF NOT EXISTS avrrora_bookings_slot
              ON avrrora_bookings(date, time) WHERE status <> 'cancelled'`;
      // Q&A log of the site's AI assistant, shown in the admin panel.
      await s`CREATE TABLE IF NOT EXISTS avrrora_chat_log (
        id serial PRIMARY KEY,
        chat_id text,
        question text NOT NULL,
        answer text NOT NULL,
        lang text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    })();
  }
  return ready;
}

module.exports = { db, ensure, SLOTS, STATUSES, BOOKING_DAYS };
