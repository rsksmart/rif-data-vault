import DataVaultWebClient, { Signer } from '../src'
import ipfsHash from 'ipfs-only-hash'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { deleteDatabase, identityFactory, startService } from './util'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import MockDate from 'mockdate'

jest.setTimeout(10000) // it will perform two requests: login and create

describe('create content', function (this: {
  server: Server,
  dbConnection: Connection,
  dbName: string,
  did: string,
  ipfsPinnerProvider: IpfsPinnerProvider
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(this.dbName, 4604)
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    const signer = clientIdentity.signer as Signer
    this.server = server
    this.dbConnection = dbConnection
    this.ipfsPinnerProvider = ipfsPinnerProvider

    return new DataVaultWebClient({ serviceUrl, did: this.did, signer, serviceDid })
  }

  beforeEach(() => MockDate.set(Date.now()))

  afterEach(async () => {
    MockDate.reset()
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should return something', async () => {
    this.dbName = 'create-1.sqlite'
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const response = await client.create({ key, content })

    expect(response).toBeTruthy()
  })

  test('should return an id', async () => {
    this.dbName = 'create-2.sqlite'
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.create({ key, content })

    expect(id).toBeTruthy()
  })

  test('should return an ipfs cid', async () => {
    this.dbName = 'create-3.sqlite'
    const client = await setup()

    const key = 'AnotherKey'
    const content = 'another content'

    const { id } = await client.create({ key, content })

    const expected = await ipfsHash.of(Buffer.from(content))

    expect(id).toEqual(expected)
  })

  test('should save the content in the service', async () => {
    this.dbName = 'create-4.sqlite'
    const client = await setup()

    const key = 'AnotherKeyTest4'
    const content = 'another content for test 4'

    await client.create({ key, content })

    const actualContent = await this.ipfsPinnerProvider.get(this.did, key)

    expect(actualContent).toEqual([content])
  })

  // TODO: Test that doing a login before reduces the execution time
  // TODO: Test refreshing the expired AT
})
