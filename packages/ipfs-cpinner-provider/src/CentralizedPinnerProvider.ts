import {
  Content, CID, DID, IpfsPinner, Key, MetadataManager, IpfsClient
} from './types'

export default class CentralizedPinnerProvider {
  constructor (
    private ipfsClient: IpfsClient,
    private metadataManager: MetadataManager,
    private ipfsPinner: IpfsPinner
  ) {}

  async put (did: DID, key: Key, content: Content): Promise<CID> {
    const cid = await this.ipfsClient.put(content)
    await this.ipfsPinner.pin(cid)
    await this.metadataManager.save(did, key, cid)
    return cid
  }

  async get (did: DID, key: Key): Promise<Content[]> {
    const cids = await this.metadataManager.find(did, key)

    const promises = []
    for (let i = 0; i < cids.length; i++) {
      const cid = cids[i]
      promises.push(this.ipfsClient.get(cid))
    }

    return Promise.all(promises).then(arrays => Array.prototype.concat.apply([], arrays))
  }

  async delete (did: DID, key: Key, cid?: CID): Promise<boolean> {
    if (cid) return this.deleteByCid(did, key, cid)

    const cids = await this.metadataManager.find(did, key)

    if (!cids.length) return false

    const promises = []
    for (let i = 0; i < cids.length; i++) {
      const cid = cids[i]
      promises.push(this.deleteByCid(did, key, cid))
    }

    return Promise.all(promises).then(results => !results.includes(false))
  }

  async swap (did: DID, key: Key, content: Content, cid?: CID): Promise<CID> {
    // TODO: Should we think a way to make it some kind of transactional to prevent data inconsistencies?
    await this.delete(did, key, cid)
    return this.put(did, key, content)
  }

  private async deleteByCid (did: DID, key: Key, cid: CID): Promise<boolean> {
    const removed = await this.metadataManager.delete(did, key, cid)
    if (removed) return this.ipfsPinner.unpin(cid)

    return false
  }
}
