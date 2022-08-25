import { setupPermissionedApi } from '../src/api'
import express, { Express } from 'express'
import { Connection } from 'typeorm'
import request from 'supertest'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import { createSqliteConnection, deleteDatabase, ipfsApiUrl, mockedLogger } from './util'
import bodyParser from 'body-parser'
import { MAX_STORAGE_REACHED } from '../src/constants'

const maxStorage = 1024 * 25 // 25 KB
const BIG_FILE_ITERATIONS = 25

describe('PUT', function (this: {
  app: Express,
  did: string
  dbConnection: Connection,
  dbName: string,
  provider: IpfsPinnerProvider
}) {
  const setup = async () => {
    this.dbConnection = await createSqliteConnection(this.dbName)
    this.provider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl, maxStorage })

    setupPermissionedApi(this.app, this.provider, mockedLogger)
  }

  const putAndGetResponseBody = async (key: string, content: string, id?: string) => {
    await setup()

    const { body } = await request(this.app).put(`/content/${key}${id ? `/${id}` : ''}`).send({ content }).expect(200)

    return body
  }

  const beforeEachFn = () => {
    this.did = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70'
    const middleware = (req, res, next) => {
      req.user = { did: this.did }
      next()
    }
    this.app = express()
    this.app.use(bodyParser.json())
    this.app.use(middleware)
  }
  beforeEach(beforeEachFn)

  const afterEachFn = async () => await deleteDatabase(this.dbConnection, this.dbName)
  afterEach(afterEachFn)

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

      test('should save the new big file in ipfs and respond with the actual content multiple times', async () => {
        for (let i = 0; i < BIG_FILE_ITERATIONS; i++) {
          if (i > 0) beforeEachFn()

          this.dbName = `put-${i}-bf.dv-service.sqlite`
          const key = `BigKeyForBigFile${i}`
          const contentLength = Math.floor(1024 * 25)
          const content = 'a'.repeat(contentLength)

          const body = await putAndGetResponseBody(key, content)
          expect(body.id).toEqual('QmZtTJjjG6aBHvD7HxrRcXc2FjhnVST3XZnQshwZoW9Mny')

          const actualContent = await this.provider.get(this.did, key)
          expect(actualContent[0].content).toEqual(content)

          if (i < BIG_FILE_ITERATIONS - 1) await afterEachFn()
        }
      })

      test('should save the new content associated to a key and did', async () => {
        this.dbName = 'put-3.dv-service.sqlite'
        const key = 'ThisIsAnotherKey'
        const content = 'This is a new content'

        await putAndGetResponseBody(key, content)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent[0].content).toEqual(content)
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
        const { body } = await request(this.app).put(`/content/${key}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent[0].content).toEqual(newContent)
      })

      test('should respond with a 400 if exceed maxStorage', async () => {
        this.dbName = 'put-11.dv-service.sqlite'
        const key = 'ThisIsAnotherKey'
        const content = 'This is a new content'

        await putAndGetResponseBody(key, content)

        const newContent = 'a'.repeat(maxStorage + 10)

        const res = await request(this.app).put(`/content/${key}`).send({ content: newContent }).expect(400)

        expect(res.text).toEqual(MAX_STORAGE_REACHED)
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
        const { body } = await request(this.app).put(`/content/${key}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)
        expect(body.id).not.toEqual(secondCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent[0].content).toEqual(newContent)
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

        expect(actualContent[0].content).toEqual(content)
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
        const { body } = await request(this.app).put(`/content/${key}/${firstCid}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent[0].content).toEqual(newContent)
      })

      test('should respond with a 400 if exceed maxStorage', async () => {
        this.dbName = 'put-11.dv-service.sqlite'
        const key = 'ThisIsAnotherKey'
        const content = 'This is a new content'

        const { id } = await putAndGetResponseBody(key, content)

        const newContent = 'a'.repeat(maxStorage + 10)

        const res = await request(this.app).put(`/content/${key}/${id}`).send({ content: newContent }).expect(400)

        expect(res.text).toEqual(MAX_STORAGE_REACHED)
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
        const { body } = await request(this.app).put(`/content/${key}/${secondCid}`).send({ content: newContent }).expect(200)

        expect(body.id).not.toEqual(firstCid)
        expect(body.id).not.toEqual(secondCid)

        const actualContent = await this.provider.get(this.did, key)
        expect(actualContent[0].content).toEqual(firstContent)
        expect(actualContent[1].content).toEqual(newContent)
      })
    })
  })
})
