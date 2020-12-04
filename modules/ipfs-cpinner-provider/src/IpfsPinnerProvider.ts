import { MAX_STORAGE_REACHED } from './constants'
import {
  Content, CID, DID, IpfsPinner, Key, MetadataManager, IpfsClient, SavedContent
} from './types'

export default class IpfsPinnerProvider {
  // eslint-disable-next-line no-useless-constructor
  constructor (
    private ipfsClient: IpfsClient,
    private metadataManager: MetadataManager,
    private ipfsPinner: IpfsPinner,
    private maxStorage: number
  ) { }

  async create (did: DID, key: Key, content: Content): Promise<CID> {
    const contentSize = this.getContentSize(content)

    if (contentSize > this.maxStorage) throw new Error(MAX_STORAGE_REACHED)

    const availableStorage = await this.getAvailableStorage(did)

    if (contentSize > availableStorage) throw new Error(MAX_STORAGE_REACHED)

    const cid = await this.ipfsClient.put(content)
    await this.ipfsPinner.pin(cid)
    await this.metadataManager.save(did, key, cid, contentSize)

    return cid
  }

  async get (did: DID, key: Key): Promise<SavedContent[]> {
    const cids = await this.metadataManager.find(did, key)

    return Promise.all(
      cids.map(
        cid => this.ipfsClient.get(cid).then(content => ({ id: cid, content }))
      )
    )
  }

  async delete (did: DID, key: Key, cid?: CID): Promise<boolean> {
    if (cid) return this.deleteByCid(did, key, cid)

    const cids = await this.metadataManager.find(did, key)

    if (!cids.length) return false

    return Promise.all(cids.map(cid => this.deleteByCid(did, key, cid))).then(results => !results.includes(false))
  }

  async update (did: DID, key: Key, content: Content, cid?: CID): Promise<CID> {
    const contentToAddSize = this.getContentSize(content)
    if (contentToAddSize > this.maxStorage) throw new Error(MAX_STORAGE_REACHED)

    const usedStorage = await this.metadataManager.getUsedStorage(did)
    const availableStorage = this.maxStorage - usedStorage // may be lower than 0

    if (contentToAddSize > availableStorage) {
      const contentToDeleteSize = await this.metadataManager.getUsedStorageByDidKeyAndCid(did, key, cid)

      if (contentToAddSize > availableStorage + contentToDeleteSize) throw new Error(MAX_STORAGE_REACHED)
    }

    await this.delete(did, key, cid)
    return this.create(did, key, content)
  }

  async getKeys (did: DID): Promise<Key[]> {
    return this.metadataManager.getKeys(did)
  }

  async getAvailableStorage (did: DID): Promise<number> {
    const usedStorage = await this.metadataManager.getUsedStorage(did)

    const available = this.maxStorage - usedStorage

    return available >= 0 ? available : 0
  }

  getUsedStorage (did: DID): Promise<number> {
    return this.metadataManager.getUsedStorage(did)
  }

  private async deleteByCid (did: DID, key: Key, cid: CID): Promise<boolean> {
    const removed = await this.metadataManager.delete(did, key, cid)
    if (removed) return this.ipfsPinner.unpin(cid)

    return false
  }

  private getContentSize (content: Content): number {
    return Buffer.from(content).byteLength
  }
}
