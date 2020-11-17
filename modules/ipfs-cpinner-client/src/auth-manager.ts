import { NO_DID, NO_SIGNER, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, NO_SERVICE_DID } from './constants'
import { ClientKeyValueStorage, LoginResponse, Options } from './types'
import axios from 'axios'
import { createJWT } from 'did-jwt'

export const authManagerFactory = (opts: Options, storage: ClientKeyValueStorage) => {
  const login = async (): Promise<LoginResponse> => {
    const { did, signer, serviceUrl } = opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)

    const tokens = await getChallenge()
      .then(signChallenge)
      .then(signature => axios.post(`${serviceUrl}/auth`, { response: signature }))
      .then(res => res.status === 200 && !!res.data && res.data)

    await storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)
    await storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)

    return tokens
  }

  const refreshAccessToken = async (): Promise<LoginResponse> => {
    const { did, signer, serviceUrl } = opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)

    const refreshToken = await storage.get(REFRESH_TOKEN_KEY)

    if (!refreshToken) return login()

    const tokens = await axios.post(`${serviceUrl}/refresh-token`, { refreshToken })
      .then(res => res.status === 200 && !!res.data && res.data)

    // TODO: Take care of expired refresh token

    await storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)
    await storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)

    return tokens
  }

  const getChallenge = async (): Promise<string> => {
    const { did, serviceUrl } = opts
    if (!did) throw new Error(NO_DID)

    return axios.get(`${serviceUrl}/request-auth/${did}`)
      .then(res => res.status === 200 && !!res.data && res.data.challenge)
  }

  const signChallenge = async (challenge: string): Promise<string> => {
    const { did, signer, serviceUrl, serviceDid } = opts
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

  return { login, refreshAccessToken, getChallenge, signChallenge }
}
