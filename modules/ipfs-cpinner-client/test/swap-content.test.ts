import { startService, setupDataVaultClient, deleteDatabase, testTimestamp, resetDatabase } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import MockDate from 'mockdate'
import ipfsHash from 'ipfs-only-hash'
import localStorageMockFactory from './localStorageMockFactory'

jest.setTimeout(10000)

describe('swap content', function (this: {
  server: Server,
  dbConnection: Connection,
  did: string,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'swap.sqlite'

  const setup = () => setupDataVaultClient(this.serviceUrl, this.serviceDid)
    .then(({ did, dataVaultClient }) => {
      this.did = did
      return dataVaultClient
    })

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(dbName, 4602)
    this.server = server
    this.dbConnection = dbConnection
    this.ipfsPinnerProvider = ipfsPinnerProvider
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

  test('should return an id as part of the response', async () => {
    const client = await setup()

    const key = 'TheKey2'
    const content = 'the content 2'

    const { id } = await client.swap({ key, content })

    expect(id).toBeTruthy()
  })

  test('should create the content if it does not exist', async () => {
    const client = await setup()

    const key = 'TheKey3'
    const content = 'the content 3'

    const { id } = await client.swap({ key, content })

    const expected = await ipfsHash.of(Buffer.from(content))

    expect(id).toEqual(expected)
  })

  test('should swap an existing content', async () => {
    const client = await setup()

    const key = 'TheKey4'
    const content = 'the content 4'

    const originalCid = await this.ipfsPinnerProvider.create(this.did, key, content)

    const newContent = 'this is the new content'
    const { id } = await client.swap({ key, content: newContent })

    const expected = await this.ipfsPinnerProvider.get(this.did, key)

    expect(expected).toEqual([newContent])
    expect(id).not.toEqual(originalCid)
  })

  test('should swap all the content even if there are more that one content associated to the key', async () => {
    const client = await setup()

    const key = 'TheKey5'
    const firstContent = 'the content 5'
    const secondContent = 'another content 5'

    await this.ipfsPinnerProvider.create(this.did, key, firstContent)
    await this.ipfsPinnerProvider.create(this.did, key, secondContent)

    const beforeSwapping = await this.ipfsPinnerProvider.get(this.did, key)
    expect(beforeSwapping).toEqual([firstContent, secondContent])

    const newContent = 'this is the new content'
    await client.swap({ key, content: newContent })

    const expected = await this.ipfsPinnerProvider.get(this.did, key)
    expect(expected).toEqual([newContent])
  })

  test('should swap only the content associated to the given id if present', async () => {
    const client = await setup()

    const key = 'TheKey6'
    const firstContent = 'the content 6'
    const secondContent = 'another content 6'

    const cid1 = await this.ipfsPinnerProvider.create(this.did, key, firstContent)
    await this.ipfsPinnerProvider.create(this.did, key, secondContent)

    const beforeSwapping = await this.ipfsPinnerProvider.get(this.did, key)
    expect(beforeSwapping).toEqual([firstContent, secondContent])

    const newContent = 'this is the new content'
    await client.swap({ key, content: newContent, id: cid1 })

    const expected = await this.ipfsPinnerProvider.get(this.did, key)
    expect(expected).toEqual([secondContent, newContent])
  })

  test('should refresh the token if necessary', async () => {
    const client = await setup()

    const key = 'TheKey7'
    const firstContent = 'the content 7'
    const secondContent = 'another content 7'

    const cid1 = await this.ipfsPinnerProvider.create(this.did, key, firstContent)
    const cid2 = await this.ipfsPinnerProvider.create(this.did, key, secondContent)

    const newContent = 'this is the new content'
    await client.swap({ key, content: newContent, id: cid1 })

    MockDate.set(testTimestamp + 1 * 60 * 60 * 1000) // add 1 hour

    await client.swap({ key, content: newContent, id: cid2 })

    const expected = await this.ipfsPinnerProvider.get(this.did, key)
    expect(expected).toEqual([newContent, newContent])
  })
})
