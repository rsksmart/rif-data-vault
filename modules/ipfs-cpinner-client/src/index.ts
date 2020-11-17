import axios from 'axios'
import { decodeJWT } from 'did-jwt'
import { authManagerFactory } from './auth-manager'
import { ACCESS_TOKEN_KEY } from './constants'
import {
  AuthenticationManager,
  ClientKeyValueStorage, CreateContentPayload, CreateContentResponse,
  DeleteTokenPayload, GetContentPayload, Options,
  SwapContentPayload, SwapContentResponse
} from './types'

const ClientKeyValueStorageFactory = {
  fromLocalStorage: (): ClientKeyValueStorage => ({
    get: (key: string) => Promise.resolve(localStorage.getItem(key)),
    set: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value))
  })
}

export default class {
  private storage: ClientKeyValueStorage
  private authManager: AuthenticationManager

  constructor (private opts: Options) {
    this.storage = opts.storage || ClientKeyValueStorageFactory.fromLocalStorage()
    this.authManager = authManagerFactory(opts, this.storage)
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

    if (!accessToken) return this.authManager.login().then((tokens) => tokens.accessToken)

    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return this.authManager.refreshAccessToken().then((tokens) => tokens.accessToken)
    }

    return accessToken
  }
}
