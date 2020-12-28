import express, { Express } from 'express'
import { setupPermissionedApi } from '../src/api'
import request from 'supertest'
import { Connection } from 'typeorm'
import { createSqliteConnection, deleteDatabase, ipfsApiUrl, mockedLogger } from './util'
import { ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'

describe('GET /keys', function (this: {
  database: string,
  dbConnection: Connection,
  app: Express,
  did: string
}) {
  beforeEach(() => {
    this.app = express()
    this.did = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70'
    const middleware = (req, res, next) => {
      req.user = { did: this.did }
      next()
    }

    this.app.use(middleware)
  })
  afterEach(() => deleteDatabase(this.dbConnection, this.database))

  test('get keys from given did when did does not exist', async () => {
    this.database = 'test-1.service.get-keys.sqlite'

    this.dbConnection = await createSqliteConnection(this.database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl })

    setupPermissionedApi(this.app, ipfsPinnerProvider, mockedLogger)

    const { body } = await request(this.app).get('/keys').expect(200)

    expect(body.keys).toEqual([])
  })

  test('get keys from given did', async () => {
    this.database = 'test-2.service.get-keys.sqlite'

    this.dbConnection = await createSqliteConnection(this.database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl })
    setupPermissionedApi(this.app, ipfsPinnerProvider, mockedLogger)

    const key = 'ExistingKey'
    const content = 'This is the content'
    await ipfsPinnerProvider.create(this.did, key, content)

    const { body } = await request(this.app).get('/keys').expect(200)

    expect(body.keys).toEqual([key])
  })
})
