import { setupPermissionedApi } from '../src/api'
import express, { Express } from 'express'
import { Connection } from 'typeorm'
import request from 'supertest'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import { createSqliteConnection, deleteDatabase, ipfsApiUrl, mockedLogger } from './util'
import bodyParser from 'body-parser'

describe('PUT', function (this: {
  app: Express,
  did: string
  middleware: (req, res, next) => any,
  dbConnection: Connection,
  dbName: string,
  provider: IpfsPinnerProvider
}) {
  const setup = async () => {
    this.dbConnection = await createSqliteConnection(this.dbName)
    this.provider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl })

    setupPermissionedApi(this.app, this.provider, mockedLogger)
  }

  beforeEach(() => {
    this.did = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70'
    this.middleware = (req, res, next) => {
      req.user = { did: this.did }
      next()
    }
    this.app = express()
    this.app.use(bodyParser.json())
    this.app.use(this.middleware)
  })

  afterEach(() => deleteDatabase(this.dbConnection, this.dbName))

  describe('/:key', () => {
    describe('tdd', () => {
      test('should respond an HTTP 200 with an empty object', async () => {
        this.dbName = 'delete-1.dv-service.slite'
        await setup()

        const key = 'AKey'
        const { body } = await request(this.app).delete(`/content/${key}`).expect(200)

        expect(body).toMatchObject({})
      })

      test('should delete the single content associated with the key', async () => {
        this.dbName = 'delete-2.dv-service.slite'
        await setup()

        const key = 'OneKey'
        const content = 'The content'
        await this.provider.create(this.did, key, content)

        await request(this.app).delete(`/content/${key}`).expect(200)

        const retrievedContent = await this.provider.get(this.did, key)
        expect(retrievedContent).toEqual([])
      })
    })

    describe('border', () => {
      test('should delete multiple content associated to one key', async () => {
        this.dbName = 'delete-2.dv-service.slite'
        await setup()

        const key = 'MyKey'
        const content1 = 'The content'
        const content2 = 'The other content'
        await this.provider.create(this.did, key, content1)
        await this.provider.create(this.did, key, content2)

        await request(this.app).delete(`/content/${key}`).expect(200)

        const retrievedContent = await this.provider.get(this.did, key)
        expect(retrievedContent).toEqual([])
      })
    })
  })

  describe('/:key/:id', () => {
    describe('tdd', () => {
      test('should respond an HTTP 200 with an empty object', async () => {
        this.dbName = 'delete-4.dv-service.slite'
        await setup()

        const key = 'AKey'
        const id = 'AnId'
        const { body } = await request(this.app).delete(`/content/${key}/${id}`).expect(200)

        expect(body).toMatchObject({})
      })

      test('should delete a content by id', async () => {
        this.dbName = 'delete-5.dv-service.slite'
        await setup()

        const key = 'OneKey'
        const content = 'The content'
        const id = await this.provider.create(this.did, key, content)

        await request(this.app).delete(`/content/${key}/${id}`).expect(200)

        const retrievedContent = await this.provider.get(this.did, key)
        expect(retrievedContent).toEqual([])
      })
    })

    describe('border', () => {
      test('should delete only one content associated to the key even if it has multiple contents', async () => {
        this.dbName = 'delete-6.dv-service.slite'
        await setup()

        const key = 'MyKey'
        const content1 = 'The content'
        const content2 = 'The other content'
        await this.provider.create(this.did, key, content1)
        const idToDelete = await this.provider.create(this.did, key, content2)

        await request(this.app).delete(`/content/${key}/${idToDelete}`).expect(200)

        const retrievedContent = await this.provider.get(this.did, key)
        expect(retrievedContent[0].content).toEqual(content1)
      })
    })
  })
})
