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
import { hashPersonalMessage, ecsign, toRpcSig } from 'ethereumjs-util'
import { ClientKeyValueStorage } from '../src/types'
import DataVaultWebClient from '../src'
import authManagerFactory from '../src/auth-manager'

export const mockedLogger = { info: () => {}, error: () => {} } as unknown as Logger

export const identityFactory = async () => {
  const mnemonic = generateMnemonic(12)
  const seed = await mnemonicToSeed(mnemonic)
  const hdKey = seedToRSKHDKey(seed)

  const privateKey = hdKey.derive(0).privateKey.toString('hex')

  return {
    did: rskDIDFromPrivateKey()(privateKey).did,
    rpcPersonalSign: (data: string) => {
      const messageDigest = hashPersonalMessage(Buffer.from(data))

      const ecdsaSignature = ecsign(
        messageDigest,
        Buffer.from(privateKey, 'hex')
      )

      return Promise.resolve(toRpcSig(ecdsaSignature.v, ecdsaSignature.r, ecdsaSignature.s))
    }
  }
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

  const mnemonic = generateMnemonic(12)
  const seed = await mnemonicToSeed(mnemonic)
  const hdKey = seedToRSKHDKey(seed)

  const privateKey = hdKey.derive(0).privateKey.toString('hex')

  const serviceIdentity = rskDIDFromPrivateKey()(privateKey)
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

export const setupDataVaultClient = async (serviceUrl: string, serviceDid: string): Promise<{ dataVaultClient: DataVaultWebClient, did: string }> => {
  const { rpcPersonalSign, did } = await identityFactory()

  return {
    dataVaultClient: new DataVaultWebClient({ serviceUrl, did: did, rpcPersonalSign, serviceDid }),
    did
  }
}

export const setupAuthManager = async (serviceUrl: string, serviceDid: string) => {
  const { rpcPersonalSign, did } = await identityFactory()

  const storage = customStorageFactory()

  return {
    authManager:  authManagerFactory(
      { serviceUrl, did, rpcPersonalSign, serviceDid },
      storage
    ),
    did,
    storage
  }
}
