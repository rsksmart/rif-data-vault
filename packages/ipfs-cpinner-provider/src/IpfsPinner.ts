import { Repository } from 'typeorm'
import { IpfsPinner } from './types'
import { IpfsHttpClient } from 'ipfs-http-client'
import IpfsPinnedCid from './entities/ipfs-pinned-cid'

export default class implements IpfsPinner {
  constructor (
    private ipfsHttpClient: IpfsHttpClient,
    private repository: Repository<IpfsPinnedCid>
  ) {}

  async pin (cid: string): Promise<boolean> {
    const pinned = await this.repository.findOne({ where: { cid } })

    if (pinned && pinned.count) {
      pinned.count++
      return this.repository.save(pinned).then(() => true)
    }

    return this.ipfsHttpClient.pin.add(cid)
      .then(() => this.repository.save(new IpfsPinnedCid(cid)))
      .then(() => true)
  }

  async unpin (cid: string): Promise<boolean> {
    const pinned = await this.repository.findOne({ where: { cid } })

    if (pinned.count === 1) {
      return this.ipfsHttpClient.pin.rm(cid)
        .then(() => this.repository.delete({ cid }))
        .then(() => true)
    }

    pinned.count--
    return this.repository.save(pinned).then(() => true)
  }
}
