import { IpfsHttpClient } from 'ipfs-http-client'
import { Content, CID, IpfsClient } from './types'

export default class implements IpfsClient {
  private ipfsHttpClient: IpfsHttpClient
  constructor (ipfsHttpClient: IpfsHttpClient) {
    this.ipfsHttpClient = ipfsHttpClient
  }

  async get (cid: string): Promise<string> {
    const responses = this.ipfsHttpClient.cat(cid)
    const decoder = new TextDecoder()
    let data = ''

    for await (const chunk of responses) {
      data += decoder.decode(chunk, { stream: true })
    }

    return data
  }

  put (content: Content): Promise<CID> {
    const buffer = Buffer.from(content)
    return this.ipfsHttpClient.add(buffer).then(({ path }) => path)
  }
}
