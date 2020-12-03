import express, { Express } from 'express'
import { ipfsPinnerProviderFactory, IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import setupApi, { AuthConfig } from '../src/setup'
import request from 'supertest'
import { Connection } from 'typeorm'
import { challengeResponseFactory, createSqliteConnection, deleteDatabase, identityFactory, ipfsApiUrl, mockedLogger } from './util'
import bodyParser from 'body-parser'

jest.setTimeout(10000)
describe('setup api with authentication', function (this: {
  dbName: string,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  app: Express,
  config: AuthConfig,
  accessToken: string,
  clientDid: string
}) {
  beforeAll(async () => {
    const serviceIdentity = (await identityFactory()).identity
    const userIdentity = await identityFactory()
    this.app = express()
    this.app.use(bodyParser.json())

    this.config = {
      serviceUrl: 'http://dv.com',
      challengeSecret: 'theSecret',
      serviceDid: serviceIdentity.did,
      serviceSigner: serviceIdentity.signer
    }

    this.dbName = 'setup-1.dv-service.sqlite'
    this.dbConnection = await createSqliteConnection(this.dbName)
    this.ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl })
    this.clientDid = userIdentity.identity.did
    setupApi(this.app, this.ipfsPinnerProvider, this.config, mockedLogger)

    const challengeResponse = await request(this.app).get(`/request-auth/${this.clientDid}`).expect(200)
    const { challenge } = challengeResponse.body
    const signed = await challengeResponseFactory(challenge, this.clientDid, userIdentity.privateKey, this.config.serviceUrl)

    const { body } = await request(this.app).post('/auth').send({ response: signed }).expect(200)
    this.accessToken = body.accessToken
  })

  afterAll(() => deleteDatabase(this.dbConnection, this.dbName))

  const key = 'ThisIsTheKey'
  const content = 'This is a content'
  const id = 'QmcPCC6iCzJMUQyby8eR4Csx6X7e7Xjfi4cmZnvDTVGZvd'

  describe('GET /content/:did/:key', () => {
    test('should respond 200 with no access token', () => request(this.app).get(`/content/${this.clientDid}/${key}`).expect(200))
  })

  describe('POST /:key', () => {
    test('should respond 401 without access token', () => request(this.app).post(`/content/${key}`).send({ content }).expect(401))

    test('should respond 201 with access token', () => request(this.app)
      .post(`/content/${key}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(201)
    )
  })

  describe('GET /keys/:did', () => {
    test('should respond 401 with no access token', () => request(this.app).get('/keys').expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .get('/keys')
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
      .then(response => {
        const body = response.body
        expect(body.keys).toEqual([key])
      }))
  })

  describe('PUT /:key', () => {
    test('should respond 401 without access token', () => request(this.app).put(`/content/${key}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .put(`/content/${key}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })

  describe('PUT /:key/:id', () => {
    test('should respond 401 without access token', () => request(this.app).put(`/content/${key}/${id}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .put(`/content/${key}/${id}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })

  describe('DELETE /:key', () => {
    test('should respond 401 without access token', () => request(this.app).delete(`/content/${key}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .delete(`/content/${key}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })

  describe('DELETE /:key/:id', () => {
    test('should respond 401 without access token', () => request(this.app).delete(`/content/${key}/${id}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .delete(`/content/${key}/${id}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })
})
