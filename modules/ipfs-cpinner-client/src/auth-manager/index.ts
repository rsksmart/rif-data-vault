import axios from 'axios'
import { decodeJWT } from 'did-jwt'
import { NO_DID, NO_SIGNER, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants'
import { ClientKeyValueStorage, LoginResponse, DIDAuthConfig } from './types'

const storageFromLocalStorage = (): ClientKeyValueStorage => ({
  get: (key: string) => Promise.resolve(localStorage.getItem(key)),
  set: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value))
})

export default (config: DIDAuthConfig) => {
  // storage
  const storage = config.storage || storageFromLocalStorage()

  const storeTokens = async ({ accessToken, refreshToken }: { accessToken: string, refreshToken: string }) => {
    await Promise.all([
      storage.set(ACCESS_TOKEN_KEY, accessToken),
      storage.set(REFRESH_TOKEN_KEY, refreshToken)
    ])

    return { accessToken, refreshToken }
  }

  const getStoredAccessToken = () => storage.get(ACCESS_TOKEN_KEY)
  const getStoredRefreshToken = () => storage.get(REFRESH_TOKEN_KEY)

  // did auth challenge-response authentication
  const { did, serviceUrl, personalSign } = config

  const getChallenge = async (): Promise<string> => axios.get(`${serviceUrl}/request-auth/${did}`)
    .then(res => res.status === 200 && !!res.data && res.data.challenge)

  const signChallenge = (challenge: string) => {
    if (!did) throw new Error(NO_DID)
    if (!personalSign) throw new Error(NO_SIGNER)

    const message = `Login to ${serviceUrl}\nVerification code: ${challenge}`

    return personalSign(message).then(sig => ({ did, sig }))
  }

  const login: () => Promise<LoginResponse> = () => getChallenge()
    .then(signChallenge)
    .then(signature => axios.post(`${serviceUrl}/auth`, { response: signature }))
    .then(res => res.status === 200 && res.data)
    .then(storeTokens)

  const refreshAccessToken = async (): Promise<LoginResponse> => {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY)

    if (!refreshToken) return login()

    return axios.post(`${serviceUrl}/refresh-token`, { refreshToken })
      .then(res => res.status === 200 && res.data)
      .then(storeTokens)
      .catch(err => {
        if (err.response.status !== 401) throw err

        // if it is expired, do another login
        return login()
      })
  }

  // api
  const getAccessToken = async () => {
    const accessToken = await storage.get(ACCESS_TOKEN_KEY)

    if (!accessToken) return login().then(tokens => tokens.accessToken)

    // TODO: should we verify?
    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return refreshAccessToken().then(tokens => tokens.accessToken)
    }

    return accessToken
  }

  const storedTokens = async () => {
    return {
      accessToken: await getStoredAccessToken(),
      refreshToken: await getStoredRefreshToken()
    }
  }

  return { getAccessToken, storedTokens }
}
