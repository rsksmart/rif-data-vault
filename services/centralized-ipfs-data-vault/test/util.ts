import { Connection, createConnection } from 'typeorm'
import fs from 'fs'
import { Entities } from '@rsksmart/ipfs-pinner-provider'
import { rskDIDFromPrivateKey } from '@rsksmart/rif-id-ethr-did'
import { mnemonicToSeed, seedToRSKHDKey, generateMnemonic } from '@rsksmart/rif-id-mnemonic'
import { createJWT, Signer } from 'did-jwt'
import { Logger } from 'winston'

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
<<<<<<< HEAD

export const ipfsEndpoint = 'http://localhost:5001'

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

export const challengeResponseFactory = async (
  challenge: string,
  issuer: Identity,
  serviceUrl: string
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    challenge,
    aud: serviceUrl,
    exp: now + 120, // 2 mins validity
    nbf: now,
    iat: now
  }

  return createJWT(payload, { issuer: issuer.did, signer: issuer.signer }, { typ: 'JWT', alg: 'ES256K' })
}

export const mockedLogger = { info: () => {}, error: () => {} } as unknown as Logger
=======
>>>>>>> First commit with TDD approach for the DV api
