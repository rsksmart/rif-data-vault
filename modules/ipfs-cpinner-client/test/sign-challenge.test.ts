import DataVaultWebClient, { Signer } from '../src'
import { deleteDatabase, identityFactory, startService } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { NO_DID, NO_SERVICE_DID, NO_SIGNER } from '../src/errors'
import { decodeJWT } from 'did-jwt'

describe('sign challenge', function (this: {
  serviceUrl: string,
  did: string,
  signer: Signer,
  dbName: string,
  server: Server,
  dbConnection: Connection,
  challenge: string,
  serviceDid: string,
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, dbConnection, serviceDid } = await startService(this.dbName, 4603)
    this.server = server
    this.serviceUrl = serviceUrl
    this.dbConnection = dbConnection
    this.serviceDid = serviceDid

    return new DataVaultWebClient({ serviceUrl: this.serviceUrl, did: this.did, signer: this.signer, serviceDid: this.serviceDid })
  }

  afterEach(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should fail if no did to issue the jwt', async () => {
    this.dbName = 'sign-challenge-1.sqlite'
    this.challenge = '123456789'
    const client = await setup()

    await expect(() => client.signChallenge(this.challenge)).rejects.toThrowError(NO_DID)
  })

  test('should fail if no signer to sign the jwt', async () => {
    this.dbName = 'sign-challenge-2.sqlite'
    this.challenge = '123456789'
    this.did = 'did:ethr:rsk:0x123456789'

    const client = await setup()

    await expect(() => client.signChallenge(this.challenge)).rejects.toThrowError(NO_SIGNER)
  })

  test('should fail if no service did to set as the subject', async () => {
    this.dbName = 'sign-challenge-2-bis.sqlite'
    this.challenge = '123456789'
    this.did = 'did:ethr:rsk:0x123456789'
    this.signer = async (data: string) => data

    await setup()

    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl, did: this.did, signer: this.signer })

    await expect(() => client.signChallenge(this.challenge)).rejects.toThrowError(NO_SERVICE_DID)
  })

  test('should create a jwt with the proper values', async () => {
    this.dbName = 'sign-challenge-2.sqlite'
    this.challenge = '123456789'
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer

    const client = await setup()
    const signed = await client.signChallenge(this.challenge)

    const { payload } = await decodeJWT(signed)

    const now = Math.floor(Date.now() / 1000)

    expect(payload.sub).toEqual(this.serviceDid)
    expect(payload.aud).toEqual(this.serviceUrl)
    expect(payload.iss).toEqual(this.did)
    expect(payload.challenge).toEqual(this.challenge)
    expect(payload.nbf).toEqual(now)
    expect(payload.exp).toEqual(now + 120)
  })
})
