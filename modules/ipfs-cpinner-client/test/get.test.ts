import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import DataVaultWebClient from '../src'
import { deleteDatabase, startService } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'

describe('get', function (this: {
  dbName: string,
  server: Server,
  serviceUrl: string,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider
}) {
  const setup = async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection } = await startService(this.dbName)
    this.server = server
    this.serviceUrl = serviceUrl
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection
  }

  const setupAndAddFile = async (did: string, key: string, file: string) => {
    await setup()

    await this.ipfsPinnerProvider.create(did, key, file)
  }

  afterEach(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should instantiate the library with a serviceUrl', async () => {
    this.dbName = 'get-1.sqlite'
    await setup()
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    expect(client).toBeTruthy()
  })

  test('should return an existing content in a form of array', async () => {
    this.dbName = 'get-2.sqlite'
    await setup()

    const did = 'did:ethr:rsk:0x123456789'
    const key = 'ASavedContent'
    const file = 'hello world'

    await this.ipfsPinnerProvider.create(did, key, file)

    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    const content = await client.get({ did, key })
    expect(content).toBeTruthy()
    expect(content).toBeInstanceOf(Array)
  })

  test('should return the saved content when getting by did and key', async () => {
    this.dbName = 'get-3.sqlite'

    const key = 'AnotherSavedContent'
    const file = 'this is something to be saved'
    const did = 'did:ethr:rsk:0x123456abcdef'

    await setupAndAddFile(did, key, file)

    const client = new DataVaultWebClient(({ serviceUrl: this.serviceUrl }))

    const content = await client.get({ did, key })
    expect(content).toEqual([file])
  })

  test('should retrieve multiple content associated to one key', async () => {
    this.dbName = 'get-4.sqlite'

    const key = 'MultipleContents'
    const file1 = 'this is content 1'
    const file2 = 'this is content 2'
    const did = 'did:ethr:rsk:0x123456abcdef'

    await setupAndAddFile(did, key, file1)
    await this.ipfsPinnerProvider.create(did, key, file2)

    const client = new DataVaultWebClient(({ serviceUrl: this.serviceUrl }))

    const content = await client.get({ did, key })
    expect(content).toEqual([file1, file2])
  })

  test('should return undefined if the key has not content associated', async () => {
    this.dbName = 'get-5.sqlite'
    await setup()

    const key = 'DoNotExist'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const client = new DataVaultWebClient(({ serviceUrl: this.serviceUrl }))

    const content = await client.get({ did, key })
    expect(content).toBeFalsy()
  })
})
