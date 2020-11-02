import axios from 'axios'
import { Agent, AbstractSecretBox } from 'daf-core'
import RIFStorage, { Provider } from '@rsksmart/rif-storage'

interface ICentralizedIPFSPinnerClient {
  put: (key: string, content: string) => Promise<string>
  get: (key: string) => Promise<{ cid: string, content: Buffer }[] | { cid: string }[]>
  delete: (key: string, cid: string) => Promise<string>
}

type URLSetup = { auth: string, get: string, put: string, delete: string }

interface Signer {
  identity: string
  signJWT: (data: Object) => Promise<string>
  decodeJWT: (data: string) => Promise<any>
}

type CentralizedIPFSPinnerClientConstructor = {
  baseUrl: string,
  urls?: URLSetup,
  signer: Signer
  secretBox: AbstractSecretBox
  ipfsGet?: (cid: string) => Promise<Buffer>
}

type IPFSClientOptions = { ipfsDefault?: boolean, ipfsClientOptions?: { host: string, port: string, protocol: string } }

const CentralizedIPFSPinnerClient = (function (
  this: ICentralizedIPFSPinnerClient,
  { baseUrl, urls, signer, secretBox, ipfsGet }: CentralizedIPFSPinnerClientConstructor
) {
  if ((!baseUrl && !urls) || (!!baseUrl && !!urls)) throw new Error('Invalid setup')

  const _urls = urls || {
    auth: baseUrl + '/auth',
    get: baseUrl + '/get',
    put: baseUrl + '/put',
    delete: baseUrl + '/delete'
  }

  const login = () => axios.post(_urls.auth, { did: signer.identity })
    .then(res => res.status === 200 && res.data)
    .then(signer.decodeJWT)
    .then(message => (message.credentials[0].credentialSubject as any).token)

  const loginAndSendClaimWithToken = (claims: any[], url: string) => login()
    .then(token => signer.signJWT({
      issuer: signer.identity,
      claims: [{ claimType: 'token', claimValue: token }, ...claims]
    }))
    .then(jwt => axios.post(url, { jwt }))
    .then(res => res.status === 200 && res.data)

  this.put = (key: string, content: string) => secretBox.encrypt(content).then(_content =>
    loginAndSendClaimWithToken([
      { claimType: 'key', claimValue: key },
      { claimType: 'content', claimValue: _content }
    ], _urls.put)
  )

  this.get = (key: string) => loginAndSendClaimWithToken([
    { claimType: 'key', claimValue: key }
  ], _urls.get).then((cids: string[]) => new Promise(
    resolve => ipfsGet ? Promise.all(cids.map(cid => ipfsGet(cid)
      .then(cypher => secretBox.decrypt(cypher.toString('utf-8'))
        .then(content => ({ cid, content }))
      )))
      .then(resolve) : resolve(cids.map(cid => ({ cid })))
  ))

  this.delete = (key: string, cid: string) => loginAndSendClaimWithToken([
    { claimType: 'key', claimValue: key },
    { claimType: 'cid', claimValue: cid }
  ], _urls.delete)
} as any as {
  fromAgent: (identity: string, agent: Agent, secretBox: AbstractSecretBox, baseUrl: string, options: IPFSClientOptions) => ICentralizedIPFSPinnerClient
  new (params: CentralizedIPFSPinnerClientConstructor): ICentralizedIPFSPinnerClient
})

CentralizedIPFSPinnerClient.fromAgent = function (identity: string, agent: Agent, secretBox: AbstractSecretBox, baseUrl: string, { ipfsDefault, ipfsClientOptions }: IPFSClientOptions) {
  const dataVault = new CentralizedIPFSPinnerClient({
    baseUrl,
    signer: {
      identity: identity,
      signJWT: data => agent.handleAction({ type: 'sign.sdr.jwt', data }),
      decodeJWT: raw => agent.handleMessage({ raw, save: false, metaData: [] })
    },
    secretBox,
    ipfsGet: (ipfsDefault || !!ipfsClientOptions) ? ((cid: string) => RIFStorage(
      Provider.IPFS, ipfsDefault ? { host: 'localhost', port: '8080', protocol: 'http' } : ipfsClientOptions
    ).get(cid)) as (cid: string) => Promise<Buffer> : undefined
  })

  return dataVault
}

export { CentralizedIPFSPinnerClient }
