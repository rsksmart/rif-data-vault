import { Repository } from 'typeorm'
import IpfsMetadata from './entities/ipfs-metadata'
import { CID, MetadataManager, DID, Key } from './types'

export default class implements MetadataManager {
  // eslint-disable-next-line no-useless-constructor
  constructor (private repository: Repository<IpfsMetadata>) { }

  save (did: DID, key: Key, cid: CID, contentSize: number): Promise<boolean> {
    const entry = new IpfsMetadata(did, key, cid, contentSize)

    return this.repository.save(entry).then(() => true)
  }

  find (did: DID, key: Key): Promise<CID[]> {
    return this.repository.find({
      where: { did, key },
      select: ['cid']
    }).then((entries: { cid: string }[]) => entries.map(entry => entry.cid))
  }

  async delete (did: string, key: Key, cid: CID): Promise<boolean> {
    const file = await this.repository.findOne({ where: { did, key, cid } })

    if (file) {
      const deleteResult = await this.repository.remove(file)

      if (!deleteResult.id) return true
    }

    return false
  }

  getKeys (did: DID): Promise<Key[]> {
    return this.repository.find({
      where: { did },
      select: ['key']
    }).then((entries: { key: string }[]) => [...new Set(entries.map(entry => entry.key))])
  }

  getUsedStorage (did: DID): Promise<number> {
    return this.repository.find({
      where: { did },
      select: ['contentSize']
    }).then((entries: { contentSize: number }[]) => entries.map(e => e.contentSize).reduce((a, b) => a + b, 0))
  }

  getUsedStorageByDidKeyAndCid (did: string, key: string, cid?: string): Promise<number> {
    const searchCriteria = cid ? { did, key, cid } : { did, key }

    return this.repository.find({
      where: searchCriteria,
      select: ['contentSize']
    }).then((entries: { contentSize: number }[]) => entries.map(e => e.contentSize).reduce((a, b) => a + b, 0))
  }
}
