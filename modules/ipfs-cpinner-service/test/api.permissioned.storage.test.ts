import { Connection } from 'typeorm'
import express, { Express } from 'express'
import bodyParser from 'body-parser'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import { createSqliteConnection, deleteDatabase, ipfsApiUrl, mockedLogger } from './util'
import { setupPermissionedApi } from '../src/api'
import request from 'supertest'

describe('storage', function (this: {
  app: Express,
  did: string
  middleware: (req, res, next) => any,
  dbConnection: Connection,
  dbName: string,
  provider: IpfsPinnerProvider
}) {
  const maxStorage = 1000

  const setup = async () => {
    this.dbConnection = await createSqliteConnection(this.dbName)
    this.provider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl, maxStorage })

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

  it('should return numeric values for used and available fields', async () => {
    this.dbName = 'storage-1.sqlite'
    await setup()

    const { body } = await request(this.app).get('/storage').expect(200)

    expect(body.used).toBeGreaterThanOrEqual(0)
    expect(body.available).toBeGreaterThanOrEqual(0)
  })

  it('should return proper information after creating content', async () => {
    this.dbName = 'storage-2.sqlite'
    await setup()

    await this.provider.create(this.did, 'TheKey', 'a content')

    const { body } = await request(this.app).get('/storage').expect(200)

    expect(body.used).toEqual(9)
    expect(body.available).toEqual(maxStorage - 9)
  })

  it('should return information related to the logged did even if there is data related to other did', async () => {
    this.dbName = 'storage-3.sqlite'
    await setup()

    const anotherDid = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c65'
    await this.provider.create(anotherDid, 'TheKey', 'a content')

    const { body } = await request(this.app).get('/storage').expect(200)

    expect(body.used).toBe(0)
    expect(body.available).toBe(maxStorage)
  })
})
