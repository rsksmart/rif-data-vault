import axios from 'axios'
import { decodeJWT } from 'did-jwt'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants'
import { LocalStorage } from './store'
import { IAuthManager, LoginResponse, DIDAuthConfig, PersonalSign, KeyValueStore, DIDAuthStoreConfig, DIDAuthServiceConfig } from '@rsksmart/ipfs-cpinner-client-types/lib/auth-manager/types'
import { Web3Provider } from '@rsksmart/ipfs-cpinner-client-types/lib/web3provider/types'

class AuthManager implements IAuthManager {
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

  private getStoredAccessToken = async () => {
    return await this.store.get(`${ACCESS_TOKEN_KEY}-${this.did}`)
  }

  private getStoredRefreshToken = async () => {
    return await this.store.get(`${REFRESH_TOKEN_KEY}-${this.did}`)
  }

  // did auth challenge-response authentication
  private getChallenge = async (): Promise<string> => {
    const res = await axios.get(`${this.serviceUrl}/request-auth/${this.did}`)

    if (!(res.status === 200 && !!res.data)) throw new Error('Invalid response')

    this.csrfHeader = res.headers['x-csrf-token']
    this.cookies = res.headers['set-cookie'].map(cookie => cookie.split(';')[0])

    return res.data.challenge
  }

  private signChallenge = async (challenge: string) => {
    const sig = await this.personalSign(
      `Are you sure you want to login to the RIF Data Vault?\nURL: ${this.serviceUrl}\nVerification code: ${challenge}`
    )

    return { did: this.did, sig }
  }

  private login = async (): Promise<LoginResponse> => {
    const challenge = await this.getChallenge()
    const signature = await this.signChallenge(challenge)

    const res = await axios.post(`${this.serviceUrl}/auth`, { response: signature }, {
      headers: {
        'x-csrf-token': this.csrfHeader,
        cookie: this.cookies
      }
    })

    if (res.status === 200) {
      return await this.storeTokens({
        accessToken: res.headers['set-cookie'][0].split(';')[0].split('=')[1],
        refreshToken: res.headers['set-cookie'][1].split(';')[0].split('=')[1]
      })
    }
  }

  private async refreshAccessToken (): Promise<LoginResponse> {
    const refreshToken = await this.getStoredRefreshToken()

    if (!refreshToken) return await this.login()

    try {
      const res = await axios.post(`${this.serviceUrl}/refresh-token`, {}, {
        headers: {
          'x-csrf-token': this.csrfHeader,
          cookie: `refresh-token-${this.did}=${refreshToken};${this.cookies[0]}`
        }
      })

      if (res.status === 200) {
        return await this.storeTokens(res.data)
      }
    } catch (err) {
      if (err.response.status !== 401) throw err

      return await this.login()
    }
  }

  // api
  public async getAccessToken () {
    const accessToken = await this.getStoredAccessToken()

    if (!accessToken) {
      const tokens = await this.login()
      return tokens.accessToken
    }

    // TODO: should we verify?
    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      const tokens = await this.refreshAccessToken()
      return tokens.accessToken
    }

    return accessToken
  }

  public storedTokens = async () => {
    const [accessToken, refreshToken] = await Promise.all([
      this.getStoredAccessToken(),
      this.getStoredRefreshToken()
    ])

    return { accessToken, refreshToken }
  }

  public getHeaders = async () => {
    const accessToken = await this.getAccessToken()
    return {
      'x-logged-did': this.did,
      'x-csrf-token': this.csrfHeader,
      cookie: `authorization-${this.did}=${accessToken};${this.cookies[0]}`
    }
  }

  public get: typeof axios.get = async (...args) => {
    const headers = await this.getHeaders()
    return await axios.get(args[0], { headers })
  }

  public post: typeof axios.post = async (...args) => {
    const headers = await this.getHeaders()
    return await axios.post(args[0], args[1], { headers })
  }

  public delete: typeof axios.delete = async (...args) => {
    const headers = await this.getHeaders()
    return await axios.delete(args[0], { headers })
  }

  public put: typeof axios.put = async (...args) => {
    const headers = await this.getHeaders()
    return await axios.put(args[0], args[1], { headers })
  }

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
