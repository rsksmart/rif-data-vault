import { IpfsHttpClient, IpfsObject } from 'ipfs-http-client'
import { Content, CID, IpfsClient } from './types'
import all from 'it-all'

export default class implements IpfsClient {
  private ipfsHttpClient: IpfsHttpClient
  constructor (ipfsHttpClient: IpfsHttpClient) {
    this.ipfsHttpClient = ipfsHttpClient
  }

  async get (cid: string): Promise<string[]> {
    const contents = await all(this.ipfsHttpClient.get(cid))

    const promises = []
    for (let i = 0; i < contents.length; i++) {
      const ipfsObject = contents[i] as IpfsObject

      promises.push(await all(ipfsObject.content))
    }

    return Promise.all(promises).then(buffers => buffers.map(buffer => buffer.toString()))
  }

  put (content: Content): Promise<CID> {
    const buffer = Buffer.from(content)
    return this.ipfsHttpClient.add(buffer).then(({ path }) => path)
  }
}
