import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
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

async function seed() {
  const existingAdmin = db.select().from(users).where(eq(users.username, 'admin')).get()
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin1234', 12)
    db.insert(users).values({
      username: 'admin',
      name: 'Administrador',
      passwordHash: hash,
      role: 'admin',
      mustChangePassword: true
    }).run()
  }
}

seed()
