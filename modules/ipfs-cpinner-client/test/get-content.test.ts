import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import DataVaultWebClient from '../src'
import { decryptTestFn, deleteDatabase, getEncryptionPublicKeyTestFn, resetDatabase, setupDataVaultClient, startService, testTimestamp } from './util'
import { Server } from 'http'
import { Connection } from 'typeorm'
import EncryptionManager from '../src/encryption-manager'
import MockDate from 'mockdate'
import localStorageMockFactory from './localStorageMockFactory'

describe('get', function (this: {
  server: Server,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  encryptionManager: EncryptionManager
  serviceDid: string
}) {
  const dbName = 'get.sqlite'

  const setupAndAddFile = async (key: string, file: string): Promise<{ client: DataVaultWebClient, id: string, did: string }> => {
    const { dataVaultClient, did } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const encrypted = await this.encryptionManager.encrypt(file)
    const id = await this.ipfsPinnerProvider.create(did, key, encrypted)

    return { client: dataVaultClient, id, did }
  }

  beforeAll(async () => {
    const { server, serviceUrl, ipfsPinnerProvider, dbConnection, serviceDid } = await startService(dbName, 4600)
    this.server = server
    this.ipfsPinnerProvider = ipfsPinnerProvider
    this.dbConnection = dbConnection
    this.serviceUrl = serviceUrl
    this.encryptionManager = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    })
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

  test('should return an existing content in a form of array', async () => {
    const { dataVaultClient, did } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const key = 'ASavedContent'
    const file = 'hello world'
    const encrypted = await this.encryptionManager.encrypt(file)

    await this.ipfsPinnerProvider.create(did, key, encrypted)

    const content = await dataVaultClient.get({ key })

    expect(content).toBeTruthy()
    expect(content).toBeInstanceOf(Array)
  })

  test('should return the saved content when getting by key with the logged did', async () => {
    const key = 'AnotherSavedContent'
    const file = 'this is something to be saved'

    const { client, id } = await setupAndAddFile(key, file)

    const content = await client.get({ key })
    expect(content).toEqual([{ id, content: file }])
  })

  test('should retrieve multiple content associated to one key', async () => {
    const key = 'MultipleContents'
    const file1 = 'this is content 1'
    const file2 = 'this is content 2'

    const { client, id, did } = await setupAndAddFile(key, file1)

    const encrypted2 = await this.encryptionManager.encrypt(file2)
    const id2 = await this.ipfsPinnerProvider.create(did, key, encrypted2)

    const content = await client.get({ key })
    expect(content).toEqual([
      { id, content: file1 },
      { id: id2, content: file2 }
    ])
  })

  test('should return an empty array if the key has not content associated', async () => {
    const { dataVaultClient } = await setupDataVaultClient(this.serviceUrl, this.serviceDid)

    const key = 'DoNotExist'

    const content = await dataVaultClient.get({ key })
    expect(content).toEqual([])
  })
})
