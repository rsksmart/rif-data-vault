import express, { Express } from 'express'
import request from 'supertest'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import { createSqliteConnection, deleteDatabase, ipfsApiUrl, mockedLogger } from './util'
import { setupPermissionedApi } from '../src/api'
import bodyParser from 'body-parser'
import { Connection } from 'typeorm'

describe('POST', function (this: {
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

  const postContentAndGetResponseBody = async (key: string, content: string) => {
    await setup()

    const { body } = await request(this.app).post(`/content/${key}`).send({ content }).expect(201)

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

  describe('tdd', () => {
    test('should respond with an id', async () => {
      this.dbName = 'post-1.ipfs-dv-service.sqlite'
      const body = await postContentAndGetResponseBody('PostAFile', 'This is a content')

      expect(body.id).toBeTruthy()
    })

    test('should save the content in ipfs and respond with the proper cid', async () => {
      this.dbName = 'post-2.ipfs-dv-service.sqlite'
      const body = await postContentAndGetResponseBody('PostAFile', 'This is a content')

      expect(body.id).toEqual('QmcPCC6iCzJMUQyby8eR4Csx6X7e7Xjfi4cmZnvDTVGZvd')
    })

    test('should associate the saved content to a given did and key', async () => {
      this.dbName = 'post-3.ipfs-dv-service.sqlite'
      const key = 'PostAFileWithThisKey'
      const content = 'This is another content'
      await postContentAndGetResponseBody(key, content)

      const actualContent = await this.provider.get(this.did, key)
      expect(actualContent[0].content).toEqual(content)
    })
  })

  describe('border', () => {
    test('should save more than one content per key', async () => {
      this.dbName = 'post-4.ipfs-dv-service.sqlite'
      await setup()

      const key = 'PostAFileWithThisKey'
      const content1 = 'This is a content'
      const content2 = 'This is another content for the same key'

      await request(this.app).post(`/content/${key}`).send({ content: content1 }).expect(201)
      await request(this.app).post(`/content/${key}`).send({ content: content2 }).expect(201)

      const actualContent = await this.provider.get(this.did, key)
      expect(actualContent[0].content).toEqual(content1)
      expect(actualContent[1].content).toEqual(content2)
    })

    test('should save different content for the same key for different dids', async () => {
      this.dbName = 'post-5.ipfs-dv-service.sqlite'
      await setup()

      const key = 'PostSameKeyDifferentDids'
      const content1 = 'This is a content'
      const content2 = 'This is another content'

      await request(this.app).post(`/content/${key}`).send({ content: content1 }).expect(201)

      const anotherDid = 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79'
      const firstDid = this.did
      this.did = anotherDid
      await request(this.app).post(`/content/${key}`).send({ content: content2 }).expect(201)

      const actualContentForDid1 = await this.provider.get(firstDid, key)
      expect(actualContentForDid1[0].content).toEqual(content1)

      const actualContentForDid2 = await this.provider.get(anotherDid, key)
      expect(actualContentForDid2[0].content).toEqual(content2)
    })

    test('should save different content for different keys for different dids', async () => {
      this.dbName = 'post-5.ipfs-dv-service.sqlite'
      await setup()

      const key1 = 'ThisIsKeyOne'
      const key2 = 'ThisIsKeyTwo'
      const key3 = 'ThisIsKeyThree'
      const content1 = 'This is a content'
      const content2 = 'This is another content'
      const content3 = 'This is another content for the third key'

      await request(this.app).post(`/content/${key1}`).send({ content: content1 }).expect(201)
      await request(this.app).post(`/content/${key2}`).send({ content: content2 }).expect(201)

      const anotherDid = 'did:ethr:rsk:testnet:0xf3d8a97f31d81ac42073e3c085c6dadd83cd1a79'
      const firstDid = this.did
      this.did = anotherDid
      await request(this.app).post(`/content/${key2}`).send({ content: content2 }).expect(201)
      await request(this.app).post(`/content/${key3}`).send({ content: content3 }).expect(201)

      // did 1
      let actualContent = await this.provider.get(firstDid, key1)
      expect(actualContent[0].content).toEqual(content1)

      actualContent = await this.provider.get(firstDid, key2)
      expect(actualContent[0].content).toEqual(content2)

      actualContent = await this.provider.get(firstDid, key3)
      expect(actualContent).toEqual([])

      // did 2
      actualContent = await this.provider.get(anotherDid, key1)
      expect(actualContent).toEqual([])

      actualContent = await this.provider.get(anotherDid, key2)
      expect(actualContent[0].content).toEqual(content2)

      actualContent = await this.provider.get(anotherDid, key3)
      expect(actualContent[0].content).toEqual(content3)
    })
  })
})
