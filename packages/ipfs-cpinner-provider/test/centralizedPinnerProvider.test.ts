import { Connection } from 'typeorm'
import IpfsHttpClient from 'ipfs-http-client'
import CentralizedPinnerProvider, { IpfsClient, IpfsPinner, MetadataManager } from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'
import { IpfsMetadata, IpfsPinnedCid } from '../src/entities'
import ipfsHash from 'ipfs-only-hash'

const database = './ipfs-pinner-provider.centralizedPinnerProvider.test.sqlite'

describe('centralized pinner provider', () => {
  let dbConnection: Promise<Connection>
  let centralizedPinnerProvider: CentralizedPinnerProvider

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

    centralizedPinnerProvider = new CentralizedPinnerProvider(ipfsClient, metadataManager, ipfsPinner)
  })

  afterAll(async () => {
    deleteDatabase(await dbConnection, database)
  })

  test('put content', async () => {
    const cid = await centralizedPinnerProvider.put(did, key, content)

    const expectedCid = await ipfsHash.of(Buffer.from(content))

    expect(cid).toEqual(expectedCid)
  })

  test('get one content', async () => {
    await centralizedPinnerProvider.put(did, key, content)

    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([content])
  })

  test('get two contents', async () => {
    const anotherContent = 'another content'

    await centralizedPinnerProvider.put(did, key, content)
    await centralizedPinnerProvider.put(did, key, anotherContent)

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

  test('swap content without specifying cid', async () => {
    await centralizedPinnerProvider.put(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const newContent = 'the new one'
    await centralizedPinnerProvider.swap(did, key, newContent)

    // should get new content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([newContent])
  })

  test('swap unexisting content should add the new one', async () => {
    await centralizedPinnerProvider.put(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const newContent = 'new content'
    await centralizedPinnerProvider.swap(did, 'no exists', newContent)

    // should get new content and also old one, because was not deleted
    retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([newContent])

    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])
  })

  test('swap unexisting content specifyng cid should add the new one', async () => {
    const cid = await centralizedPinnerProvider.put(did, key, content)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const newContent = 'new content'
    await centralizedPinnerProvider.swap(did, 'no exists', newContent, cid)

    // should get new content and also old one, because was not deleted
    retrievedContent = await centralizedPinnerProvider.get(did, 'no exists')
    expect(retrievedContent).toEqual([newContent])

    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])
  })

  test('swap content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be swapped'
    const cidToSwap = await centralizedPinnerProvider.put(did, key, content)
    await centralizedPinnerProvider.put(did, key, remainContent)

    // should get proper content
    let retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content, remainContent])

    const newContent = 'the new one'
    await centralizedPinnerProvider.swap(did, key, newContent, cidToSwap)

    // should get new content
    retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([remainContent, newContent])
  })

  test('swap content specifying cid, should delete only one content', async () => {
    const remainContent = 'this content will not be swapped'
    const cidToDelete = await centralizedPinnerProvider.put(did, key, content)
    await centralizedPinnerProvider.put(did, key, remainContent)

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
    await centralizedPinnerProvider.put(did, key, content)

    // should get proper content
    const retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([content])

    const deleted = await centralizedPinnerProvider.delete(did, key)

    expect(deleted).toBeTruthy()
  })
})
