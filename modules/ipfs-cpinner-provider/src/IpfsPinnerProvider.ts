import {
  Content, CID, DID, IpfsPinner, Key, MetadataManager, IpfsClient
} from './types'

export default class IpfsPinnerProvider {
  private ipfsClient: IpfsClient
  private metadataManager: MetadataManager
  private ipfsPinner: IpfsPinner

  constructor (ipfsClient: IpfsClient, metadataManager: MetadataManager, ipfsPinner: IpfsPinner) {
    this.ipfsClient = ipfsClient
    this.metadataManager = metadataManager
    this.ipfsPinner = ipfsPinner
  }

  async create (did: DID, key: Key, content: Content): Promise<CID> {
    const cid = await this.ipfsClient.put(content)
    await this.ipfsPinner.pin(cid)
    await this.metadataManager.save(did, key, cid)
    return cid
  }

  async get (did: DID, key: Key): Promise<Content[]> {
    const cids = await this.metadataManager.find(did, key)

    return Promise.all(cids.map(cid => this.ipfsClient.get(cid))).then(arrays => Array.prototype.concat.apply([], arrays))
  }

  async delete (did: DID, key: Key, cid?: CID): Promise<boolean> {
    if (cid) return this.deleteByCid(did, key, cid)

    const cids = await this.metadataManager.find(did, key)

    if (!cids.length) return false

    return Promise.all(cids.map(cid => this.deleteByCid(did, key, cid))).then(results => !results.includes(false))
  }

  async update (did: DID, key: Key, content: Content, cid?: CID): Promise<CID> {
    await this.delete(did, key, cid)
    return this.create(did, key, content)
  }

  private async deleteByCid (did: DID, key: Key, cid: CID): Promise<boolean> {
    const removed = await this.metadataManager.delete(did, key, cid)
    if (removed) return this.ipfsPinner.unpin(cid)

    return false
  }
}
