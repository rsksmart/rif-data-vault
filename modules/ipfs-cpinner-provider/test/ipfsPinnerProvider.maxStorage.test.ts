import { Connection } from 'typeorm'
import IpfsHttpClient from 'ipfs-http-client'
import {
  IpfsPinnerProvider,
  IpfsClient, IpfsMetadata, IpfsPinnedCid,
  IpfsPinner, MetadataManager
} from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'
import { DEFAULT_IPFS_API, MAX_STORAGE_REACHED } from '../src/constants'

const database = './ipfs-pinner-provider.maxStorage.test.sqlite'

describe('ipfs pinner provider', function (this: {
  centralizedPinnerProvider: IpfsPinnerProvider
  dbConnection: Connection
  metadataManager: MetadataManager
  ipfsClient: IpfsClient
  ipfsPinner: IpfsPinner
}) {
  const maxStorage = 100
  const did = 'did:ethr:rsk:12345678'
  const key = 'the key'
  const content = 'the content'
  const maxStorageContent = 'b'.repeat(maxStorage)
  const largeContent = 'a'.repeat(maxStorage + 10)

  beforeAll(async () => {
    this.dbConnection = await createSqliteConnection(database)
  })

  beforeEach(async () => {
    await resetDatabase(this.dbConnection)

    const ipfsHttpClient = IpfsHttpClient({ url: DEFAULT_IPFS_API })
    const pinnedCidsRepository = this.dbConnection.getRepository(IpfsPinnedCid)
    const metadataRepository = this.dbConnection.getRepository(IpfsMetadata)

    this.ipfsClient = new IpfsClient(ipfsHttpClient)
    this.ipfsPinner = new IpfsPinner(ipfsHttpClient, pinnedCidsRepository)
    this.metadataManager = new MetadataManager(metadataRepository)

    this.centralizedPinnerProvider = new IpfsPinnerProvider(this.ipfsClient, this.metadataManager, this.ipfsPinner, maxStorage)
  })

  afterAll(() => deleteDatabase(this.dbConnection, database))

  describe('getAvailableStorage', () => {
    test('should return the maxStorage if no content has been saved for the given did', async () => {
      const available = await this.centralizedPinnerProvider.getAvailableStorage(did)

      expect(available).toEqual(maxStorage)
    })

    test('should return maxStorage - contentSize if just one content added', async () => {
      const contentSize = 10
      await this.metadataManager.save(did, key, content, contentSize)
      const available = await this.centralizedPinnerProvider.getAvailableStorage(did)

      expect(available).toEqual(maxStorage - contentSize)
    })

    test('should return zero if the maxStorage has been reached', async () => {
      await this.metadataManager.save(did, key, content, maxStorage)
      const available = await this.centralizedPinnerProvider.getAvailableStorage(did)

      expect(available).toEqual(0)
    })

    test('should return zero even if the maxStorage has been exceeded', async () => {
      await this.metadataManager.save(did, key, content, maxStorage + 10)
      const available = await this.centralizedPinnerProvider.getAvailableStorage(did)

      expect(available).toEqual(0)
    })
  })

  describe('create', () => {
    test('should create content if is smaller than the maxStorage', async () => {
      const cid = await this.centralizedPinnerProvider.create(did, key, content)

      expect(cid).toBeTruthy()
    })

    test('should throw an error if trying to create content bigger than the maxStorage', async () => {
      expect(() => this.centralizedPinnerProvider.create(did, key, largeContent)).rejects.toThrow(MAX_STORAGE_REACHED)
    })

    test('should throw an error if the new content will exceed the maxStorage', async () => {
      const cid = await this.centralizedPinnerProvider.create(did, key, maxStorageContent)
      expect(cid).toBeTruthy()

      expect(() => this.centralizedPinnerProvider.create(did, key, maxStorageContent)).rejects.toThrow(MAX_STORAGE_REACHED)
    })

    test('should allow to create content for a different did', async () => {
      const firstCid = await this.centralizedPinnerProvider.create(did, key, maxStorageContent)
      expect(firstCid).toBeTruthy()

      const anotherDid = 'did:ethr:rsk:0123456789abcdef'
      const secondCid = await this.centralizedPinnerProvider.create(anotherDid, key, maxStorageContent)
      expect(secondCid).toBeTruthy()
    })
  })

  describe('swap', () => {
    test('should not throw an error if new content is smaller than the old one and there are space left', async () => {
      await this.centralizedPinnerProvider.create(did, key, maxStorageContent)

      const cid = await this.centralizedPinnerProvider.update(did, key, content)
      expect(cid).toBeTruthy()
    })

    test('should throw an error if new content exceeds max storage', async () => {
      await this.centralizedPinnerProvider.create(did, key, maxStorageContent)

      await expect(() => this.centralizedPinnerProvider.update(did, key, largeContent)).rejects.toThrow(MAX_STORAGE_REACHED)

      const retrievedContent = await this.centralizedPinnerProvider.get(did, key)
      expect(retrievedContent).toHaveLength(1)
      expect(retrievedContent[0].content).toEqual(maxStorageContent)
    })

    test('should not throw an error if content to add is greater than old one but it does not exceeds max storage', async () => {
      await this.centralizedPinnerProvider.create(did, key, content)

      const cid = await this.centralizedPinnerProvider.update(did, key, maxStorageContent)

      expect(cid).toBeTruthy()
    })

    test('should throw an error if new content to add is smaller than the one to swap but it exceeds the max storage allowed (it may change over the time)', async () => {
      await this.centralizedPinnerProvider.create(did, key, content)

      const anotherContent = 'another content that will be swapped'
      const cidToSwap = await this.centralizedPinnerProvider.create(did, key, anotherContent)

      const anotherProvider = new IpfsPinnerProvider(this.ipfsClient, this.metadataManager, this.ipfsPinner, 20)

      await expect(() => anotherProvider.update(did, key, 'newContent', cidToSwap)).rejects.toThrow(MAX_STORAGE_REACHED)

      const retrievedContent = await anotherProvider.get(did, key)
      expect(retrievedContent).toHaveLength(2)
      expect(retrievedContent[0].content).toEqual(content)
      expect(retrievedContent[1].content).toEqual(anotherContent)
    })
  })
})
