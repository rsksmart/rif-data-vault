import { Connection, createConnection } from 'typeorm'
import { rskDIDFromPrivateKey } from '@rsksmart/rif-id-ethr-did'
import { mnemonicToSeed, seedToRSKHDKey, generateMnemonic } from '@rsksmart/rif-id-mnemonic'
import { Signer, createJWT } from 'did-jwt'
import { Entities, IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import fs from 'fs'
import { Logger } from 'winston'
import express from 'express'
import bodyParser from 'body-parser'
import setupApi from '@rsksmart/ipfs-cpinner-service/lib/setup'
import { Server } from 'http'
import { ClientKeyValueStorage } from '../src/types'

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

export const resetDatabase = async (dbConnection: Connection) => {
  await dbConnection.dropDatabase()
  await dbConnection.synchronize()
}

export const deleteDatabase = (connection: Connection, database: string) => connection.close().then(() => {
  if (fs.existsSync(database)) fs.unlinkSync(database)
})

export const startService = async (dbName: string, port?: number): Promise<{
  server: Server,
  serviceUrl: string,
  serviceDid: string,
  ipfsPinnerProvider: IpfsPinnerProvider,
  dbConnection: Connection,
  dbConnectionPromise: Promise<Connection>
}> => {
  if (!port) port = 4600
  const serviceUrl = `http://localhost:${port}`

  const serviceIdentity = await identityFactory()
  const serviceDid = serviceIdentity.did
  const app = express()
  app.use(bodyParser.json())

  const config = {
    serviceUrl,
    challengeSecret: 'theSecret',
    serviceDid,
    serviceSigner: serviceIdentity.signer
  }

  const dbConnectionPromise = createSqliteConnection(dbName)
  const dbConnection = await dbConnectionPromise
  const ipfsEndpoint = 'http://localhost:5001'
  const ipfsPinnerProvider = await ipfsPinnerProviderFactory(dbConnection, ipfsEndpoint)
  setupApi(app, ipfsPinnerProvider, config, mockedLogger)

  const server = app.listen(port)

  return { server, ipfsPinnerProvider, serviceUrl, dbConnection, dbConnectionPromise, serviceDid }
}

export const challengeResponseFactory = async (
  challenge: string,
  issuer: Identity,
  serviceUrl: string,
  serviceDid: string
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    challenge,
    aud: serviceUrl,
    sub: serviceDid,
    exp: now + 120, // 2 mins validity
    nbf: now,
    iat: now
  }

  return createJWT(payload, { issuer: issuer.did, signer: issuer.signer }, { typ: 'JWT', alg: 'ES256K' })
}

export const testTimestamp = 1603300440000

export const customStorageFactory = (): ClientKeyValueStorage => {
  const store: any = {}
  return {
    get: async (key: string) => {
      return store[key]
    },
    set: async (key: string, value: string) => {
      store[key] = value.toString()
    }
  }
}
