import { IpfsHttpClient } from 'ipfs-http-client'
import { Content, CID, IpfsClient } from './types'
import all from 'it-all'

export default class implements IpfsClient {
  private ipfsHttpClient: IpfsHttpClient
  constructor (ipfsHttpClient: IpfsHttpClient) {
    this.ipfsHttpClient = ipfsHttpClient
  }

  async get (cid: string): Promise<string> {
    const buffer = await all(this.ipfsHttpClient.cat(cid))

    return buffer.toString()
  }

  put (content: Content): Promise<CID> {
    const buffer = Buffer.from(content)
    return this.ipfsHttpClient.add(buffer).then(({ path }) => path)
  }
}
