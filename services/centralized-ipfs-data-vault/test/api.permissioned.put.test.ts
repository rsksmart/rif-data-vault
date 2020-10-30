import { setupPermissionedApi } from '../src/api'
import express, { Express } from 'express'
import { Connection } from 'typeorm'
import request from 'supertest'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-pinner-provider'
import { createSqliteConnection, deleteDatabase } from './util'
import bodyParser from 'body-parser'

const ipfsApi = 'http://localhost:5001'

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
    this.provider = await ipfsPinnerProviderFactory(this.dbConnection, ipfsApi)

    setupPermissionedApi(this.app, this.provider)
  }

  const putAndGetResponseBody = async (key: string, content: string, id?: string) => {
    await setup()

    const { body } = await request(this.app).put(`/${key}${id ? `/${id}` : ''}`).send({ content }).expect(200)

    return body
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
      test('should respond with an id', async () => {
        this.dbName = 'put-1.dv-service.sqlite'
        const body = await putAndGetResponseBody('The key', 'the content')

        expect(body.id).toBeTruthy()
      })

      test('should save the new file in ipfs and respond with the cid', async () => {
        this.dbName = 'put-2.dv-service.sqlite'
        const body = await putAndGetResponseBody('ThisIsAKey', 'This is a content')

        expect(body.id).toEqual('QmcPCC6iCzJMUQyby8eR4Csx6X7e7Xjfi4cmZnvDTVGZvd')
      })

      test('should save the new content associated to a key and did', async () => {
        this.dbName = 'put-3.dv-service.sqlite'
        const key = 'ThisIsAnotherKey'
        const content = 'This is a new content'

        await putAndGetResponseBody(key, content)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent).toEqual([content])
      })

      test('should replace existing content associated to the given key', async () => {
        this.dbName = 'put-4.dv-service.sqlite'
        await setup()

        // create first content associated to the key
        const key = 'ThisIsAKey'
        const firstContent = 'This is the first content'
        const firstCid = await this.provider.create(this.did, key, firstContent)
        expect(firstCid).toBeTruthy()

        // update it
        const newContent = 'This is the new content'
        const { body } = await request(this.app).put(`/${key}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent).toEqual([newContent])
      })
    })

    describe('border', () => {
      test('should replace all the content associated to a given did and key', async () => {
        this.dbName = 'put-5.dv-service.sqlite'
        await setup()

        // create two contents associated to the same key
        const key = 'ThisIsAKey'
        const firstContent = 'This is the first content'
        const secondContent = 'This is the second content'
        const firstCid = await this.provider.create(this.did, key, firstContent)
        const secondCid = await this.provider.create(this.did, key, secondContent)
        expect(firstCid).toBeTruthy()
        expect(secondCid).toBeTruthy()

        // update it
        const newContent = 'This is the new content'
        const { body } = await request(this.app).put(`/${key}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)
        expect(body.id).not.toEqual(secondCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent).toEqual([newContent])
      })
    })
  })

  describe('/:key/:id', () => {
    describe('tdd', () => {
      test('should respond with an id', async () => {
        this.dbName = 'put-6.dv-service.sqlite'
        const body = await putAndGetResponseBody('The key', 'the content with id', 'an id')

        expect(body.id).toBeTruthy()
      })

      test('should save the new file in ipfs and respond with the cid', async () => {
        this.dbName = 'put-7.dv-service.sqlite'
        const body = await putAndGetResponseBody('ThisIsAKey', 'This is a content with id', 'This is the id')

        expect(body.id).toEqual('QmXRoR64AbxP7YGdvew5sCwsRB7L1JLhEywtjXxjjLo89R')
      })

      test('should save the new content associated to a key, id and did', async () => {
        this.dbName = 'put-8.dv-service.sqlite'
        const key = 'ThisIsAKey'
        const content = 'This is a new content with id'
        const id = 'This is an id'
        await putAndGetResponseBody(key, content, id)

        const actualContent = await this.provider.get(this.did, key)

        expect(actualContent).toEqual([content])
      })

      test('should replace existing content associated to the given key and id', async () => {
        this.dbName = 'put-9.dv-service.sqlite'
        await setup()

        // create first content associated to the key
        const key = 'ThisIsAKey'
        const firstContent = 'This is the first content with id'
        const firstCid = await this.provider.create(this.did, key, firstContent)
        expect(firstCid).toBeTruthy()

        // update it
        const newContent = 'This is the new content with id'
        const { body } = await request(this.app).put(`/${key}/${firstCid}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent).toEqual([newContent])
      })
    })

    describe('border', () => {
      test('should replace just the content associated to the given did, key and cid', async () => {
        this.dbName = 'put-10.dv-service.sqlite'
        await setup()

        // create two contents associated to the same key
        const key = 'ThisIsAKey'
        const firstContent = 'This is the first content'
        const secondContent = 'This is the second content'
        const firstCid = await this.provider.create(this.did, key, firstContent)
        const secondCid = await this.provider.create(this.did, key, secondContent)
        expect(firstCid).toBeTruthy()
        expect(secondCid).toBeTruthy()

        // update just the second cid
        const newContent = 'This is the new content that will update the second one'
        const { body } = await request(this.app).put(`/${key}/${secondCid}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)
        expect(body.id).not.toEqual(secondCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent).toEqual([firstContent, newContent])
      })
    })
  })
})
