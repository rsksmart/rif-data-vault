import axios from 'axios'
import { createJWT } from 'did-jwt'
import { NO_DID, NO_SERVICE_DID, NO_SIGNER } from './errors'

type GetContentPayload = { did: string, key: string }
type CreateContentPayload = { key: string, content: string }
type CreateContentResponse = { id: string }
type LoginResponse = { accessToken: string, refreshToken: string }

export type Signer = (string) => Promise<string>

type Options = {
  serviceUrl: string,
  serviceDid?: string,
  did?: string
  signer?: Signer
}

export default class {
  private accessToken: string
  private refreshToken: string

  // eslint-disable-next-line no-useless-constructor
  constructor (private opts: Options) {}

  get ({ did, key }: GetContentPayload): Promise<string[]> {
    return axios.get(`${this.opts.serviceUrl}/${did}/${key}`)
      .then(res => res.status === 200 && res.data)
      .then(({ content }) => content.length && content)
  }

  async login (): Promise<LoginResponse> {
    const { did, signer, serviceUrl } = this.opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)

    const tokens = await this.getChallenge()
      .then(this.signChallenge.bind(this))
      .then(signature => axios.post(`${serviceUrl}/auth`, { response: signature }))
      .then(res => res.status === 200 && !!res.data && res.data)

    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken

    return tokens
  }

  async getChallenge (): Promise<string> {
    const { did, serviceUrl } = this.opts
    if (!did) throw new Error(NO_DID)

    return axios.get(`${serviceUrl}/request-auth/${did}`)
      .then(res => res.status === 200 && !!res.data && res.data.challenge)
  }

  async signChallenge (challenge: string): Promise<string> {
    const { did, signer, serviceUrl, serviceDid } = this.opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)
    if (!serviceDid) throw new Error(NO_SERVICE_DID)

    const now = Math.floor(Date.now() / 1000)

    const payload = {
      challenge,
      aud: serviceUrl,
      sub: serviceDid,
      exp: now + 120,
      nbf: now,
      iat: now
    }

    return createJWT(payload, { issuer: did, signer }, { typ: 'JWT', alg: 'ES256K' })
  }

  async create (payload: CreateContentPayload): Promise<CreateContentResponse> {
    const { content, key } = payload
    const { serviceUrl } = this.opts
    let accessToken = await this.getAccessToken()

    if (!accessToken) {
      ({ accessToken } = await this.login())
    }

    return axios.post(`${serviceUrl}/${key}`, { content }, { headers: { Authorization: `DIDAuth ${accessToken}` } })
      .then(res => res.status === 201 && res.data)
  }

  async setAccessToken (token: string): Promise<string> {
    this.accessToken = token
    return token
  }

  async setRefreshToken (token: string): Promise<string> {
    this.refreshToken = token
    return token
  }

  async getAccessToken (): Promise<string> {
    return this.accessToken
  }

  async getRefreshToken (): Promise<string> {
    return this.refreshToken
  }
}
