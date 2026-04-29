import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import bcrypt from 'bcryptjs'
import { users } from './schema'
import { eq } from 'drizzle-orm'
import { join } from 'path'
import { mkdirSync } from 'fs'

const dbDir = join(process.cwd(), 'data')
mkdirSync(dbDir, { recursive: true })

const sqlite = new Database(join(dbDir, 'taller.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

migrate(db, { migrationsFolder: join(process.cwd(), 'server/db/migrations') })

async function seed() {
  const existingAdmin = db.select().from(users).where(eq(users.username, 'tito')).get()
  if (!existingAdmin) {
    const hash = await bcrypt.hash('bigboss', 12)
    db.insert(users).values({
      username: 'tito',
      name: 'Tito',
      passwordHash: hash,
      role: 'admin',
      mustChangePassword: true
    }).run()
  }
}

seed()
