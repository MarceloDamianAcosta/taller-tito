import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import bcrypt from 'bcryptjs'
import { users } from './schema'
import { eq } from 'drizzle-orm'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { seedIfEmpty } from './seed'

const dbDir = join(process.cwd(), 'data')
mkdirSync(dbDir, { recursive: true })

const sqlite = new Database(join(dbDir, 'taller.db'))
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

// FKs OFF during migrate: Drizzle's create-rename-drop technique for SQLite
// ALTERs needs to drop referenced tables. PRAGMA inside migration SQL is a no-op
// because migrate() wraps statements in a transaction — has to ser forzado a
// nivel de conexión antes. Si una migración previa terminó con
// `PRAGMA foreign_keys=ON`, queda persistida y rompe las siguientes.
sqlite.pragma('foreign_keys = OFF')
migrate(db, { migrationsFolder: join(process.cwd(), 'server/db/migrations') })

sqlite.pragma('foreign_keys = ON')

async function bootstrap() {
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

  await seedIfEmpty(db)
}

bootstrap()
