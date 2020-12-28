import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import DataVaultWebClient from '../src'
import { decryptTestFn, deleteDatabase, getEncryptionPublicKeyTestFn, resetDatabase, startService } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import EncryptionManager from '../src/encryption-manager'

describe('get', function (this: {
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  encryptionManager: EncryptionManager
}) {
  const dbName = 'get.sqlite'

  const setupAndAddFile = async (did: string, key: string, file: string): Promise<{ client: DataVaultWebClient, id: string }> => {
    const client = new DataVaultWebClient({
      serviceUrl: this.serviceUrl,
      encryptionManager: new EncryptionManager({
        getEncryptionPublicKey: undefined,
        decrypt: decryptTestFn
      })})

    const encrypted = await this.encryptionManager.encrypt(file)
    const id = await this.ipfsPinnerProvider.create(did, key, encrypted)

    return { client, id }
  }

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection } = await startService(dbName, 4600)
    this.server = server
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection
    this.serviceUrl = serviceUrl
    this.encryptionManager = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    })
  })

  afterAll(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, dbName)
  })

  afterEach(async () => {
    await resetDatabase(this.dbConnection)
  })

  test('should return an existing content in a form of array', async () => {
    const client = new DataVaultWebClient({
      serviceUrl: this.serviceUrl,
      encryptionManager: new EncryptionManager({
        getEncryptionPublicKey: undefined,
        decrypt: decryptTestFn
      })
    })

    const did = 'did:ethr:rsk:0x123456789'
    const key = 'ASavedContent'
    const file = 'hello world'
    const encrypted = await this.encryptionManager.encrypt(file)

    await this.ipfsPinnerProvider.create(did, key, encrypted)

    const content = await client.get({ did, key })

    expect(content).toBeTruthy()
    expect(content).toBeInstanceOf(Array)
  })

  test('should return the saved content when getting by did and key', async () => {
    const key = 'AnotherSavedContent'
    const file = 'this is something to be saved'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const { client, id } = await setupAndAddFile(did, key, file)

    const content = await client.get({ did, key })
    expect(content).toEqual([{ id, content: file }])
  })

  test('should retrieve multiple content associated to one key', async () => {
    const key = 'MultipleContents'
    const file1 = 'this is content 1'
    const file2 = 'this is content 2'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const { client, id } = await setupAndAddFile(did, key, file1)

    const encrypted2 = await this.encryptionManager.encrypt(file2)
    const id2 = await this.ipfsPinnerProvider.create(did, key, encrypted2)

    const content = await client.get({ did, key })
    expect(content).toEqual([
      { id, content: file1 },
      { id: id2, content: file2 }
    ])
  })

  test('should return an empty array if the key has not content associated', async () => {
    const client = new DataVaultWebClient({
      serviceUrl: this.serviceUrl,
      encryptionManager: new EncryptionManager({
        getEncryptionPublicKey: undefined,
        decrypt: undefined
      })
    })

    const key = 'DoNotExist'
    const did = 'did:ethr:rsk:0x123456abcdef'

    const content = await client.get({ did, key })
    expect(content).toEqual([])
  })
})
