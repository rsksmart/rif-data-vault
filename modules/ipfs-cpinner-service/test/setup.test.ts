import express, { Express } from 'express'
import { ipfsPinnerProviderFactory, IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import setupApi, { AuthConfig } from '../src/setup'
import request from 'supertest'
import { Connection } from 'typeorm'
import { challengeResponseFactory, createSqliteConnection, deleteDatabase, identityFactory, ipfsEndpoint, mockedLogger } from './util'
import bodyParser from 'body-parser'

jest.setTimeout(10000)
describe('setup api with authentication', function (this: {
  dbName: string,
  dbConnection: Connection,
  ipfsPinnerProvider: IpfsPinnerProvider,
  app: Express,
  config: AuthConfig,
  accessToken: string
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
    this.ipfsPinnerProvider = await ipfsPinnerProviderFactory(this.dbConnection, ipfsEndpoint)
    setupApi(this.app, this.ipfsPinnerProvider, this.config, mockedLogger)

    const challengeResponse = await request(this.app).get(`/request-auth/${userIdentity.identity.did}`).expect(200)
    const { challenge } = challengeResponse.body
    const signed = await challengeResponseFactory(challenge, userIdentity.identity.did, userIdentity.privateKey, this.config.serviceUrl)

    const { body } = await request(this.app).post('/auth').send({ response: signed }).expect(200)
    this.accessToken = body.accessToken
  })

  afterAll(() => deleteDatabase(this.dbConnection, this.dbName))

  const key = 'ThisIsTheKey'
  const content = 'This is a content'
  const id = 'QmcPCC6iCzJMUQyby8eR4Csx6X7e7Xjfi4cmZnvDTVGZvd'
  const did = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70'

  describe('GET /:did/:key', () => {
    test('should respond 200 with no access token', () => request(this.app).get(`/${did}/${key}`).expect(200))
  })

  describe('GET /keys/:did', () => {
    test('should respond 200 with no access token', () => request(this.app).get(`/keys/${did}`).expect(200))
  })

  describe('POST /:key', () => {
    test('should respond 401 without access token', () => request(this.app).post(`/${key}`).send({ content }).expect(401))

    test('should respond 201 with access token', () => request(this.app)
      .post(`/${key}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(201)
    )
  })

  describe('PUT /:key', () => {
    test('should respond 401 without access token', () => request(this.app).put(`/${key}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .put(`/${key}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })

  describe('PUT /:key/:id', () => {
    test('should respond 401 without access token', () => request(this.app).put(`/${key}/${id}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .put(`/${key}/${id}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })

  describe('DELETE /:key', () => {
    test('should respond 401 without access token', () => request(this.app).delete(`/${key}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .delete(`/${key}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })

  describe('DELETE /:key/:id', () => {
    test('should respond 401 without access token', () => request(this.app).delete(`/${key}/${id}`).send({ content }).expect(401))

    test('should respond 200 with access token', () => request(this.app)
      .delete(`/${key}/${id}`)
      .send({ content })
      .set('Authorization', `DIDAuth ${this.accessToken}`)
      .expect(200)
    )
  })
})
