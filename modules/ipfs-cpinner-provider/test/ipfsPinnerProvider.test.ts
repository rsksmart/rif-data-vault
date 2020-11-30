import { Connection } from 'typeorm'
import IpfsHttpClient from 'ipfs-http-client'
import {
  IpfsPinnerProvider,
  IpfsClient, IpfsMetadata, IpfsPinnedCid,
  IpfsPinner, MetadataManager
} from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'
import ipfsHash from 'ipfs-only-hash'

const database = './ipfs-pinner-provider.ipfsPinnerProvider.test.sqlite'

describe('ipfs pinner provider', () => {
  let dbConnection: Promise<Connection>
  let centralizedPinnerProvider: IpfsPinnerProvider

  const did = 'did:ethr:rsk:12345678'
  const key = 'the key'
  const content = 'the content'

  beforeAll(() => {
    dbConnection = createSqliteConnection(database)
  })

  beforeEach(async () => {
    await resetDatabase(dbConnection)

    const ipfsHttpClient = IpfsHttpClient({ url: 'http://localhost:5001' })
    const pinnedCidsRepository = (await dbConnection).getRepository(IpfsPinnedCid)
    const metadataRepository = (await dbConnection).getRepository(IpfsMetadata)

    const ipfsClient = new IpfsClient(ipfsHttpClient)
    const ipfsPinner = new IpfsPinner(ipfsHttpClient, pinnedCidsRepository)
    const metadataManager = new MetadataManager(metadataRepository)

    centralizedPinnerProvider = new IpfsPinnerProvider(ipfsClient, metadataManager, ipfsPinner)
  })

  afterAll(async () => {
    deleteDatabase(await dbConnection, database)
  })

  test('create content', async () => {
    const cid = await centralizedPinnerProvider.create(did, key, content)

    const expectedCid = await ipfsHash.of(Buffer.from(content))

    expect(cid).toEqual(expectedCid)
  })

  test('get one content', async () => {
    const id = await centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('get two contents', async () => {
    const anotherContent = 'another content'

    const id1 = await centralizedPinnerProvider.create(did, key, content)
    const id2 = await centralizedPinnerProvider.create(did, key, anotherContent)

    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([
      { id: id1, content },
      { id: id2, content: anotherContent }
    ])
  })

  test('get non existent content', async () => {
    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([])
  })

  test('get non existent key', async () => {
    const retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')

    expect(retrievedContent).toEqual([])
  })

  test('update content without specifying cid', async () => {
    const firstCid = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id: firstCid, content }])

    const newContent = 'the new one'
    const id = await centralizedPinnerProvider.update(did, key, newContent)

    // should get new content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content: newContent }])
  })

  test('update unexisting content should add the new one', async () => {
    const id = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const newContent = 'new content'
    const newId = await centralizedPinnerProvider.update(did, 'no exists', newContent)

    // should get new content and also old one, because was not deleted
    retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([{ id: newId, content: newContent }])

    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('update unexisting content specifyng cid should add the new one', async () => {
    const id = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const newContent = 'new content'
    const newId = await centralizedPinnerProvider.update(did, 'no exists', newContent, id)

    // should get new content and also old one, because was not deleted
    retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([{ id: newId, content: newContent }])

    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('update content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be updateped'
    const cidToupdate = await centralizedPinnerProvider.create(did, key, content)
    const anotherCid = await centralizedPinnerProvider.create(did, key, remainContent)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([
      { id: cidToupdate, content },
      { id: anotherCid, content: remainContent }
    ])

    const newContent = 'the new one'
    const updatedCid = await centralizedPinnerProvider.update(did, key, newContent, cidToupdate)

    // should get new content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([
      { id: anotherCid, content: remainContent },
      { id: updatedCid, content: newContent }
    ])
  })

  test('delete content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be updateped'
    const cidToDelete = await centralizedPinnerProvider.create(did, key, content)
    const remainCid = await centralizedPinnerProvider.create(did, key, remainContent)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([
      { id: cidToDelete, content },
      { id: remainCid, content: remainContent }
    ])

    const deleted = await centralizedPinnerProvider.delete(did, key, cidToDelete)

    expect(deleted).toBeTruthy()

    // should get remain content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id: remainCid, content: remainContent }])
  })

  test('delete unexisting key', async () => {
    const deleted = await centralizedPinnerProvider.delete(did, 'no exists')

    expect(deleted).toBeFalsy()
  })

  test('delete unexisting cid', async () => {
    const deleted = await centralizedPinnerProvider.delete(did, key, 'no exists')

    expect(deleted).toBeFalsy()
  })

  test('delete content without specifying cid', async () => {
    const id = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const deleted = await centralizedPinnerProvider.delete(did, key)

    expect(deleted).toBeTruthy()
  })

  test('get all keys by did should return an empty array if no keys', async () => {
    const keys = await centralizedPinnerProvider.getKeys(did)

    expect(keys).toEqual([])
  })

  test('get all keys by did should return all the created keys', async () => {
    const anotherKey = 'another key'

    await centralizedPinnerProvider.create(did, key, content)
    await centralizedPinnerProvider.create(did, anotherKey, content)

    const keys = await centralizedPinnerProvider.getKeys(did)

    expect(keys).toEqual([key, anotherKey])
  })
})
