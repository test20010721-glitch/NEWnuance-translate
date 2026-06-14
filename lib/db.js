import { neon } from '@neondatabase/serverless'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return neon(url)
}

export async function initDB() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      name VARCHAR(255),
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      subscription_status VARCHAR(50) DEFAULT 'inactive',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function getUserByEmail(email) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`
  return rows[0] || null
}

export async function createUser({ email, password, name }) {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO users (email, password, name)
    VALUES (${email}, ${password}, ${name})
    RETURNING *
  `
  return rows[0]
}

export async function updateSubscription({ stripeCustomerId, subscriptionId, status }) {
  const sql = getDb()
  await sql`
    UPDATE users
    SET stripe_subscription_id = ${subscriptionId},
        subscription_status = ${status}
    WHERE stripe_customer_id = ${stripeCustomerId}
  `
}

export async function setStripeCustomerId(email, customerId) {
  const sql = getDb()
  await sql`
    UPDATE users SET stripe_customer_id = ${customerId} WHERE email = ${email}
  `
}

export async function isSubscribed(email) {
  const user = await getUserByEmail(email)
  return user?.subscription_status === 'active'
}
