import { Repository } from 'typeorm'
import IpfsMetadata from './entities/ipfs-metadata'
import { CID, MetadataManager, DID, Key } from './types'

export default class implements MetadataManager {
  constructor (private repository: Repository<IpfsMetadata>) {}

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

  async delete (did: string, key: Key, cid: CID): Promise<boolean> {
    const file = await this.repository.findOne({ where: { did, key, cid } })

    if (file) {
      const deleteResult = await this.repository.remove(file)

      if (!deleteResult.id) return true
    }

    return false
  }
}
