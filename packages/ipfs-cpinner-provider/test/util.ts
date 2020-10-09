import { Connection } from 'typeorm'
import fs from 'fs'

export { createSqliteConnection } from '../src'

export const resetDatabase = async (dbConnection: Promise<Connection>) => {
  await (await dbConnection).dropDatabase()
  await (await dbConnection).synchronize()
}

export const deleteDatabase = (connection: Connection, database: string) => connection.close().then(() => {
  if (fs.existsSync(database)) fs.unlinkSync(database)
})

export const getRandomString = (): string => Math.random().toString(36).substring(3, 11)
