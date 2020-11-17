import DataVaultWebClient, { ClientKeyValueStorage, Signer } from '../src'
import { Connection } from 'typeorm'
import { Server } from 'http'
import { deleteDatabase, identityFactory, startService, testTimestamp } from './util'
import MockDate from 'mockdate'
import LocalStorageMockFactory from './localStorageMockFactory'

jest.setTimeout(12000)

describe('custom storage', function (this: {
  server: Server,
  dbConnection: Connection,
  dbName: string,
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const { server, serviceUrl, dbConnection, serviceDid } = await startService(this.dbName, 4608)
    const clientIdentity = await identityFactory()
    const did = clientIdentity.did
    const signer = clientIdentity.signer as Signer
    this.server = server
    this.dbConnection = dbConnection

    const storageFactory = (): ClientKeyValueStorage => {
      const store: any = {}
      return {
        get: async (key: string) => {
          return store[key]
        },
        set: async (key: string, value: string) => {
          store[key] = value.toString()
        }
      }
    }

    return new DataVaultWebClient({ serviceUrl, did, signer, serviceDid, storage: storageFactory() })
  }

  beforeEach(() => {
    MockDate.set(testTimestamp)
    global.localStorage = LocalStorageMockFactory()
  })

  afterEach(async () => {
    MockDate.reset()
    this.server.close()
    await deleteDatabase(this.dbConnection, this.dbName)
  })

  test('should create a content', async () => {
    this.dbName = 'custom-storage-1.sqlite'
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.create({ key, content })

    expect(id).toBeTruthy()
  })

  test('should swap content', async () => {
    this.dbName = 'custom-storage-2.sqlite'
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.swap({ key, content })

    expect(id).toBeTruthy()
  })

  test('should delete content', async () => {
    this.dbName = 'custom-storage-3.sqlite'
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    await client.create({ key, content })
    const deleted = await client.delete({ key })

    expect(deleted).toBeTruthy()
  })
})
