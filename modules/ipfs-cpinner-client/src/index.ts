import AuthManager from './auth-manager'
import { IAuthManager } from './auth-manager/types'
import { AUTHENTICATION_ERROR, MAX_STORAGE_REACHED, SERVICE_MAX_STORAGE_REACHED, UNKNOWN_ERROR } from './constants'
import {
  CreateContentPayload, CreateContentResponse,
  DeleteTokenPayload, GetContentPayload, Config,
  SwapContentPayload, SwapContentResponse, GetContentResponsePayload, StorageInformation, Backup
} from './types'

import { IEncryptionManager } from './encryption-manager/types'
import AsymmetricEncryptionManager from './encryption-manager/asymmetric'
import SignerEncryptionManager from './encryption-manager/with-signer'

class IPFSCpinnerClient {
  private authManager: IAuthManager
  private encryptionManager: IEncryptionManager

  constructor (private config: Config) {
    this.authManager = config.authManager
    this.encryptionManager = config.encryptionManager
  }

  async get ({ key }: GetContentPayload): Promise<GetContentResponsePayload[]> {
    try {
      const encrypted = await this.authManager.get(`${this.config.serviceUrl}/content/${key}`)
        .then(res => res.status === 200 && res.data)

      return Promise.all(encrypted.map(({ id, content }) => this.encryptionManager.decrypt(content).then(decrypted => ({ id, content: decrypted }))))
    } catch (err) {
      this.errorHandler(err)
    }
  }

  getKeys (): Promise<string[]> {
    const { serviceUrl } = this.config

    return this.authManager.get(`${serviceUrl}/keys`)
      .then(res => res.status === 200 && !!res.data && res.data.keys)
      .catch(this.errorHandler)
  }

  getStorageInformation (): Promise<StorageInformation> {
    const { serviceUrl } = this.config

    return this.authManager.get(`${serviceUrl}/storage`)
      .then(res => res.status === 200 && res.data)
      .catch(this.errorHandler)
  }

  getBackup (): Promise<Backup> {
    const { serviceUrl } = this.config

    return this.authManager.get(`${serviceUrl}/backup`)
      .then(res => res.status === 200 && res.data)
      .catch(this.errorHandler)
  }

  create (payload: CreateContentPayload): Promise<CreateContentResponse> {
    const { content, key } = payload
    const { serviceUrl } = this.config

    return this.encryptionManager.encrypt(content)
      .then(encrypted => this.authManager.post(`${serviceUrl}/content/${key}`, { content: encrypted }))
      .then(res => res.status === 201 && res.data)
      .catch(this.errorHandler)
  }

  delete (payload: DeleteTokenPayload): Promise<boolean | void> {
    const { key, id } = payload
    const { serviceUrl } = this.config
    const path = id ? `${key}/${id}` : key

    return this.authManager.delete(`${serviceUrl}/content/${path}`)
      .then(res => res.status === 200)
      .catch(this.errorHandler)
  }

  swap (payload: SwapContentPayload): Promise<SwapContentResponse> {
    const { key, content, id } = payload
    const { serviceUrl } = this.config

    const path = id ? `${key}/${id}` : key
    return this.encryptionManager.encrypt(content)
      .then(encrypted => this.authManager.put(`${serviceUrl}/content/${path}`, { content: encrypted }))
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
export { AuthManager, AsymmetricEncryptionManager, SignerEncryptionManager }
