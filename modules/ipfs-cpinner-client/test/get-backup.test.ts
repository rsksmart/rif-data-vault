import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import { deleteDatabase, resetDatabase, setupDataVaultClient, startService, testTimestamp } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import MockDate from 'mockdate'
import localStorageMockFactory from './localStorageMockFactory'

describe('get backup', function (this: {
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'get-backup.sqlite'

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(dbName, 4608)
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

  test('should return an empty object if no data saved', async () => {
    const { dataVaultClient } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const backup = await dataVaultClient.getBackup()

    expect(backup).toEqual([])
  })

  test('should return the saved data', async () => {
    const { dataVaultClient, did } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const key1 = 'TheKey1'
    const key2 = 'TheKey2'
    const id1 = await this.ipfsPinnerProvider.create(did, key1, 'some content')
    const id2 = await this.ipfsPinnerProvider.create(did, key1, 'another content for same did')
    const id3 = await this.ipfsPinnerProvider.create(did, key2, 'another content for another did')

    const backup = await dataVaultClient.getBackup()

    expect(backup).toEqual([
      { key: key1, id: id1 },
      { key: key1, id: id2 },
      { key: key2, id: id3 }
    ])
  })
})
