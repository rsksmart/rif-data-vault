import IpfsPinnerProvider from './IpfsPinnerProvider'
import IpfsHttpClient from 'ipfs-http-client'
import { createConnection } from 'typeorm'
import IpfsClient from './IpfsClient'
import IpfsPinner from './IpfsPinner'
import MetadataManager from './MetadataManager'
import IpfsPinnedCid from './entities/ipfs-pinned-cid'
import IpfsMetadata from './entities/ipfs-metadata'
import { DEFAULT_IPFS_API, DEFAULT_MAX_STORAGE } from './constants'
import { Config } from './types'

const Entities = [IpfsPinnedCid, IpfsMetadata]
export const createSqliteConnection = (database: string) => createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

export const ipfsPinnerProviderFactory = async ({ dbConnection, ipfsApiUrl = DEFAULT_IPFS_API, maxStorage = DEFAULT_MAX_STORAGE }: Config) => {
  const ipfsHttpClient = IpfsHttpClient({ url: ipfsApiUrl })
  const pinnedCidsRepository = dbConnection.getRepository(IpfsPinnedCid)
  const metadataRepository = dbConnection.getRepository(IpfsMetadata)

  const ipfsClient = new IpfsClient(ipfsHttpClient)
  const ipfsPinner = new IpfsPinner(ipfsHttpClient, pinnedCidsRepository)
  const metadataManager = new MetadataManager(metadataRepository)

  return new IpfsPinnerProvider(ipfsClient, metadataManager, ipfsPinner, maxStorage)
}

export { IpfsPinnerProvider, IpfsClient, IpfsPinner, MetadataManager, Entities, IpfsMetadata, IpfsPinnedCid }
