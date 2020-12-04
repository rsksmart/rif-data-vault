import { Connection } from 'typeorm'
import IpfsHttpClient from 'ipfs-http-client'
import {
  IpfsPinnerProvider,
  IpfsClient, IpfsMetadata, IpfsPinnedCid,
  IpfsPinner, MetadataManager
} from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'
import ipfsHash from 'ipfs-only-hash'
import { DEFAULT_IPFS_API, DEFAULT_MAX_STORAGE } from '../src/constants'

const database = './ipfs-pinner-provider.ipfsPinnerProvider.test.sqlite'

describe('ipfs pinner provider', function (this: {
  dbConnection: Connection
  centralizedPinnerProvider: IpfsPinnerProvider
}) {
  const did = 'did:ethr:rsk:12345678'
  const key = 'the key'
  const content = 'the content'

  beforeAll(async () => {
    this.dbConnection = await createSqliteConnection(database)
  })

  beforeEach(async () => {
    await resetDatabase(this.dbConnection)

    const ipfsHttpClient = IpfsHttpClient({ url: DEFAULT_IPFS_API })
    const pinnedCidsRepository = this.dbConnection.getRepository(IpfsPinnedCid)
    const metadataRepository = this.dbConnection.getRepository(IpfsMetadata)

    const ipfsClient = new IpfsClient(ipfsHttpClient)
    const ipfsPinner = new IpfsPinner(ipfsHttpClient, pinnedCidsRepository)
    const metadataManager = new MetadataManager(metadataRepository)

    this.centralizedPinnerProvider = new IpfsPinnerProvider(ipfsClient, metadataManager, ipfsPinner, DEFAULT_MAX_STORAGE)
  })

  afterAll(() => deleteDatabase(this.dbConnection, database))

  test('create content', async () => {
    const cid = await this.centralizedPinnerProvider.create(did, key, content)

    const expectedCid = await ipfsHash.of(Buffer.from(content))

    expect(cid).toEqual(expectedCid)
  })

  test('create empty content', async () => {
    const cid = await this.centralizedPinnerProvider.create(did, key, '')

    const expectedCid = await ipfsHash.of(Buffer.from(''))

    expect(cid).toEqual(expectedCid)
  })

  test('get one content', async () => {
    const id = await this.centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('get two contents', async () => {
    const anotherContent = 'another content'

    const id1 = await this.centralizedPinnerProvider.create(did, key, content)
    const id2 = await this.centralizedPinnerProvider.create(did, key, anotherContent)

    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([
      { id: id1, content },
      { id: id2, content: anotherContent }
    ])
  })

  test('get non existent content', async () => {
    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([])
  })

  test('get non existent key', async () => {
    const retrievedContent = await this.centralizedPinnerProvider.get(did, 'no exists')

    expect(retrievedContent).toEqual([])
  })

  test('update content without specifying cid', async () => {
    const firstCid = await this.centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id: firstCid, content }])

    const newContent = 'the new one'
    const id = await this.centralizedPinnerProvider.update(did, key, newContent)

    // should get new content
    retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content: newContent }])
  })

  test('update unexisting content should add the new one', async () => {
    const id = await this.centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const newContent = 'new content'
    const newId = await this.centralizedPinnerProvider.update(did, 'no exists', newContent)

    // should get new content and also old one, because was not deleted
    retrievedContent = await this.centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([{ id: newId, content: newContent }])

    retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('update unexisting content specifyng cid should add the new one', async () => {
    const id = await this.centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const newContent = 'new content'
    const newId = await this.centralizedPinnerProvider.update(did, 'no exists', newContent, id)

    // should get new content and also old one, because was not deleted
    retrievedContent = await this.centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([{ id: newId, content: newContent }])

    retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('update content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be updateped'
    const cidToupdate = await this.centralizedPinnerProvider.create(did, key, content)
    const anotherCid = await this.centralizedPinnerProvider.create(did, key, remainContent)

    // should get proper content
    let retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([
      { id: cidToupdate, content },
      { id: anotherCid, content: remainContent }
    ])

    const newContent = 'the new one'
    const updatedCid = await this.centralizedPinnerProvider.update(did, key, newContent, cidToupdate)

    // should get new content
    retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([
      { id: anotherCid, content: remainContent },
      { id: updatedCid, content: newContent }
    ])
  })

  test('delete content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be updateped'
    const cidToDelete = await this.centralizedPinnerProvider.create(did, key, content)
    const remainCid = await this.centralizedPinnerProvider.create(did, key, remainContent)

    // should get proper content
    let retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([
      { id: cidToDelete, content },
      { id: remainCid, content: remainContent }
    ])

    const deleted = await this.centralizedPinnerProvider.delete(did, key, cidToDelete)

    expect(deleted).toBeTruthy()

    // should get remain content
    retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id: remainCid, content: remainContent }])
  })

  test('delete unexisting key', async () => {
    const deleted = await this.centralizedPinnerProvider.delete(did, 'no exists')

    expect(deleted).toBeFalsy()
  })

  test('delete unexisting cid', async () => {
    const deleted = await this.centralizedPinnerProvider.delete(did, key, 'no exists')

    expect(deleted).toBeFalsy()
  })

  test('delete content without specifying cid', async () => {
    const id = await this.centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const deleted = await this.centralizedPinnerProvider.delete(did, key)

    expect(deleted).toBeTruthy()
  })

  test('get all keys by did should return an empty array if no keys', async () => {
    const keys = await this.centralizedPinnerProvider.getKeys(did)

    expect(keys).toEqual([])
  })

  test('get all keys by did should return all the created keys', async () => {
    const anotherKey = 'another key'

    await this.centralizedPinnerProvider.create(did, key, content)
    await this.centralizedPinnerProvider.create(did, anotherKey, content)

    const keys = await this.centralizedPinnerProvider.getKeys(did)

    expect(keys).toEqual([key, anotherKey])
  })
})
