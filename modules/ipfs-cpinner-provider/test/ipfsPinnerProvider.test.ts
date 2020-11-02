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
    await centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([content])
  })

  test('get two contents', async () => {
    const anotherContent = 'another content'

    await centralizedPinnerProvider.create(did, key, content)
    await centralizedPinnerProvider.create(did, key, anotherContent)

    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([content, anotherContent])
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
    await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const newContent = 'the new one'
    await centralizedPinnerProvider.update(did, key, newContent)

    // should get new content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([newContent])
  })

  test('update unexisting content should add the new one', async () => {
    await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const newContent = 'new content'
    await centralizedPinnerProvider.update(did, 'no exists', newContent)

    // should get new content and also old one, because was not deleted
    retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([newContent])

    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])
  })

  test('update unexisting content specifyng cid should add the new one', async () => {
    const cid = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const newContent = 'new content'
    await centralizedPinnerProvider.update(did, 'no exists', newContent, cid)

    // should get new content and also old one, because was not deleted
    retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([newContent])

    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])
  })

  test('update content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be updateped'
    const cidToupdate = await centralizedPinnerProvider.create(did, key, content)
    await centralizedPinnerProvider.create(did, key, remainContent)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content, remainContent])

    const newContent = 'the new one'
    await centralizedPinnerProvider.update(did, key, newContent, cidToupdate)

    // should get new content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([remainContent, newContent])
  })

  test('update content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be updateped'
    const cidToDelete = await centralizedPinnerProvider.create(did, key, content)
    await centralizedPinnerProvider.create(did, key, remainContent)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content, remainContent])

    const deleted = await centralizedPinnerProvider.delete(did, key, cidToDelete)

    expect(deleted).toBeTruthy()

    // should get remain content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([remainContent])
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
    await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const deleted = await centralizedPinnerProvider.delete(did, key)

    expect(deleted).toBeTruthy()
  })
})
