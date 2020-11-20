import DataVaultWebClient from '../src'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { customStorageFactory, deleteDatabase, identityFactory, resetDatabase, startService, testTimestamp } from './util'
import MockDate from 'mockdate'
import { Signer } from '../src/types'

jest.setTimeout(12000)

describe('custom storage', function (this: {
  server: Server,
  dbConnection: Connection,
  serviceUrl: string,
  serviceDid: string
}) {
  const dbName = 'custom-storage.sqlite'

  const setup = async (): Promise<DataVaultWebClient> => {
    const clientIdentity = await identityFactory()
    const did = clientIdentity.did
    const signer = clientIdentity.signer as Signer

    return new DataVaultWebClient(
      { serviceUrl: this.serviceUrl, did, signer, serviceDid: this.serviceDid, storage: customStorageFactory() }
    )
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

  beforeEach(() => MockDate.set(testTimestamp))

  afterEach(async () => {
    MockDate.reset()
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
