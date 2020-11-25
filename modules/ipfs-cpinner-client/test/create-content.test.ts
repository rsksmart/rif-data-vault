import ipfsHash from 'ipfs-only-hash'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import MockDate from 'mockdate'
import localStorageMockFactory from './localStorageMockFactory'
import { deleteDatabase, resetDatabase, startService, testTimestamp, setupDataVaultClient } from './util'

jest.setTimeout(12000)

describe('create content', function (this: {
  server: Server,
  dbConnection: Connection,
  did: string,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'create.sqlite'

  const setup = () => setupDataVaultClient(this.serviceUrl, this.serviceDid)
    .then(({ did, dataVaultClient }) => {
      this.did = did
      return dataVaultClient
    })

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(dbName, 4601)

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

  test('should return an id', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.create({ key, content })

    expect(id).toBeTruthy()
  })

  test('should return an ipfs cid', async () => {
    const client = await setup()

    const key = 'AnotherKey'
    const content = 'another content'

    const { id } = await client.create({ key, content })

    const expected = await ipfsHash.of(Buffer.from(content))

    expect(id).toEqual(expected)
  })

  test('should save the content in the service', async () => {
    const client = await setup()

    const key = 'AnotherKeyTest4'
    const content = 'another content for test 4'

    await client.create({ key, content })

    const actualContent = await this.ipfsPinnerProvider.get(this.did, key)

    expect(actualContent).toEqual([content])
  })

  test('should refresh the access token if necessary', async () => {
    const client = await setup()

    const key = 'KeyTest5'
    const content = 'content for test 5'

    await client.create({ key, content })

    MockDate.set(testTimestamp + 1 * 60 * 60 * 1000) // add 1 hour

    const key2 = 'AnotherKeyTest5'
    const content2 = 'another content for test 5'

    await client.create({ key: key2, content: content2 })

    const actualContent1 = await this.ipfsPinnerProvider.get(this.did, key)
    expect(actualContent1).toEqual([content])

    const actualContent2 = await this.ipfsPinnerProvider.get(this.did, key2)
    expect(actualContent2).toEqual([content2])
  })

  // TODO: Test that doing a login before reduces the execution time
})
