import { IpfsPinnerProvider, createSqliteConnection, ipfsPinnerProviderFactory } from '../src'
import ipfsHash from 'ipfs-only-hash'
import { deleteDatabase, getRandomString } from './util'
import { Connection } from 'typeorm'
import { DEFAULT_IPFS_API } from '../src/constants'

const database = './ipfs-pinner-provider-factory.ipfsPinnerProvider.test.sqlite'

describe('ipfs pinner provider', function (this: {
  connection: Connection,
  centralizedPinnerProvider: IpfsPinnerProvider
}) {
  const did = 'did:ethr:rsk:12345678'

  beforeAll(async () => {
    this.connection = await createSqliteConnection(database)
    this.centralizedPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection: this.connection, ipfsApiUrl: DEFAULT_IPFS_API })
  })

  afterAll(() => deleteDatabase(this.connection, database))

  test('get keys', async () => {
    const key = getRandomString()
    const content = getRandomString()

    await this.centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await this.centralizedPinnerProvider.getKeys(did)
    expect(retrievedContent).toEqual([key])
  })

  test('create content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const cid = await this.centralizedPinnerProvider.create(did, key, content)

    const expectedCid = await ipfsHash.of(Buffer.from(content))

    expect(cid).toEqual(expectedCid)
  })

  test('get content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const id = await this.centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('update content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const id = await this.centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const anotherContent = 'another'
    const newCid = await this.centralizedPinnerProvider.update(did, key, anotherContent)

    // should get proper content
    const retrievedNewContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedNewContent).toEqual([{ id: newCid, content: anotherContent }])
  })

  test('delete content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const id = await this.centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await this.centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const deleted = await this.centralizedPinnerProvider.delete(did, key)

    expect(deleted).toBeTruthy()
  })
})
