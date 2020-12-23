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
}) {
  const dbName = 'login.sqlite'

  const setupComplete = () => setupAuthManager(this.serviceUrl, this.serviceDid)
    .then(({ authManager, did, storage }) => {
      this.did = did
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

    expect(() => authManager.getAccessToken()).rejects.toThrowError(NO_DID)
  })

  test('should fail if no signer', async () => {
    this.did = 'did:ethr:rsk:0x123456789'
    const authManager = authManagerFactory({ serviceUrl: this.serviceUrl, did: this.did }, customStorageFactory())

    expect(() => authManager.getAccessToken()).rejects.toThrowError(NO_SIGNER)
  })

  test('should return an access token and refresh token', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const { accessToken, refreshToken } = await authManager.storedTokens()

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  test('should receive an access token and the subject must be the client did', async () => {
    const authManager = await setupComplete()

    const accessToken = await authManager.getAccessToken()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.sub).toEqual(this.did)
  })

  test('should receive an access token issued by the service did', async () => {
    const authManager = await setupComplete()

    const accessToken = await authManager.getAccessToken()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.iss).toEqual(this.serviceDid)
  })

  test('should save the tokens in the storage', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const { accessToken, refreshToken } = await authManager.storedTokens()

    const actualTokens = await authManager.storedTokens()

    expect(actualTokens.accessToken).toEqual(accessToken)
    expect(actualTokens.refreshToken).toEqual(refreshToken)
  })

  test('should refresh the access token if it is expired', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const loginTokens = await authManager.storedTokens()
    expect(loginTokens.accessToken).toBeTruthy()
    expect(loginTokens.refreshToken).toBeTruthy()

    MockDate.set(testTimestamp + 1 * 60 * 60 * 1000) // add 1 hour, access token should be expired

    await authManager.getAccessToken()
    const refreshTokens = await authManager.storedTokens()
    expect(refreshTokens.accessToken).toBeTruthy()
    expect(refreshTokens.refreshToken).toBeTruthy()

    expect(refreshTokens.accessToken).not.toEqual(loginTokens.accessToken)
    expect(refreshTokens.refreshToken).not.toEqual(loginTokens.refreshToken)
  })

  test('should refresh (by doing a new login) even if the refresh token is expired', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const loginTokens = await authManager.storedTokens()
    expect(loginTokens.accessToken).toBeTruthy()
    expect(loginTokens.refreshToken).toBeTruthy()

    MockDate.set(testTimestamp + 10 * 24 * 60 * 60 * 1000) // add 10 days, refresh token should be expired

    await authManager.getAccessToken()
    const refreshTokens = await authManager.storedTokens()
    expect(refreshTokens.accessToken).toBeTruthy()
    expect(refreshTokens.refreshToken).toBeTruthy()

    expect(refreshTokens.accessToken).not.toEqual(loginTokens.accessToken)
    expect(refreshTokens.refreshToken).not.toEqual(loginTokens.refreshToken)
  }, 10000)
})
