import { startService, deleteDatabase, identityFactory, testTimestamp } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import DataVaultWebClient from '../src'
import MockDate from 'mockdate'
import LocalStorageMockFactory from './localStorageMockFactory'
import { Signer } from '../src/types'

jest.setTimeout(10000)

describe('delete content', function (this: {
  dbName: string,
  did: string,
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    const signer = clientIdentity.signer as Signer
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(this.dbName, 4605)
    this.server = server
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection

    return new DataVaultWebClient({ serviceUrl, did: this.did, signer, serviceDid })
  }

  const setupAndAddFile = async (key: string, file: string): Promise<DataVaultWebClient> => {
    const client = await setup()

    await this.ipfsPinnerProvider.create(this.did, key, file)

    return client
  }

  beforeEach(() => {
    MockDate.set(testTimestamp)
    global.localStorage = LocalStorageMockFactory()
  })

  afterEach(async () => {
    MockDate.reset()
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should return true when deleting from a key that do not exist', async () => {
    this.dbName = 'delete-1.sqlite'
    const client = await setup()

    const deleted = await client.delete({ key: 'do not exist' })

    expect(deleted).toBe(true) // TODO: is correct? the provider returns false if the key does not exist, but the service returns always an empty 200
  })

  test('should return true when key exists', async () => {
    this.dbName = 'delete-2.sqlite'
    const key = 'AKey'
    const content = 'the content'

    const client = await setupAndAddFile(key, content)

    const deleted = await client.delete({ key })

    expect(deleted).toBe(true)
  })

  test('should return true if more than one content associated to the given key', async () => {
    this.dbName = 'delete-3.sqlite'
    const key = 'ThirdKey'
    const content = 'a content'
    const anotherContent = 'another content'
    const client = await setupAndAddFile(key, content)

    await this.ipfsPinnerProvider.create(this.did, key, anotherContent)

    const deleted = await client.delete({ key })

    expect(deleted).toBe(true)
  })

  test('should delete data from the storage provider', async () => {
    this.dbName = 'delete-4.sqlite'
    const key = 'ForuthKey'
    const content = 'fourth content'
    const anotherContent = 'another content'
    const client = await setupAndAddFile(key, content)

    await this.ipfsPinnerProvider.create(this.did, key, anotherContent)

    const retrievedBeforeDelete = await this.ipfsPinnerProvider.get(this.did, key)
    expect(retrievedBeforeDelete).toEqual([content, anotherContent])

    const deleted = await client.delete({ key })
    expect(deleted).toBe(true)

    const retrievedAfterDelete = await this.ipfsPinnerProvider.get(this.did, key)
    expect(retrievedAfterDelete).toEqual([])
  })

  test('should delete only the content associated to given id if id and key is present', async () => {
    this.dbName = 'delete-5.sqlite'
    const key = 'FifthKey'
    const content = 'fifth content'
    const anotherContent = 'another fifth content'
    const client = await setupAndAddFile(key, content)

    const id = await this.ipfsPinnerProvider.create(this.did, key, anotherContent)

    const retrievedBeforeDelete = await this.ipfsPinnerProvider.get(this.did, key)
    expect(retrievedBeforeDelete).toEqual([content, anotherContent])

    const deleted = await client.delete({ key, id })
    expect(deleted).toBe(true)

    const retrievedAfterDelete = await this.ipfsPinnerProvider.get(this.did, key)
    expect(retrievedAfterDelete).toEqual([content])
  })

  test('should delete only the content associated to the given key', async () => {
    this.dbName = 'delete-6.sqlite'
    const client = await setup()

    const key1 = 'SixthKey'
    const content1 = 'sixth content'

    const key2 = 'SixthKey2'
    const content2 = 'sixth content 2'

    await this.ipfsPinnerProvider.create(this.did, key1, content1)
    await this.ipfsPinnerProvider.create(this.did, key2, content2)

    const deleted = await client.delete({ key: key1 })

    expect(deleted).toBe(true)

    const retrieved1AfterDelete = await this.ipfsPinnerProvider.get(this.did, key1)
    expect(retrieved1AfterDelete).toEqual([])

    const retrieved2AfterDelete = await this.ipfsPinnerProvider.get(this.did, key2)
    expect(retrieved2AfterDelete).toEqual([content2])
  })

  test('should refresh the access token if necessary', async () => {
    this.dbName = 'delete-7.sqlite'
    const client = await setup()

    const key1 = 'SeventhKey'
    const content1 = 'seventh content'

    const key2 = 'SeventhKey2'
    const content2 = 'Seventh content 2'

    await this.ipfsPinnerProvider.create(this.did, key1, content1)
    await this.ipfsPinnerProvider.create(this.did, key2, content2)

    const deleted1 = await client.delete({ key: key1 })
    expect(deleted1).toBe(true)

    MockDate.set(testTimestamp + 1 * 60 * 60 * 1000) // add 1 hour

    const deleted2 = await client.delete({ key: key2 })
    expect(deleted2).toBe(true)
  })
})
