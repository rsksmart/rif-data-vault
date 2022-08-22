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
import { DecryptFn, GetEncryptionPublicKeyFn } from '@rsksmart/ipfs-cpinner-client-types/lib/encryption-manager/types'
import { KeyValueStore } from '@rsksmart/ipfs-cpinner-client-types/lib//auth-manager/types'
import DataVaultWebClient from '../src'
import { decrypt } from 'eth-sig-util'
import AuthManager from '../src/auth-manager/testing'
import EncryptionManager from '../src/encryption-manager/asymmetric'

export const mockedLogger = { info: () => { }, error: () => { } } as unknown as Logger

export const createPersonalSign = (privateKey: Buffer) => (data: string) => {
  const messageDigest = hashPersonalMessage(Buffer.from(data))

  const ecdsaSignature = ecsign(
    messageDigest,
    privateKey
  )

  return Promise.resolve(toRpcSig(ecdsaSignature.v, ecdsaSignature.r, ecdsaSignature.s))
}

export const identityFactory = async () => {
  const mnemonic = generateMnemonic(12)
  const seed = await mnemonicToSeed(mnemonic)
  const hdKey = seedToRSKHDKey(seed)



  const privateKey = Buffer.from("19fe1fe7a2e02285d5455140a2bd5d51c677ef95260bf4118d720c91bf0aefbe", 'hex')


  return {
    did: rskDIDFromPrivateKey()(privateKey.toString('hex')).did,
    privateKey,
    personalSign: createPersonalSign(privateKey)
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

  const privateKey = "b4df5c837d9802b841ef2cba0b0c235c57b14764151b8c17d9d54a68fb5627f7"

  const serviceIdentity = rskDIDFromPrivateKey()(privateKey)
  const serviceDid = serviceIdentity.did
  const app = express()
  app.use(bodyParser.json())

  const config = {
    serviceUrl,
    challengeSecret: 'theSecret',
    serviceDid,
    serviceSigner: serviceIdentity.signer,
    loginMessageHeader: 'Are you sure you want to login to the RIF Data Vault?'
  }

  const dbConnection = await createSqliteConnection(dbName)
  const ipfsApiUrl = 'http://localhost:5001'
  const ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection, ipfsApiUrl, maxStorage: testMaxStorage })
  await setupApi(app, ipfsPinnerProvider as any, config, mockedLogger)

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
export const setupDataVaultClient = async (serviceUrl: string, serviceDid: string) => {
  const { personalSign, did } = await identityFactory()

  return {
    dataVaultClient: new DataVaultWebClient({
      serviceUrl,
      authManager: new AuthManager({
        serviceUrl,
        did,
        personalSign,
        store: customStorageFactory()
      }),
      encryptionManager: new EncryptionManager({
        getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
        decrypt: decryptTestFn
      })
    }),
    did
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setupAuthManager = async (serviceUrl: string, serviceDid: string) => {
  const { personalSign, did, privateKey } = await identityFactory()

  const store = customStorageFactory()

  return {
    authManager: new AuthManager(
      { serviceUrl, did, personalSign, store }
    ),
    did,
    privateKey,
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
