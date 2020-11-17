import axios from 'axios'
import { createJWT, decodeJWT } from 'did-jwt'
import { NO_DID, NO_SERVICE_DID, NO_SIGNER } from './errors'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

type GetContentPayload = { did: string, key: string }
type CreateContentPayload = { key: string, content: string }
type CreateContentResponse = { id: string }
type LoginResponse = { accessToken: string, refreshToken: string }
type DeleteTokenPayload = { key: string, id?: string }
type SwapContentPayload = { key: string, content: string, id?: string }
type SwapContentResponse = { id: string }

export type Signer = (data: string) => Promise<string>

export interface ClientKeyValueStorage {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

const ClientKeyValueStorageFactory = {
  fromLocalStorage: (): ClientKeyValueStorage => ({
    get: (key: string) => Promise.resolve(localStorage.getItem(key)),
    set: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value))
  })
}

type Options = {
  serviceUrl: string,
  serviceDid?: string,
  did?: string
  signer?: Signer
  storage?: ClientKeyValueStorage
}

export default class {
  private storage: ClientKeyValueStorage

  // eslint-disable-next-line no-useless-constructor
  constructor (private opts: Options) {
    this.storage = opts.storage || ClientKeyValueStorageFactory.fromLocalStorage()
  }

  get ({ did, key }: GetContentPayload): Promise<string[]> {
    return axios.get(`${this.opts.serviceUrl}/${did}/${key}`)
      .then(res => res.status === 200 && res.data)
      .then(({ content }) => content.length && content)
  }

  create (payload: CreateContentPayload): Promise<CreateContentResponse> {
    const { content, key } = payload
    const { serviceUrl } = this.opts

    return this.checkAndGetAccessToken()
      .then(accessToken => axios.post(
        `${serviceUrl}/${key}`,
        { content },
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 201 && res.data)
  }

  delete (payload: DeleteTokenPayload): Promise<boolean> {
    const { key, id } = payload
    const { serviceUrl } = this.opts
    const path = id ? `${key}/${id}` : key

    return this.checkAndGetAccessToken()
      .then(accessToken => axios.delete(
        `${serviceUrl}/${path}`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200)
  }

  swap (payload: SwapContentPayload): Promise<SwapContentResponse> {
    const { key, content, id } = payload
    const { serviceUrl } = this.opts

    const path = id ? `${key}/${id}` : key
    return this.checkAndGetAccessToken()
      .then(accessToken => axios.put(
        `${serviceUrl}/${path}`,
        { content },
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && res.data)
  }

  private async checkAndGetAccessToken (): Promise<string> {
    const accessToken = await this.storage.get(ACCESS_TOKEN_KEY)

    if (!accessToken) return this.login().then((tokens) => tokens.accessToken)

    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return this.refreshAccessToken().then((tokens) => tokens.accessToken)
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

    await this.storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)
    await this.storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)

    return tokens
  }

  async refreshAccessToken (): Promise<LoginResponse> {
    const { did, signer, serviceUrl } = this.opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)

    const refreshToken = await this.storage.get(REFRESH_TOKEN_KEY)

    if (!refreshToken) return this.login()

    const tokens = await axios.post(`${serviceUrl}/refresh-token`, { refreshToken })
      .then(res => res.status === 200 && !!res.data && res.data)

    // TODO: Take care of expired refresh token

    await this.storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)
    await this.storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)

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
}
