import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import { deleteDatabase, resetDatabase, setupDataVaultClient, startService, testMaxStorage, testTimestamp } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import MockDate from 'mockdate'
import localStorageMockFactory from './localStorageMockFactory'

describe('get storage information', function (this: {
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'get-storage.sqlite'

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(dbName, 4609)
    this.server = server
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection
    this.serviceUrl = serviceUrl
    this.serviceDid = serviceDid
  })

  afterAll(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, dbName)
  })

  beforeEach(() => {
    MockDate.set(testTimestamp)
    global.localStorage = localStorageMockFactory()
  })

  afterEach(async () => {
    MockDate.reset()
    await resetDatabase(this.dbConnection)
  })

  test('should return numeric values even if no content created', async () => {
    const { dataVaultClient } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const storage = await dataVaultClient.getStorageInformation()

    expect(storage.used).toBeGreaterThanOrEqual(0)
    expect(storage.available).toBeGreaterThanOrEqual(0)
  })

  test('should return proper values after content has been created', async () => {
    const { dataVaultClient, did } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const key = 'TheKey'
    const content = 'a content'
    await this.ipfsPinnerProvider.create(did, key, content)

    const storage = await dataVaultClient.getStorageInformation()

    expect(storage.used).toBe(9)
    expect(storage.available).toBe(testMaxStorage - 9)
  })

  test('should return storage information associated to the logged in did', async () => {
    const { dataVaultClient } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const did = 'did:ethr:rsk:0x123456789'
    const key = 'TheKey'
    const content = 'a content'
    await this.ipfsPinnerProvider.create(did, key, content)

    const storage = await dataVaultClient.getStorageInformation()

    expect(storage.used).toBe(0)
    expect(storage.available).toBe(testMaxStorage)
  })
})
