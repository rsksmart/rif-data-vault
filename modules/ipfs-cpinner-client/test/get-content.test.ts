import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import DataVaultWebClient from '../src'
import { deleteDatabase, startService } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'

describe('get', function (this: {
  dbName: string,
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection } = await startService(this.dbName, 4600)
    this.server = server
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection

    return new DataVaultWebClient({ serviceUrl })
  }

  const setupAndAddFile = async (did: string, key: string, file: string): Promise<DataVaultWebClient> => {
    const client = await setup()

    await this.ipfsPinnerProvider.create(did, key, file)

    return client
  }

  afterEach(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should instantiate the library with a serviceUrl', async () => {
    this.dbName = 'get-1.sqlite'
    const client = await setup()

    expect(client).toBeTruthy()
  })

  test('should return an existing content in a form of array', async () => {
    this.dbName = 'get-2.sqlite'
    const client = await setup()

    const did = 'did:ethr:rsk:0x123456789'
    const key = 'ASavedContent'
    const file = 'hello world'

    await this.ipfsPinnerProvider.create(did, key, file)

    const content = await client.get({ did, key })

    expect(content).toBeTruthy()
    expect(content).toBeInstanceOf(Array)
  })

  test('should return the saved content when getting by did and key', async () => {
    this.dbName = 'get-3.sqlite'

    const key = 'AnotherSavedContent'
    const file = 'this is something to be saved'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const client = await setupAndAddFile(did, key, file)

    const content = await client.get({ did, key })
    expect(content).toEqual([file])
  })

  test('should retrieve multiple content associated to one key', async () => {
    this.dbName = 'get-4.sqlite'

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
    this.dbName = 'get-5.sqlite'
    const client = await setup()

    const key = 'DoNotExist'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const content = await client.get({ did, key })
    expect(content).toBeFalsy()
  })
})
