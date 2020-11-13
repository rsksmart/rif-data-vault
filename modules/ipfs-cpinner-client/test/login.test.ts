import DataVaultWebClient, { Signer } from '../src'
import { decodeJWT } from 'did-jwt'
import { deleteDatabase, startService, identityFactory } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { NO_DID, NO_SIGNER } from '../src/errors'

describe('login', function (this: {
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

  test('should fail if no did', async () => {
    this.dbName = 'login-1.sqlite'
    const client = await setup()

    expect(() => client.login()).rejects.toThrowError(NO_DID)
  })

  test('should fail if no signer', async () => {
    this.dbName = 'login-2.sqlite'
    this.did = 'did:ethr:rsk:0x123456789'

    const client = await setup()

    expect(() => client.login()).rejects.toThrowError(NO_SIGNER)
  })

  test('should return an access token and refresh token', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-3.sqlite'

    const client = await setup()

    const { accessToken, refreshToken } = await client.login()

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  test('should receive an access token and the subject must be the client did', async () => {
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

  test('should receive an access token issued by the service did', async () => {
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

  test('should set the access token', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-6.sqlite'

    const client = await setup()

    expect(await client.getAccessToken()).toBeUndefined()

    await client.login()

    const accessToken = client.getAccessToken()

    expect(accessToken).toBeTruthy()
  })

  test('should set the access token retrieved from the login', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-7.sqlite'

    const client = await setup()

    expect(await client.getAccessToken()).toBeUndefined()

    const { accessToken } = await client.login()

    const expectedAccessToken = await client.getAccessToken()

    expect(expectedAccessToken).toEqual(accessToken)
  })

  test('should set the refresh token', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-8.sqlite'

    const client = await setup()

    expect(await client.getRefreshToken()).toBeUndefined()

    await client.login()

    const refreshToken = await client.getRefreshToken()

    expect(refreshToken).toBeTruthy()
  })

  test('should set the access token retrieved from the login', async () => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    this.signer = clientIdentity.signer as Signer
    this.dbName = 'login-6.sqlite'

    const client = await setup()

    expect(await client.getAccessToken()).toBeUndefined()

    const { refreshToken } = await client.login()

    const expectedRefreshToken = await client.getRefreshToken()

    expect(expectedRefreshToken).toEqual(refreshToken)
  })
})
