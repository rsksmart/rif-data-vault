import { Repository } from 'typeorm'
import IpfsMetadata from './entities/ipfs-metadata'
import { CID, MetadataManager, DID, Key } from './types'

export default class implements MetadataManager {
  private repository: Repository<IpfsMetadata>

  constructor (repository: Repository<IpfsMetadata>) {
    this.repository = repository
  }

  save (did: DID, key: Key, cid: CID): Promise<boolean> {
    const entry = new IpfsMetadata(did, key, cid)

    return this.repository.save(entry).then(() => true)
  }

  find (did: DID, key: Key): Promise<CID[]> {
    return this.repository.find({
      where: { did, key },
      select: ['cid']
    }).then((entries: { cid: string }[]) => entries.map(entry => entry.cid))
  }

  getKeys (did: DID): Promise<Key[]> {
    return this.repository.find({
      where: { did },
      select: ['key']
    }).then((entries: { key: string }[]) => [...new Set(entries.map(entry => entry.key))])
  }

  async delete (did: string, key: Key, cid: CID): Promise<boolean> {
    const file = await this.repository.findOne({ where: { did, key, cid } })

    if (file) {
      const deleteResult = await this.repository.remove(file)

      if (!deleteResult.id) return true
    }

    return false
  }
}
