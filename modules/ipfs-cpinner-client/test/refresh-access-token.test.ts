import { ClientKeyValueStorage } from '../src/types'
import {
  setupAuthManager, customStorageFactory, startService, deleteDatabase,
  testTimestamp, resetDatabase
} from './util'
import authManagerFactory from '../src/auth-manager'
import MockDate from 'mockdate'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { ACCESS_TOKEN_KEY, NO_DID, NO_SIGNER, REFRESH_TOKEN_KEY } from '../src/constants'

describe('refresh access token', function (this: {
  did: string,
  server: Server,
  dbConnection: Connection,
  serviceDid: string,
  serviceUrl: string,
  storage: ClientKeyValueStorage
}) {
  const dbName = 'refresh-at.sqlite'

  const setupComplete = () => setupAuthManager(this.serviceUrl, this.serviceDid)
    .then(({ authManager, did, storage }) => {
      this.did = did
      this.storage = storage
      return authManager
    })

  beforeAll(async () => {
    const { server, serviceUrl, dbConnection, serviceDid } = await startService(dbName, 4606)
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

  test('should throw an error if no did', async () => {
    const authManager = await authManagerFactory({ serviceUrl: this.serviceUrl }, customStorageFactory())

    expect(authManager.getAccessToken()).rejects.toThrow(NO_DID)
  })

  test('should throw an error if no signer', async () => {
    const did = 'did:ethr:rsk:0x123456789'
    const authManager = await authManagerFactory({ serviceUrl: this.serviceUrl, did }, customStorageFactory())

    await expect(authManager.getAccessToken()).rejects.toThrowError(NO_SIGNER)
  })

  test('should throw return accessToken and refreshToken', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const { accessToken, refreshToken } = await authManager.storedTokens()

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  test('should save the tokens in the given storage', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const { accessToken, refreshToken } = await authManager.storedTokens()

    const actualAccessToken = await this.storage.get(ACCESS_TOKEN_KEY)
    const actualRefreshToken = await this.storage.get(REFRESH_TOKEN_KEY)

    expect(actualAccessToken).toEqual(accessToken)
    expect(actualRefreshToken).toEqual(refreshToken)
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
