import DataVaultWebClient, { Signer } from '../src'
import axios from 'axios'
import { deleteDatabase, startService } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { NO_DID } from '../src/errors'

describe('', function (this: {
  serviceUrl: string,
  did: string,
  signer: Signer,
  dbName: string,
  server: Server,
  dbConnection: Connection,
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, dbConnection } = await startService(this.dbName, 4601)
    this.server = server
    this.serviceUrl = serviceUrl
    this.dbConnection = dbConnection

    return new DataVaultWebClient({ serviceUrl: this.serviceUrl, did: this.did, signer: this.signer })
  }

  afterEach(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('1', async () => {
    this.dbName = 'challenge-1.sqlite'
    const client = await setup()

    await expect(() => client.getChallenge()).rejects.toThrowError(NO_DID)
  })

  test('2', async () => {
    this.dbName = 'challenge-2.sqlite'
    this.did = 'did:ethr:rsk:0x123456789'

    const client = await setup()

    const challenge = await client.getChallenge()

    expect(challenge).toBeTruthy()
  })

  test('3', async () => {
    this.did = 'did:ethr:rsk:0x123456789'
    this.dbName = 'challenge-3.sqlite'

    const client = await setup()

    const actual = await client.getChallenge()

    const expected = await axios.get(`${this.serviceUrl}/request-auth/${this.did}`)
      .then(res => res.status === 200 && !!res.data && res.data.challenge)

    expect(actual).toEqual(expected)
  })
})
