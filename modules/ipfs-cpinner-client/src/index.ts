import axios from 'axios'
import AuthManager from './auth-manager'
import EncryptionManager from './encryption-manager/asymmetric'
import { AUTHENTICATION_ERROR, MAX_STORAGE_REACHED, SERVICE_MAX_STORAGE_REACHED, UNKNOWN_ERROR } from './constants'
import {
  CreateContentPayload, CreateContentResponse,
  DeleteTokenPayload, GetContentPayload, Config,
  SwapContentPayload, SwapContentResponse, GetContentResponsePayload, StorageInformation, Backup
} from './types'

class IPFSCpinnerClient {
  private authManager: AuthManager
  private encryptionManager: EncryptionManager

  constructor (private config: Config) {
    this.authManager = config.authManager
    this.encryptionManager = config.encryptionManager
  }

  async get ({ key }: GetContentPayload): Promise<GetContentResponsePayload[]> {
    try {
      const encrypted = await this.authManager.getAccessToken()
        .then(accessToken => axios.get(
          `${this.config.serviceUrl}/content/${key}`,
          { headers: { Authorization: `DIDAuth ${accessToken}` } })
        )
        .then(res => res.status === 200 && res.data)

      return Promise.all(encrypted.map(({ id, content }) => this.encryptionManager.decrypt(content).then(decrypted => ({ id, content: decrypted }))))
    } catch (err) {
      this.errorHandler(err)
    }
  }

  getKeys (): Promise<string[]> {
    const { serviceUrl } = this.config

    return this.authManager.getAccessToken()
      .then(accessToken => axios.get(
        `${serviceUrl}/keys`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && !!res.data && res.data.keys)
      .catch(this.errorHandler)
  }

  getStorageInformation (): Promise<StorageInformation> {
    const { serviceUrl } = this.config

    return this.authManager.getAccessToken()
      .then(accessToken => axios.get(
        `${serviceUrl}/storage`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && res.data)
      .catch(this.errorHandler)
  }

  getBackup (): Promise<Backup> {
    const { serviceUrl } = this.config

    return this.authManager.getAccessToken()
      .then(accessToken => axios.get(
        `${serviceUrl}/backup`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && res.data)
      .catch(this.errorHandler)
  }

  create (payload: CreateContentPayload): Promise<CreateContentResponse> {
    const { content, key } = payload
    const { serviceUrl } = this.config

    return Promise.all([this.authManager.getAccessToken(), this.encryptionManager.encrypt(content)])
      .then(([accessToken, encrypted]) => axios.post(
        `${serviceUrl}/content/${key}`,
        { content: encrypted },
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 201 && res.data)
      .catch(this.errorHandler)
  }

  delete (payload: DeleteTokenPayload): Promise<boolean | void> {
    const { key, id } = payload
    const { serviceUrl } = this.config
    const path = id ? `${key}/${id}` : key

    return this.authManager.getAccessToken()
      .then(accessToken => axios.delete(
        `${serviceUrl}/content/${path}`,
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200)
      .catch(this.errorHandler)
  }

  swap (payload: SwapContentPayload): Promise<SwapContentResponse> {
    const { key, content, id } = payload
    const { serviceUrl } = this.config

    const path = id ? `${key}/${id}` : key
    return Promise.all([this.authManager.getAccessToken(), this.encryptionManager.encrypt(content)])
      .then(([accessToken, encrypted]) => axios.put(
        `${serviceUrl}/content/${path}`,
        { content: encrypted },
        { headers: { Authorization: `DIDAuth ${accessToken}` } })
      )
      .then(res => res.status === 200 && res.data)
      .catch(this.errorHandler)
  }

  private errorHandler (err) {
    if (!err.response) throw err // not axios related

    const { status, data } = err.response

    switch (status) {
      case 500: throw new Error(UNKNOWN_ERROR)
      case 401: throw new Error(AUTHENTICATION_ERROR)
      case 400:
        if (data === SERVICE_MAX_STORAGE_REACHED) throw new Error(MAX_STORAGE_REACHED)
        throw new Error(data)
      default: throw err
    }
  }
}

export default IPFSCpinnerClient
export { AuthManager, EncryptionManager }
