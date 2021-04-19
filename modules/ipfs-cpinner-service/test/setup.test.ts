import express, { Express } from 'express'
import { ipfsPinnerProviderFactory, IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import setupApi, { AuthConfig } from '../src/setup'
import request, { SuperAgentTest } from 'supertest'
import { Connection } from 'typeorm'
import { challengeResponseFactory, createSqliteConnection, deleteDatabase, identityFactory, ipfsApiUrl, mockedLogger } from './util'
import bodyParser from 'body-parser'

const CSRF_TOKEN_HEADER_NAME = 'x-csrf-token'
const LOGGED_DID_COOKIE_NAME = 'x-logged-did'
const TOKENS_HEADER_NAME = 'Cookie'

// for testing purposes, the cookie should be sent without attributes
const removeExtraCookieAttributes = (cookie: string) => cookie.substr(0, cookie.indexOf('; Path=/'))

// gets csrf token from set-cookie header
function getCSRFTokenFromResponse(response: any) {
  return response.header['x-csrf-token']
}

function getAccessTokenHeader(tokens: string[]) {
  return `${removeExtraCookieAttributes(tokens[0])}; ${removeExtraCookieAttributes(tokens[1])}`
}

jest.setTimeout(10000)

describe('setup api with authentication', function (this: {
  dbName: string,
  dbConnection: Connection,
  clientDid: string,
  csrfToken: string,
  agent: SuperAgentTest,
  tokens: string[]
}) {
  beforeEach(async () => {
    const serviceIdentity = (await identityFactory()).identity
    const userIdentity = await identityFactory()
    const app = express()
    app.use(bodyParser.json())

    const config = {
      serviceUrl: 'http://dv.com',
      challengeSecret: 'theSecret',
      serviceDid: serviceIdentity.did,
      serviceSigner: serviceIdentity.signer,
      loginMessageHeader: 'Are you sure you want to login to the RIF Data Vault?',
      noCsrfSecure: true
    }

    this.dbName = `setup-1.dv-service.${+new Date()}.sqlite`
    this.dbConnection = await createSqliteConnection(this.dbName)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection: this.dbConnection, ipfsApiUrl })
    this.clientDid = userIdentity.identity.did
    setupApi(app, ipfsPinnerProvider, config, mockedLogger)

    this.agent = request.agent(app)

    const requestAuthResponse = await this.agent.get(`/request-auth/${this.clientDid}`).expect(200)

    this.csrfToken = getCSRFTokenFromResponse(requestAuthResponse)
    const signed = await challengeResponseFactory(requestAuthResponse.body.challenge, this.clientDid, userIdentity.privateKey, config.serviceUrl, config.loginMessageHeader)

    const authResponse = await this.agent.post('/auth')
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .send({ response: signed })
      .expect(200)

    this.csrfToken = getCSRFTokenFromResponse(authResponse)
    this.tokens = authResponse.headers['set-cookie']
  })

  afterEach(() => deleteDatabase(this.dbConnection, this.dbName))

  const key = 'ThisIsTheKey'
  const content = 'This is a content'
  const id = 'QmcPCC6iCzJMUQyby8eR4Csx6X7e7Xjfi4cmZnvDTVGZvd'

  describe('GET /content/:did/:key', () => {
    test('should respond 401 with no access token', () => this.agent.get(`/content/${key}`)
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .expect(401)
  )

    test('should respond 200 with access token', () => this.agent.get(`/content/${key}`)
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
      .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
      .expect(200)
    )
  })

  describe('POST /:key', () => {
    test('should respond 401 without access token', () => this.agent.post(`/content/${key}`)
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .send({ content })
      .expect(401)
    )

    test('should respond 201 with access token', () => this.agent.post(`/content/${key}`)
      .send({ content })
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
      .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
      .expect(201)
    )
  })

  describe('GET /keys/:did', () => {
    test('should respond 401 with no access token', () => this.agent.get('/keys')
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .expect(401)
    )

    test('should respond 200 with access token', () => this.agent.get('/keys')
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
      .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
      .expect(200)
      .then(response => {
        const body = response.body
        expect(body.keys).toEqual([])
      })
    )
  })

  describe('PUT /:key', () => {
    test('should respond 401 without access token', () => this.agent.put(`/content/${key}`)
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .send({ content })
      .expect(401)
    )

    test('should respond 200 with access token', () => this.agent.put(`/content/${key}`)
      .send({ content })
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
      .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
      .expect(200)
    )
  })

  describe('PUT /:key/:id', () => {
    test('should respond 401 without access token', () => this.agent.put(`/content/${key}/${id}`)
    .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
    .send({ content })
    .expect(401)
  )

    test('should respond 200 with access token', () => this.agent.put(`/content/${key}/${id}`)
      .send({ content })
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
      .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
      .expect(200)
    )
  })

  describe('DELETE /:key', () => {
    test('should respond 401 without access token', () => this.agent.delete(`/content/${key}`)
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .send({ content })
      .expect(401)
    )

    test('should respond 200 with access token', async () => {
      const response = await this.agent.post(`/content/${key}`)
        .send({ content })
        .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
        .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
        .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))

      await this.agent.delete(`/content/${key}`)
        .send({ content })
        .set(CSRF_TOKEN_HEADER_NAME, getCSRFTokenFromResponse(response))
        .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
        .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
        .expect(200)
    })
  })

  describe('DELETE /:key/:id', () => {
    test('should respond 401 without access token', () => this.agent.delete(`/content/${key}/${id}`)
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .send({ content })
      .expect(401)
    )

    test('should respond 200 with access token', () => this.agent.delete(`/content/${key}/${id}`)
      .send({ content })
      .set(CSRF_TOKEN_HEADER_NAME, this.csrfToken)
      .set(LOGGED_DID_COOKIE_NAME, this.clientDid)
      .set(TOKENS_HEADER_NAME, getAccessTokenHeader(this.tokens))
      .expect(200)
    )
  })
})
