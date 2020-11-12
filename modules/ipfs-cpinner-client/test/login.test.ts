import DataVaultWebClient, { Signer } from '../src'
import { decodeJWT } from 'did-jwt'
import { deleteDatabase, startService, identityFactory } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { NO_DID, NO_SIGNER } from '../src/errors'

describe('', function (this: {
  serviceUrl: string,
  did: string,
  signer: Signer,
  dbName: string,
  server: Server,
  dbConnection: Connection,
  serviceDid: string,
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, dbConnection, serviceDid } = await startService(this.dbName, 4602)
    this.server = server
    this.serviceDid = serviceDid
    this.serviceUrl = serviceUrl
    this.dbConnection = dbConnection

    return new DataVaultWebClient({ serviceUrl: this.serviceUrl, did: this.did, signer: this.signer, serviceDid: this.serviceDid })
  }

  afterEach(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('1', async () => {
    this.dbName = 'login-1.sqlite'
    const client = await setup()

    await expect(() => client.login()).rejects.toThrowError(NO_DID)
  })

  test('2', async () => {
    this.dbName = 'login-2.sqlite'
    this.did = 'did:ethr:rsk:0x123456789'

    const client = await setup()

    await expect(() => client.login()).rejects.toThrowError(NO_SIGNER)
  })

  test('3', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-3.sqlite'

    const client = await setup()

    const { accessToken, refreshToken } = await client.login()

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  test('4', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-4.sqlite'

    const client = await setup()

    const { accessToken } = await client.login()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.sub).toEqual(this.did)
  })

  test('5', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-5.sqlite'

    const client = await setup()

    const { accessToken } = await client.login()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.iss).toEqual(this.serviceDid)
  })
})
