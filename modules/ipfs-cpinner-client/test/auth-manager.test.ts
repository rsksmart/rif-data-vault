import { decodeJWT } from 'did-jwt'
import { deleteDatabase, startService, testTimestamp, customStorageFactory, resetDatabase, setupAuthManager, identityFactory } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import MockDate from 'mockdate'
import AuthManager from '../src/auth-manager/testing'
import { Provider } from './web3-provider'

jest.setTimeout(7000)

describe('login', function (this: {
  did: string,
  server: Server,
  dbConnection: Connection,
  serviceDid: string,
  serviceUrl: string,
  privateKey: Buffer
}) {
  const dbName = 'login.sqlite'

  const setupComplete = async () => {
    const { authManager, did, privateKey } = await setupAuthManager(this.serviceUrl, this.serviceDid)

    this.did = did
    this.privateKey = privateKey || Buffer.alloc(0)
    return authManager
  }

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

  afterEach(async () => {
    await resetDatabase(this.dbConnection)
  })

  test('should fail if no did', async () => {
    const authManager = new AuthManager({ did: undefined, personalSign: undefined, serviceUrl: this.serviceUrl, store: customStorageFactory() })

    expect(() => authManager.getAccessToken()).rejects.toThrowError()
  })

  test('should fail if no signer', async () => {
    this.did = 'did:ethr:rsk:0x123456789'
    const authManager = new AuthManager({ serviceUrl: this.serviceUrl, did: this.did, personalSign: undefined, store: customStorageFactory() })

    expect(() => authManager.getAccessToken()).rejects.toThrowError()
  })

  test('should return an access token and refresh token', async () => {
    const authManager = await setupComplete()

    await authManager.getAccessToken()
    const { accessToken, refreshToken } = await authManager.storedTokens()

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
  })

  test('should receive an access token and the subject must be the client did and issued by the service', async () => {
    const authManager = await setupComplete()

    const accessToken = await authManager.getAccessToken()

    expect(accessToken).toBeTruthy()

    const { payload } = decodeJWT(accessToken)

    expect(payload.sub).toEqual(this.did)
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
    MockDate.set(testTimestamp)
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
    MockDate.reset()
  })

  test('should refresh (by doing a new login) even if the refresh token is expired', async () => {
    MockDate.set(testTimestamp)
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
    MockDate.reset()
  }, 10000)

  test('should create auth manager from web3 provider', async () => {
    const provider = new Provider(this.privateKey, this.did.split(':').slice(-1)[0])
    const authManager = await AuthManager.fromWeb3Provider({
      did: this.did,
      serviceUrl: this.serviceUrl,
      store: customStorageFactory()
    }, provider)

    const accessToken = await authManager.getAccessToken()

    expect(accessToken).toBeTruthy()
  })

  test.skip('should allow to login with different dids using the same storage', async () => {
    const identity1 = await identityFactory()
    const identity2 = await identityFactory()

    const store = customStorageFactory()

    // login with both authManagers
    const authManager1 = new AuthManager({ ...identity1, serviceUrl: this.serviceUrl, store })
    await authManager1.getAccessToken()

    const authManager2 = new AuthManager({ ...identity2, serviceUrl: this.serviceUrl, store })
    await authManager2.getAccessToken()

    // retrieve tokens from both authManagers
    const actualTokens1 = await authManager1.storedTokens()
    const actualTokens2 = await authManager2.storedTokens()

    expect(actualTokens1.accessToken).not.toEqual(actualTokens2.accessToken)
    expect(actualTokens1.refreshToken).not.toEqual(actualTokens2.refreshToken)
  })
})
