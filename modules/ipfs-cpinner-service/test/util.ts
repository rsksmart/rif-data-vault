import { Connection, createConnection } from 'typeorm'
import fs from 'fs'
import { Entities } from '@rsksmart/ipfs-cpinner-provider'
import { rskDIDFromPrivateKey } from '@rsksmart/rif-id-ethr-did'
import { mnemonicToSeed, seedToRSKHDKey, generateMnemonic } from '@rsksmart/rif-id-mnemonic'
import { Logger } from 'winston'
import { toRpcSig, ecsign, hashPersonalMessage } from 'ethereumjs-util'
import privateKeyToAddress from 'ethereum-private-key-to-address'

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

export const getRandomString = (): string => Math.random().toString(36).substring(3, 11)

export const ipfsApiUrl = 'http://localhost:5001'

export const identityFactory = async () => {
  const mnemonic = generateMnemonic(12)
  const seed = await mnemonicToSeed(mnemonic)
  const hdKey = seedToRSKHDKey(seed)

  const privateKey = hdKey.derive(0).privateKey.toString('hex')
  const accountAddress = privateKeyToAddress(privateKey)
  const identity = rskDIDFromPrivateKey()(privateKey)
  const didSplit = identity.did.split(':')
  didSplit[3] = accountAddress.toLowerCase()
  identity.did = didSplit.join(':')
  return { identity, privateKey, accountAddress }
}

export const challengeResponseFactory = (
  challenge: string,
  did: string,
  issuerPrivateKey: string,
  serviceUrl: string,
  loginMessageHeader: string
) => {
  const message = `${loginMessageHeader}\nURL: ${serviceUrl}\nVerification code: ${challenge}`
  const messageDigest = hashPersonalMessage(Buffer.from(message))

  const ecdsaSignature = ecsign(
    messageDigest,
    Buffer.from(issuerPrivateKey, 'hex')
  )

  return { did, sig: toRpcSig(ecdsaSignature.v, ecdsaSignature.r, ecdsaSignature.s) }
}

export const mockedLogger = { info: () => {}, error: () => {} } as unknown as Logger
