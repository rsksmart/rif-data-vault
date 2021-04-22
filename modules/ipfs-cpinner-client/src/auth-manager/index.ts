import axios from 'axios'
import { IAuthManager, DIDAuthConfig, KeyValueStore, PersonalSign } from './types'
import { LocalStorage } from './store'

const x_csrf_token = 'x-csrf-token'

class AuthManager implements IAuthManager {
  store: KeyValueStore
  did: string
  serviceUrl: string
  personalSign: PersonalSign

  constructor({ store, did, serviceUrl, personalSign }: DIDAuthConfig) {
    this.store = store || new LocalStorage()
    this.did = did
    this.serviceUrl = serviceUrl
    this.personalSign = personalSign

    axios.defaults.withCredentials = true
  }

  private saveCsrf = async (response) => {
    const token = await this.store.get(x_csrf_token)

    if (!token) {
      await this.store.set(x_csrf_token, response.headers[x_csrf_token])
    }

    return response
  }

  // did auth challenge-response authentication
  private getChallenge = (): Promise<string> => axios.get(`${this.serviceUrl}/request-auth/${this.did}`)
    .catch(e => this.saveCsrf(e.response))
    .then(res => {
      this.store.set(x_csrf_token, res.headers[x_csrf_token])
      return res.data.challenge
    })
    .then(this.saveCsrf)

  private signChallenge = (challenge: string) => this.personalSign(
    `Are you sure you want to login to the RIF Data Vault?\nURL: ${this.serviceUrl}\nVerification code: ${challenge}`
  ).then(sig => ({ did: this.did, sig }))

  private login = (): Promise<void> => this.store.get(x_csrf_token)
    .then(token => this.getChallenge()
    .then(this.signChallenge)
    .then(signature => axios.post(`${this.serviceUrl}/auth`, { response: signature }, {
      headers: { 'x-csrf-token': token }
    })))

  private getConfig = () => this.store.get(x_csrf_token).then(token => ({
    headers: {
      'x-csrf-token': token,
      'x-logged-did': this.did
    }
  }))

  private async refreshAccessToken (): Promise<void> {
    const config = await this.getConfig()

    try {
      await axios.post(`${this.serviceUrl}/refresh-token`, {}, config)
    } catch (e) {
      if (e.response.status !== 401) throw e
      await this.login()
    }
  }

  get: typeof axios.get = async (...args) => this.getConfig().then(config => axios.get(args[0], config)
    .then(r => r as any)
    .catch(e => {
      if (e.response.status === 401) {
        return this.saveCsrf(e.response)
          .then(() => this.refreshAccessToken())
          .then(() => axios.get(args[0], config))
      }
      throw e
    }))

  post: typeof axios.post = (...args) => this.getConfig().then(config => axios.post(args[0], args[1], config)
    .then(r => r as any)
    .catch(e => {
      if (e.response.status === 401) {
        return this.saveCsrf(e.response)
          .then(() => this.refreshAccessToken())
          .then(() => axios.post(args[0], args[1], config))
      }
      throw e
    }))

  delete: typeof axios.delete = (...args) => this.getConfig().then(config => axios.delete(args[0], config)
    .then(r => r as any)
    .catch(e => {
      if (e.response.status === 401) {
        return this.saveCsrf(e.response)
          .then(() => this.refreshAccessToken())
          .then(() => axios.delete(args[0], config))
      }
      throw e
    }))

  put: typeof axios.put = (...args) => this.getConfig().then(config => axios.put(args[0], args[1], config)
    .then(r => r as any)
    .catch(e => {
      if (e.response.status === 401) {
        return this.saveCsrf(e.response)
          .then(() => this.refreshAccessToken())
          .then(() => axios.put(args[0], args[1], config))
      }
      throw e
    }))
}

export default AuthManager
