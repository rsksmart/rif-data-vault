import express, { Express } from 'express'
import { setupPublicApi } from '../src/api'
import request from 'supertest'
import { Connection } from 'typeorm'
import { createSqliteConnection, deleteDatabase, ipfsEndpoint, mockedLogger } from './util'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'

async function testContentIsAccessible (
  app: Express,
  database: string,
  arrangeAndTest: (ipfsPinnerProvider: IpfsPinnerProvider) => Promise<any>
) {
  // setup
  const dbConnection = await createSqliteConnection(database)
  const ipfsPinnerProvider = await ipfsPinnerProviderFactory(dbConnection, ipfsEndpoint)
  setupPublicApi(app, ipfsPinnerProvider, mockedLogger)

  await arrangeAndTest(ipfsPinnerProvider)

  return dbConnection
}

const testSingleContentIsAccessible = (
  app: Express,
  database: string,
  { did, key, content }: { did: string, key: string, content: string }
) => {
  const arrangeAndTest = async (ipfsPinnerProvider: IpfsPinnerProvider) => {
    const id = await ipfsPinnerProvider.create(did, key, content)

    const { body } = await request(app).get(`/content/${did}/${key}`).expect(200)

    expect(body).toEqual([{ id, content }])
  }

  return testContentIsAccessible(
    app,
    database,
    arrangeAndTest
  )
}
describe('GET', function (this: {
  database: string,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  app: Express
}) {
  beforeEach(() => { this.app = express() })
  afterEach(() => deleteDatabase(this.dbConnection, this.database))

  describe('tdd', () => {
    test('get content from given did and key', async () => {
      this.database = 'test-1.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.app, this.database, {
        did: 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70',
        key: 'ExistingKey',
        content: 'This is the content'
      })
    })

    test('get a different content from given did and key', async () => {
      this.database = 'test-2.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.app, this.database, {
        did: 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70',
        key: 'ExistingKey',
        content: 'This is another content'
      })
    })

    test('get content from a different did', async () => {
      this.database = 'test-3.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.app, this.database, {
        did: 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79',
        key: 'ExistingKey',
        content: 'This is another content for another did'
      })
    })

    test('get content from a different key', async () => {
      this.database = 'test-4.service.get.sqlite'

      this.dbConnection = await testSingleContentIsAccessible(this.app, this.database, {
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

      const arrangeAndTest = async () => {
        const { body } = await request(this.app).get(`/content/${did}/${key}`).expect(200)

        expect(body).toEqual([])
      }

      this.dbConnection = await testContentIsAccessible(
        this.app,
        this.database,
        arrangeAndTest
      )
    })

    test('get with multiple content uploaded in the same key', async () => {
      this.database = 'test-6.service.get.sqlite'

      const did = 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79'
      const key = 'AnotherKey'
      const content1 = 'This is the content'
      const content2 = 'This is another content'

      const arrangeAndTest = async (ipfsPinnerProvider: IpfsPinnerProvider) => {
        const id1 = await ipfsPinnerProvider.create(did, key, content1)
        const id2 = await ipfsPinnerProvider.create(did, key, content2)

        const { body } = await request(this.app).get(`/content/${did}/${key}`).expect(200)

        expect(body).toEqual([
          { id: id1, content: content1 },
          { id: id2, content: content2 }
        ])
      }

      this.dbConnection = await testContentIsAccessible(
        this.app,
        this.database,
        arrangeAndTest
      )
    })
  })
})
