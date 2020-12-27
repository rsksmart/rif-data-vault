import axios from 'axios'
import { decodeJWT } from 'did-jwt'
import { NO_DID, NO_SIGNER, NO_SERVICE_DID, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY,  } from './constants'
import { ClientKeyValueStorage, LoginResponse, Config } from './types'

export default (config: Config, storage: ClientKeyValueStorage) => {
  const login = async (): Promise<LoginResponse> => {
    const { serviceUrl } = config

    const tokens = await getChallenge()
      .then(signChallenge)
      .then(signature => axios.post(`${serviceUrl}/auth`, { response: signature }))
      .then(res => res.status === 200 && res.data)

    await storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)
    await storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)

    return tokens
  }

  const refreshAccessToken = async (): Promise<LoginResponse> => {
    const { serviceUrl } = config

    const refreshToken = await storage.get(REFRESH_TOKEN_KEY)

    if (!refreshToken) return login()

    const tokens = await axios.post(`${serviceUrl}/refresh-token`, { refreshToken })
      .then(res => res.status === 200 && res.data)
      .catch(err => {
        if (err.response.status !== 401) throw err

        // if it is expired, do another login
        return login()
      })

    await storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)
    await storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)

    return tokens
  }

  const getChallenge = async (): Promise<string> => {
    const { did, serviceUrl } = config

    return axios.get(`${serviceUrl}/request-auth/${did}`)
      .then(res => res.status === 200 && !!res.data && res.data.challenge)
  }

  const signChallenge = (challenge: string) => {
    const { did, rpcPersonalSign, serviceUrl, serviceDid } = config

    if (!did) throw new Error(NO_DID)
    if (!rpcPersonalSign) throw new Error(NO_SIGNER)
    if (!serviceDid) throw new Error(NO_SERVICE_DID)

    const message = `Login to ${serviceUrl}\nVerification code: ${challenge}`

    return rpcPersonalSign(message).then(sig => ({ did, sig }))
  }

  const getAccessToken = async () => {
    const accessToken = await storage.get(ACCESS_TOKEN_KEY)

    if (!accessToken) return login().then(tokens => tokens.accessToken)

    const { payload } = decodeJWT(accessToken)

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return refreshAccessToken().then(tokens => tokens.accessToken)
    }

    return accessToken
  }

  const storedTokens = async () => {
    return {
      accessToken: await storage.get(ACCESS_TOKEN_KEY),
      refreshToken: await storage.get(REFRESH_TOKEN_KEY)
    }
  }

  return { getAccessToken, storedTokens }
}
