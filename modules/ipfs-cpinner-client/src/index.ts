import axios from 'axios'
import { decodeJWT } from 'did-jwt'
import authManagerFactory from './auth-manager'
import { ACCESS_TOKEN_KEY } from './constants'
import {
  AuthenticationManager,
  ClientKeyValueStorage, CreateContentPayload, CreateContentResponse,
  DeleteTokenPayload, GetContentPayload, Config,
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

  constructor (private config: Config) {
    this.storage = config.storage || ClientKeyValueStorageFactory.fromLocalStorage()
    this.authManager = authManagerFactory(config, this.storage)
  }

  get ({ did, key }: GetContentPayload): Promise<string[]> {
    return axios.get(`${this.config.serviceUrl}/content/${did}/${key}`)
      .then(res => res.status === 200 && res.data)
  }

  getKeys (): Promise<string[]> {
    const { serviceUrl, did } = this.config

    return this.getAccessToken()
      .then(accessToken => axios.get(
        `${serviceUrl}/keys/${did}`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && !!res.data && res.data.keys)
  }

  create (payload: CreateContentPayload): Promise<CreateContentResponse> {
    const { content, key } = payload
    const { serviceUrl } = this.config

    return this.getAccessToken()
      .then(accessToken => axios.post(
        `${serviceUrl}/content/${key}`,
        { content },
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 201 && res.data)
  }

  delete (payload: DeleteTokenPayload): Promise<boolean> {
    const { key, id } = payload
    const { serviceUrl } = this.config
    const path = id ? `${key}/${id}` : key

    return this.getAccessToken()
      .then(accessToken => axios.delete(
        `${serviceUrl}/content/${path}`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200)
  }

  swap (payload: SwapContentPayload): Promise<SwapContentResponse> {
    const { key, content, id } = payload
    const { serviceUrl } = this.config

    const path = id ? `${key}/${id}` : key
    return this.getAccessToken()
      .then(accessToken => axios.put(
        `${serviceUrl}/content/${path}`,
        { content },
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && res.data)
  }

  private async getAccessToken (): Promise<string> {
    const accessToken = await this.storage.get(ACCESS_TOKEN_KEY)

    if (!accessToken) return this.authManager.login().then(tokens => tokens.accessToken)

    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return this.authManager.refreshAccessToken().then(tokens => tokens.accessToken)
    }

    return accessToken
  }
}

export { ClientKeyValueStorage }
