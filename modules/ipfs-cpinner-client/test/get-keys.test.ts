import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import { deleteDatabase, resetDatabase, setupDataVaultClient, startService, testTimestamp } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import MockDate from 'mockdate'
import localStorageMockFactory from './localStorageMockFactory'

describe('get keys', function (this: {
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'get-keys.sqlite'

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(dbName, 4607)
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

  test('should return an empty array if no keys', async () => {
    const { did, dataVaultClient } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const keys = await dataVaultClient.getKeys({ did })

    expect(keys).toEqual([])
  })

  test('should return an array with the just created key', async () => {
    const { did, dataVaultClient } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const key = 'TheKey'
    const content = 'a content'

    await this.ipfsPinnerProvider.create(did, key, content)

    const keys = await dataVaultClient.getKeys({ did })

    expect(keys).toEqual([key])
  })
})
