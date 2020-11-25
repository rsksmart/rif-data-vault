import { ClientKeyValueStorage } from '../src/types'
import { decodeJWT } from 'did-jwt'
import { deleteDatabase, startService, testTimestamp, customStorageFactory, resetDatabase, setupAuthManager } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { ACCESS_TOKEN_KEY, NO_DID, NO_SIGNER, REFRESH_TOKEN_KEY } from '../src/constants'
import MockDate from 'mockdate'
import authManagerFactory from '../src/auth-manager'

jest.setTimeout(7000)

describe('login', function (this: {
  did: string,
  server: Server,
  dbConnection: Connection,
  serviceDid: string,
  serviceUrl: string,
  storage: ClientKeyValueStorage
}) {
  const dbName = 'login.sqlite'

  const setupComplete = () => setupAuthManager(this.serviceUrl, this.serviceDid)
    .then(({ authManager, did, storage }) => {
      this.did = did
      this.storage = storage
      return authManager
    })

  beforeAll(async () => {
    const { server, serviceUrl, dbConnection, serviceDid } = await startService(dbName, 4605)
    this.server = server
    this.serviceDid = serviceDid
    this.dbConnection = dbConnection
    this.serviceUrl = serviceUrl
  })

  afterAll(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, dbName)
  })

  beforeEach(() => MockDate.set(testTimestamp))

  afterEach(async () => {
    MockDate.reset()
    await resetDatabase(this.dbConnection)
  })

  test('should fail if no did', async () => {
    const authManager = authManagerFactory({ serviceUrl: this.serviceUrl }, customStorageFactory())

    expect(() => authManager.login()).rejects.toThrowError(NO_DID)
  })

  test('should fail if no signer', async () => {
    this.did = 'did:ethr:rsk:0x123456789'
    const authManager = authManagerFactory({ serviceUrl: this.serviceUrl, did: this.did }, customStorageFactory())

    expect(() => authManager.login()).rejects.toThrowError(NO_SIGNER)
  })

  test('should return an access token and refresh token', async () => {
    const authManager = await setupComplete()

    const { accessToken, refreshToken } = await authManager.login()

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  test('should receive an access token and the subject must be the client did', async () => {
    const authManager = await setupComplete()

    const { accessToken } = await authManager.login()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.sub).toEqual(this.did)
  })

  test('should receive an access token issued by the service did', async () => {
    const authManager = await setupComplete()

    const { accessToken } = await authManager.login()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.iss).toEqual(this.serviceDid)
  })

  test('should save the tokens in the storage', async () => {
    const authManager = await setupComplete()

    const { accessToken, refreshToken } = await authManager.refreshAccessToken()

    const actualAccessToken = await this.storage.get(ACCESS_TOKEN_KEY)
    const actualRefreshToken = await this.storage.get(REFRESH_TOKEN_KEY)

    expect(actualAccessToken).toEqual(accessToken)
    expect(actualRefreshToken).toEqual(refreshToken)
  })
})
