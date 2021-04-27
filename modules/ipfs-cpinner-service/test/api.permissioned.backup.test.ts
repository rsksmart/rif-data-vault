import { Connection } from 'typeorm'
import express, { Express } from 'express'
import bodyParser from 'body-parser'
import { IpfsPinnerProvider, ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'
import { createSqliteConnection, deleteDatabase, ipfsApiUrl, mockedLogger } from './util'
import { setupPermissionedApi } from '../src/api'
import request from 'supertest'

describe('backup', function (this: {
  app: Express,
  did: string
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
    const middleware = (req, res, next) => {
      req.user = { did: this.did }
      next()
    }
    this.app = express()
    this.app.use(bodyParser.json())
    this.app.use(middleware)
  })

  afterEach(() => deleteDatabase(this.dbConnection, this.dbName))

  it('should return an empty array if nothing created', async () => {
    this.dbName = 'backup-1.sqlite'
    await setup()

    const { body } = await request(this.app).get('/backup').expect(200)

    expect(body).toEqual([])
  })

  it('should return an array with the just created content', async () => {
    this.dbName = 'backup-2.sqlite'
    await setup()

    const key = 'TheKey'
    const id = await this.provider.create(this.did, key, 'a content')

    const { body } = await request(this.app).get('/backup').expect(200)

    expect(body).toEqual([{ key, id }])
  })

  it('should return information related to the logged did even if there is data related to other did', async () => {
    this.dbName = 'backup-3.sqlite'
    await setup()

    const anotherDid = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c65'
    await this.provider.create(anotherDid, 'AnotherKey', 'a content')

    const key = 'TheKey'
    const id = await this.provider.create(this.did, key, 'another content')

    const { body } = await request(this.app).get('/backup').expect(200)

    expect(body).toEqual([{ key, id }])
  })
})
