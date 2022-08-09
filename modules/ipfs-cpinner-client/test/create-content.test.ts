import ipfsHash from 'ipfs-only-hash'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import MockDate from 'mockdate'
import localStorageMockFactory from './localStorageMockFactory'
import { deleteDatabase, resetDatabase, startService, testTimestamp, setupDataVaultClient, testMaxStorage, getEncryptionPublicKeyTestFn, decryptTestFn } from './util'
import { MAX_STORAGE_REACHED } from '../src/constants'
import EncryptionManager from '../src/encryption-manager/asymmetric'

jest.setTimeout(12000)

describe('create content', function (this: {
  server: Server,
  dbConnection: Connection,
  did: string,
  ipfsPinnerProvider: IpfsPinnerProvider,
  serviceUrl: string,
  serviceDid: string,
  encryptionManager: EncryptionManager
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
    this.encryptionManager = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    })
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

    const actualContent = await this.ipfsPinnerProvider.get(this.did, key)
    const expected = await ipfsHash.of(Buffer.from(actualContent[0].content))

    expect(id).toEqual(expected)
  })

  test('should save the encrypted content in the service', async () => {
    const client = await setup()

    const key = 'AnotherKeyTest4'
    const content = 'another content for test 4'

    await client.create({ key, content })

    const actualContent = await this.ipfsPinnerProvider.get(this.did, key)

    const decrypted = await this.encryptionManager.decrypt(actualContent[0].content)

    expect(decrypted).toEqual(content)
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
    const decrypted1 = await this.encryptionManager.decrypt(actualContent1[0].content)

    expect(decrypted1).toEqual(content)

    const actualContent2 = await this.ipfsPinnerProvider.get(this.did, key2)
    const decrypted2 = await this.encryptionManager.decrypt(actualContent2[0].content)

    expect(decrypted2).toEqual(content2)
  })

  test('should throw an error if max storage reached', async () => {
    const client = await setup()

    const key = 'KeyTest6'
    const content = 'a'.repeat(testMaxStorage + 10)

    await expect(() => client.create({ key, content })).rejects.toThrow(MAX_STORAGE_REACHED)
  })

  // TODO: Test that doing a login before reduces the execution time
})
