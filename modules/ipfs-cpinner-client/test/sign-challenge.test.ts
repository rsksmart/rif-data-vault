import DataVaultWebClient, { Signer } from '../src'
import { deleteDatabase, startService, challengeResponseFactory } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { NO_DID, NO_SERVICE_DID, NO_SIGNER } from '../src/errors'

describe('', function (this: {
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

  test('1', async () => {
    this.dbName = 'sign-challenge-1.sqlite'
    this.challenge = '123456789'
    const client = await setup()

    await expect(() => client.signChallenge(this.challenge)).rejects.toThrowError(NO_DID)
  })

  test('2', async () => {
    this.dbName = 'sign-challenge-2.sqlite'
    this.challenge = '123456789'
    this.did = 'did:ethr:rsk:0x123456789'

    const client = await setup()

    await expect(() => client.signChallenge(this.challenge)).rejects.toThrowError(NO_SIGNER)
  })

  test('2 bis', async () => {
    this.dbName = 'sign-challenge-2-bis.sqlite'
    this.challenge = '123456789'
    this.did = 'did:ethr:rsk:0x123456789'
    this.signer = async (data: string) => data

    await setup()

    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl, did: this.did, signer: this.signer })

    await expect(() => client.signChallenge(this.challenge)).rejects.toThrowError(NO_SERVICE_DID)
  })

  test('3', async () => {
    this.dbName = 'sign-challenge-2.sqlite'
    this.challenge = '123456789'
    this.did = 'did:ethr:rsk:0x123456789'
    this.signer = async (data: string) => data

    const client = await setup()
    const actual = await client.signChallenge(this.challenge)

    const expected = await challengeResponseFactory(this.challenge, {
      did: this.did, signer: this.signer
    }, this.serviceUrl, this.serviceDid)

    expect(actual).toEqual(expected)
  })
})
