import { Connection, createConnection } from 'typeorm'
import { rskDIDFromPrivateKey } from '@rsksmart/rif-id-ethr-did'
import { mnemonicToSeed, seedToRSKHDKey, generateMnemonic } from '@rsksmart/rif-id-mnemonic'
import { Signer } from 'did-jwt'
import { Entities, IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import fs from 'fs'
import { Logger } from 'winston'
import express from 'express'
import bodyParser from 'body-parser'
import setupApi from '@rsksmart/ipfs-cpinner-service/lib/setup'
import { Server } from 'http'

export const mockedLogger = { info: () => {}, error: () => {} } as unknown as Logger

export interface Identity {
  did: string
  signer: Signer
}

export const identityFactory = async (): Promise<Identity> => {
  const mnemonic = generateMnemonic(12)
  const seed = await mnemonicToSeed(mnemonic)
  const hdKey = seedToRSKHDKey(seed)

  const privateKey = hdKey.derive(0).privateKey.toString('hex')
  return rskDIDFromPrivateKey()(privateKey)
}

export const createSqliteConnection = (database: string) => createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

export const resetDatabase = async (dbConnection: Promise<Connection>) => {
  await (await dbConnection).dropDatabase()
  await (await dbConnection).synchronize()
}

export const deleteDatabase = (connection: Connection, database: string) => connection.close().then(() => {
  if (fs.existsSync(database)) fs.unlinkSync(database)
})

export const startService = async (dbName: string): Promise<{
  server: Server,
  serviceUrl: string,
  ipfsPinnerProvider: IpfsPinnerProvider,
  dbConnection: Connection
}> => {
  const serviceIdentity = await identityFactory()
  const app = express()
  app.use(bodyParser.json())

  const config = {
    serviceUrl: 'http://dv.com',
    challengeSecret: 'theSecret',
    serviceDid: serviceIdentity.did,
    serviceSigner: serviceIdentity.signer
  }

  const dbConnection = await createSqliteConnection(dbName)
  const ipfsEndpoint = 'http://localhost:5001'
  const ipfsPinnerProvider = await ipfsPinnerProviderFactory(dbConnection, ipfsEndpoint)
  setupApi(app, ipfsPinnerProvider, config, mockedLogger)
  const port = 4600
  const server = app.listen(port)

  const serviceUrl = `http://localhost:${port}`

  return { server, ipfsPinnerProvider, serviceUrl, dbConnection }
}
