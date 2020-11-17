import axios from 'axios'
import { createJWT, decodeJWT } from 'did-jwt'
import { NO_DID, NO_SERVICE_DID, NO_SIGNER } from './errors'

type GetContentPayload = { did: string, key: string }
type CreateContentPayload = { key: string, content: string }
type CreateContentResponse = { id: string }
type LoginResponse = { accessToken: string, refreshToken: string }
type DeleteTokenPayload = { key: string, id?: string }
type SwapContentPayload = { key: string, content: string, id?: string }
type SwapContentResponse = { id: string }

export type Signer = (data: string) => Promise<string>

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

  async create (payload: CreateContentPayload): Promise<CreateContentResponse> {
    const { content, key } = payload
    const { serviceUrl } = this.opts
    const accessToken = await this.checkAndGetAccessToken()

    return axios.post(`${serviceUrl}/${key}`, { content }, { headers: { Authorization: `DIDAuth ${accessToken}` } })
      .then(res => res.status === 201 && res.data)
  }

  async delete (payload: DeleteTokenPayload): Promise<boolean> {
    const { key, id } = payload
    const { serviceUrl } = this.opts
    const accessToken = await this.checkAndGetAccessToken()

    const path = id ? `${key}/${id}` : key
    return axios.delete(`${serviceUrl}/${path}`, { headers: { Authorization: `DIDAuth ${accessToken}` } })
      .then(res => res.status === 200)
  }

  async swap (payload: SwapContentPayload): Promise<SwapContentResponse> {
    const { key, content, id } = payload
    const { serviceUrl } = this.opts
    const accessToken = await this.checkAndGetAccessToken()

    const path = id ? `${key}/${id}` : key
    return axios.put(`${serviceUrl}/${path}`, { content }, { headers: { Authorization: `DIDAuth ${accessToken}` } })
      .then(res => res.status === 200 && res.data)
  }

  private async checkAndGetAccessToken () {
    let accessToken = await this.getAccessToken()

    if (!accessToken) {
      ({ accessToken } = await this.login())
    } else {
      const { payload } = await decodeJWT(accessToken)

      if (payload.exp <= Math.floor(Date.now() / 1000)) {
        ({ accessToken } = await this.refreshAccessToken())
      }
    }

    return accessToken
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

  async refreshAccessToken (): Promise<LoginResponse> {
    const { did, signer, serviceUrl } = this.opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)

    const refreshToken = await this.getRefreshToken()

    if (!refreshToken) return this.login()

    const tokens = await axios.post(`${serviceUrl}/refresh-token`, { refreshToken })
      .then(res => res.status === 200 && !!res.data && res.data)

    // TODO: Take care of expired refresh token

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
