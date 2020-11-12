import axios from 'axios'
import { createJWT } from 'did-jwt'
import { NO_DID, NO_SERVICE_DID, NO_SIGNER } from './errors'

type GetFilePayload = { did: string, key: string }
export type Signer = (string) => Promise<string>

type Options = {
  serviceUrl: string,
  serviceDid?: string,
  did?: string
  signer?: Signer
}

export default class {
  // eslint-disable-next-line no-useless-constructor
  constructor (private opts: Options) {}

  get ({ did, key }: GetFilePayload): Promise<string> {
    return axios.get(`${this.opts.serviceUrl}/${did}/${key}`)
      .then(res => res.status === 200 && res.data)
      .then(({ content }) => content.length && content)
  }

  login (): Promise<{ accessToken: string, refreshToken: string }> {
    const { did, signer, serviceUrl } = this.opts
    if (!did) throw new Error(NO_DID)
    if (!signer) throw new Error(NO_SIGNER)

    return this.getChallenge()
      .then(this.signChallenge.bind(this))
      .then(signature => axios.post(`${serviceUrl}/auth`, { response: signature }))
      .then(res => res.status === 200 && !!res.data && res.data)
  }

  async getChallenge (): Promise<string> {
    const { did, serviceUrl } = this.opts
    if (!did) throw new Error(NO_DID)

    return axios.get(`${serviceUrl}/request-auth/${did}`)
      .then(res => res.status === 200 && !!res.data && res.data.challenge)
  }

  async signChallenge (challenge: string): Promise<string> {
    const { did, signer, serviceUrl, serviceDid } = this.opts
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
}
