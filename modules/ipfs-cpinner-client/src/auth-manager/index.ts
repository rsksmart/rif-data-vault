import axios from 'axios'
import { decodeJWT } from 'did-jwt'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants'
import { LocalStorage } from './store'
import { LoginResponse, DIDAuthConfig, PersonalSign, KeyValueStore, DIDAuthStoreConfig, DIDAuthServiceConfig } from './types'
import { Web3Provider } from '../web3provider/types'

class AuthManager {
  store: KeyValueStore
  did: string
  serviceUrl: string
  personalSign: PersonalSign
  csrfHeader: string
  cookies: string[]

  constructor (config: DIDAuthConfig) {
    this.store = config.store || new LocalStorage()
    this.did = config.did
    this.serviceUrl = config.serviceUrl
    this.personalSign = config.personalSign
  }

  // store
  private storeTokens = async ({ accessToken, refreshToken }: { accessToken: string, refreshToken: string }) => {
    await Promise.all([
      this.store.set(`${ACCESS_TOKEN_KEY}-${this.did}`, accessToken),
      this.store.set(`${REFRESH_TOKEN_KEY}-${this.did}`, refreshToken)
    ])

    return { accessToken, refreshToken }
  }

  private getStoredAccessToken = () => this.store.get(`${ACCESS_TOKEN_KEY}-${this.did}`)
  private getStoredRefreshToken = () => this.store.get(`${REFRESH_TOKEN_KEY}-${this.did}`)

  // did auth challenge-response authentication
  private getChallenge = (): Promise<string> => axios.get(`${this.serviceUrl}/request-auth/${this.did}`)
    .then(res => {
      if (!(res.status === 200 && !!res.data)) throw new Error('Invalid response')

      this.csrfHeader = res.headers['x-csrf-token']
      this.cookies = res.headers['set-cookie'].map(cookie => cookie.split(';')[0])

      return res.data.challenge
    })

  private signChallenge = (challenge: string) => this.personalSign(
    `Are you sure you want to login to the RIF Data Vault?\nURL: ${this.serviceUrl}\nVerification code: ${challenge}`
  ).then(sig => ({ did: this.did, sig }))

  private login = (): Promise<LoginResponse> => this.getChallenge()
    .then(this.signChallenge)
    .then(signature => axios.post(`${this.serviceUrl}/auth`, { response: signature }, {
      headers: {
        'x-csrf-token': this.csrfHeader,
        cookie: this.cookies
      }
    }))
    .then(res => res.status === 200 && {
      accessToken: res.headers['set-cookie'][0].split(';')[0].split('=')[1],
      refreshToken: res.headers['set-cookie'][1].split(';')[0].split('=')[1]
    })
    .then(this.storeTokens)

  private async refreshAccessToken (): Promise<LoginResponse> {
    const refreshToken = await this.getStoredRefreshToken()

    if (!refreshToken) return this.login()

    return axios.post(`${this.serviceUrl}/refresh-token`, {}, {
      headers: {
        'x-csrf-token': this.csrfHeader,
        cookie: `refresh-token-${this.did}=${refreshToken};${this.cookies[0]}`
      }
    })
      .then(res => res.status === 200 && res.data)
      .then(this.storeTokens)
      .catch(err => {
        if (err.response.status !== 401) throw err

        // if it is expired, do another login
        return this.login()
      })
  }

  // api
  public async getAccessToken () {
    const accessToken = await this.getStoredAccessToken()

    if (!accessToken) return this.login().then(tokens => tokens.accessToken)

    // TODO: should we verify?
    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return this.refreshAccessToken().then(tokens => tokens.accessToken)
    }

    return accessToken
  }

  public storedTokens = () => Promise.all([
    this.getStoredAccessToken(),
    this.getStoredRefreshToken()
  ]).then(([accessToken, refreshToken]) => ({
    accessToken,
    refreshToken
  }))

  public getHeaders = () => this.getAccessToken()
    .then(accessToken => ({
      'x-logged-did': this.did,
      'x-csrf-token': this.csrfHeader,
      cookie: `authorization-${this.did}=${accessToken};${this.cookies[0]}`
    }))

  static fromWeb3Provider (config: DIDAuthServiceConfig & DIDAuthStoreConfig, provider: Web3Provider) {
    return provider.request({
      method: 'eth_accounts'
    }).then(accounts => new AuthManager({
      ...config,
      personalSign: (data: string) => provider.request({
        method: 'personal_sign',
        params: [data, accounts[0]]
      })
    }))
  }
}

export default AuthManager
