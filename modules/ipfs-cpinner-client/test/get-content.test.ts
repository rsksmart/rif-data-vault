import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import DataVaultWebClient from '../src'
import { deleteDatabase, resetDatabase, startService } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'

describe('get', function (this: {
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string
}) {
  const dbName = 'get.sqlite'

  const setupAndAddFile = async (did: string, key: string, file: string): Promise<DataVaultWebClient> => {
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    await this.ipfsPinnerProvider.create(did, key, file)

    return client
  }

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection } = await startService(dbName, 4600)
    this.server = server
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection
    this.serviceUrl = serviceUrl
  })

  afterAll(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, dbName)
  })

  afterEach(async () => {
    await resetDatabase(this.dbConnection)
  })

  test('should instantiate the library with a serviceUrl', async () => {
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    expect(client).toBeTruthy()
  })

  test('should return an existing content in a form of array', async () => {
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    const did = 'did:ethr:rsk:0x123456789'
    const key = 'ASavedContent'
    const file = 'hello world'

    await this.ipfsPinnerProvider.create(did, key, file)

    const content = await client.get({ did, key })

    expect(content).toBeTruthy()
    expect(content).toBeInstanceOf(Array)
  })

  test('should return the saved content when getting by did and key', async () => {
    const key = 'AnotherSavedContent'
    const file = 'this is something to be saved'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const client = await setupAndAddFile(did, key, file)

    const content = await client.get({ did, key })
    expect(content).toEqual([file])
  })

  test('should retrieve multiple content associated to one key', async () => {
    const key = 'MultipleContents'
    const file1 = 'this is content 1'
    const file2 = 'this is content 2'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const client = await setupAndAddFile(did, key, file1)
    await this.ipfsPinnerProvider.create(did, key, file2)

    const content = await client.get({ did, key })
    expect(content).toEqual([file1, file2])
  })

  test('should return undefined if the key has not content associated', async () => {
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    const key = 'DoNotExist'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const content = await client.get({ did, key })
    expect(content).toBeFalsy()
  })
})
