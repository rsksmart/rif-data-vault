import DataVaultWebClient from '../src'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { customStorageFactory, decryptTestFn, deleteDatabase, getEncryptionPublicKeyTestFn, identityFactory, resetDatabase, startService } from './util'
import AuthManager from '../src/auth-manager/testing'
import EncryptionManager from '../src/encryption-manager/asymmetric'

jest.setTimeout(12000)

describe('custom storage', function (this: {
  server: Server,
  dbConnection: Connection,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'custom-storage.sqlite'

  const setup = async (): Promise<DataVaultWebClient> => {
    const { did, personalSign } = await identityFactory()

    return new DataVaultWebClient({
      serviceUrl: this.serviceUrl,
      authManager: new AuthManager({
        did,
        serviceUrl: this.serviceUrl,
        personalSign,
        store: customStorageFactory()
      }),
      encryptionManager: new EncryptionManager({
        getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
        decrypt: decryptTestFn
      })
    })
  }

  beforeAll(async () => {
    const { server, serviceUrl, dbConnection, serviceDid } = await startService(dbName, 4604)
    this.server = server
    this.dbConnection = dbConnection
    this.serviceDid = serviceDid
    this.serviceUrl = serviceUrl
  })

  afterAll(async () => {
    this.server.close()
    await deleteDatabase(this.dbConnection, dbName)
  })

  afterEach(async () => {
    await resetDatabase(this.dbConnection)
  })

  test('should create a content', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.create({ key, content })

    expect(id).toBeTruthy()
  })

  test('should swap content', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.swap({ key, content })

    expect(id).toBeTruthy()
  })

  test('should delete content', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    await client.create({ key, content })
    const deleted = await client.delete({ key })

    expect(deleted).toBeTruthy()
  })
})
