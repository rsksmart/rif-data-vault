import { Connection, createConnection } from 'typeorm'
import { rskDIDFromPrivateKey } from '@rsksmart/rif-id-ethr-did'
import { mnemonicToSeed, seedToRSKHDKey, generateMnemonic } from '@rsksmart/rif-id-mnemonic'
import { Entities, IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import fs from 'fs'
import { Logger } from 'winston'
import express from 'express'
import bodyParser from 'body-parser'
import setupApi from '@rsksmart/ipfs-cpinner-service/lib/setup'
import { Server } from 'http'
import { hashPersonalMessage, ecsign, toRpcSig } from 'ethereumjs-util'
import { DecryptFn, GetEncryptionPublicKeyFn } from '../src/encryption-manager/types'
import { KeyValueStore } from '../src/auth-manager/types'
import DataVaultWebClient from '../src'
import { decrypt } from 'eth-sig-util'
import AuthManager from '../src/auth-manager'

export const mockedLogger = { info: () => {}, error: () => {} } as unknown as Logger

export const identityFactory = async () => {
  const mnemonic = generateMnemonic(12)
  const seed = await mnemonicToSeed(mnemonic)
  const hdKey = seedToRSKHDKey(seed)

  const privateKey = hdKey.derive(0).privateKey.toString('hex')

  return {
    did: rskDIDFromPrivateKey()(privateKey).did,
    personalSign: (data: string) => {
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

export const testTimestamp = 1603300440000
export const testMaxStorage = 1000

export const startService = async (dbName: string, port?: number): Promise<{
  server: Server,
  serviceUrl: string,
  serviceDid: string,
  ipfsPinnerProvider: IpfsPinnerProvider,
  dbConnection: Connection,
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

  const dbConnection = await createSqliteConnection(dbName)
  const ipfsApiUrl = 'http://localhost:5001'
  const ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection, ipfsApiUrl, maxStorage: testMaxStorage })
  setupApi(app, ipfsPinnerProvider, config, mockedLogger)

  const server = app.listen(port)

  return { server, ipfsPinnerProvider, serviceUrl, dbConnection, serviceDid }
}

export const customStorageFactory = (): KeyValueStore => {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setupDataVaultClient = async (serviceUrl: string, serviceDid: string): Promise<{ dataVaultClient: DataVaultWebClient, did: string }> => {
  const { personalSign, did } = await identityFactory()

  return {
    dataVaultClient: new DataVaultWebClient({
      serviceUrl,
      did,
      personalSign,
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    }),
    did
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setupAuthManager = async (serviceUrl: string, serviceDid: string) => {
  const { personalSign, did } = await identityFactory()

  const store = customStorageFactory()

  return {
    authManager: new AuthManager(
      { serviceUrl, did, personalSign, store }
    ),
    did,
    store
  }
}

const testEncPrivateKey = '1e38556769bb9a789ff84f4fb5b5336e0e8f1c5915fe382ec04ce913e2ed9893'
const testEncPublicKey = 'tBteRrjwd8jW4HXP5z0EqOMyjNcY3rini6/mJaTEBWg='

export const getEncryptionPublicKeyTestFn: GetEncryptionPublicKeyFn = (encPubKey?: string) => Promise.resolve(encPubKey || testEncPublicKey)

export const decryptTestFn: DecryptFn = (hexa: string): Promise<string> => {
  const cipher = JSON.parse(Buffer.from(hexa.substr(2), 'hex').toString('utf8'))

  return Promise.resolve(decrypt(cipher, testEncPrivateKey))
}
