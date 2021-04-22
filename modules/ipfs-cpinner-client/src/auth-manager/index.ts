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

  private request = (method: any) => async (...args) => {
    const config = await this.getConfig()
    return await method(config, ...args)
      .then(r => r as any)
      .catch(e => {
        if (e.response.status === 401) {
          return this.saveCsrf(e.response)
            .then(() => this.refreshAccessToken())
            .then(() => method(config, ...args))
        }
        throw e
      })
  }

  get: typeof axios.get = this.request((config, ...args) => axios.get(args[0], config))
  post: typeof axios.post = this.request((config, ...args) => axios.post(args[0], args[1], config))
  put: typeof axios.put = this.request((config, ...args) => axios.put(args[0], args[1], config))
  delete: typeof axios.delete = this.request((config, ...args) => axios.delete(args[0], config))
}

export default AuthManager
