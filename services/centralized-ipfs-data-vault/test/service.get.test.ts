import { Express } from 'express'
import { ipfsPinnerProviderFactory, IpfsPinnerProvider, Entities } from '@rsksmart/ipfs-pinner-provider'
import { setupDataVault } from '../src/data-vault'
import request from 'supertest'
import { deleteDatabase } from '../../../packages/ipfs-cpinner-provider/test/util'
import { Connection, createConnection } from 'typeorm'

const ipfsEndpoint = 'http://localhost:5001'

const createSqliteConnection = (database: string) => createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

async function testContentIsAccessible(
  database: string,
  { did, key }: { did: string, key: string },
  arrange: (ipfsPinnerProvider: IpfsPinnerProvider) => Promise<any>,
  expectedContent: string[]
) {
  // setup
  const dbConnection = await createSqliteConnection(database)
  const ipfsPinnerProvider = await ipfsPinnerProviderFactory(dbConnection, ipfsEndpoint)
  const app = setupDataVault(ipfsPinnerProvider)

  // arrange
  await arrange(ipfsPinnerProvider)

  // act
  const { body } = await request(app).get(`/${did}/${key}`).expect(200)

  // assert
  expect(body.content).toEqual(expectedContent)

  return dbConnection
}

const testSingleContentIsAccessible = (
  database: string,
  { did, key, content }: { did: string, key: string, content: string }
) => testContentIsAccessible(
  database,
  { did, key },
  (ipfsPinnerProvider: IpfsPinnerProvider) => ipfsPinnerProvider.create(did, key, content),
  [content]
)

describe('GET', function (this: {
  database: string,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  app: Express
}) {
  afterEach(() => deleteDatabase(this.dbConnection, this.database))

  describe('tdd', () => {

    test('get content from given did and key', async () => {
      this.database = 'test-1.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.database, {
        did: 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70',
        key: 'ExistingKey',
        content: 'This is the content'
      })
    })

    test('get a different content from given did and key', async () => {
      this.database = 'test-2.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.database, {
        did: 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70',
        key: 'ExistingKey',
        content: 'This is another content'
      })
    })

    test('get content from a different did', async () => {
      this.database = 'test-3.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.database, {
        did: 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79',
        key: 'ExistingKey',
        content: 'This is another content for another did'
      })
    })

    test('get content from a different key', async () => {
      this.database = 'test-4.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.database, {
        did: 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79',
        key: 'AnotherKey',
        content: 'This is a content for another key'
      })
    })
  })

  describe('other cases', () => {
    test('get with no content uploaded', async () => {
      this.database = 'test-5.service.get.sqlite'

      const did = 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79'
      const key = 'AnotherKey'

      this.dbConnection = await testContentIsAccessible(
        this.database,
        { did, key },
        async () => { }, // no op
        []
      )
    })

    test('get with multiple content uploaded in the same key', async () => {
      this.database = 'test-6.service.get.sqlite'

      const did = 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79'
      const key = 'AnotherKey'
      const content1 = 'This is the content'
      const content2 = 'This is another content'

      this.dbConnection = await testContentIsAccessible(
        this.database,
        { did, key },
        async (ipfsPinnerProvider: IpfsPinnerProvider) => {
          await ipfsPinnerProvider.create(did, key, content1)
          await ipfsPinnerProvider.create(did, key, content2)}, // no op
        [content1, content2]
      )
    })
  })
})
