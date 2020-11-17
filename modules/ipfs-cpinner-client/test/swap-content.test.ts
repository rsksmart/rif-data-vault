import DataVaultWebClient, { Signer } from '../src'
import { startService, identityFactory, deleteDatabase, testTimestamp } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import MockDate from 'mockdate'
import ipfsHash from 'ipfs-only-hash'

jest.setTimeout(10000)

describe('swap content', function (this: {
  server: Server,
  dbConnection: Connection,
  dbName: string,
  did: string,
  ipfsPinnerProvider: IpfsPinnerProvider
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(this.dbName, 4607)
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    const signer = clientIdentity.signer as Signer
    this.server = server
    this.dbConnection = dbConnection
    this.ipfsPinnerProvider = ipfsPinnerProvider

    return new DataVaultWebClient({ serviceUrl, did: this.did, signer, serviceDid })
  }

  beforeEach(() => MockDate.set(testTimestamp))

  afterEach(async () => {
    MockDate.reset()
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should return a truthy response', async () => {
    this.dbName = 'swap-1.sqlite'
    const client = await setup()

    const key = 'TheKey21'
    const content = 'the content'

    const response = await client.swap({ key, content })

    expect(response).toBeTruthy()
  })

  test('should return an id as part of the response', async () => {
    this.dbName = 'swap-2.sqlite'
    const client = await setup()

    const key = 'TheKey2'
    const content = 'the content 2'

    const { id } = await client.swap({ key, content })

    expect(id).toBeTruthy()
  })

  test('should create the content if it does not exist', async () => {
    this.dbName = 'swap-3.sqlite'
    const client = await setup()

    const key = 'TheKey3'
    const content = 'the content 3'

    const { id } = await client.swap({ key, content })

    const expected = await ipfsHash.of(Buffer.from(content))

    expect(id).toEqual(expected)
  })

  test('should swap an existing content', async () => {
    this.dbName = 'swap-4.sqlite'
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

  test('should swap the all even if there are more that one content associated to the key', async () => {
    this.dbName = 'swap-5.sqlite'
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
    this.dbName = 'swap-6.sqlite'
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
    this.dbName = 'swap-7.sqlite'
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
