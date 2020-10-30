import IpfsPinnerProvider from './IpfsPinnerProvider'
import IpfsHttpClient from 'ipfs-http-client'
import { Connection, createConnection } from 'typeorm'
import IpfsClient from './IpfsClient'
import IpfsPinner from './IpfsPinner'
import MetadataManager from './MetadataManager'
import IpfsPinnedCid from './entities/ipfs-pinned-cid'
import IpfsMetadata from './entities/ipfs-metadata'

const Entities = [IpfsPinnedCid, IpfsMetadata]
export const createSqliteConnection = (database: string) => createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

export const ipfsPinnerProviderFactory = async (dbConnection: Connection, ipfsApiUrl = 'http://localhost:5001') => {
  const ipfsHttpClient = IpfsHttpClient({ url: ipfsApiUrl })
  const pinnedCidsRepository = dbConnection.getRepository(IpfsPinnedCid)
  const metadataRepository = dbConnection.getRepository(IpfsMetadata)

  const ipfsClient = new IpfsClient(ipfsHttpClient)
  const ipfsPinner = new IpfsPinner(ipfsHttpClient, pinnedCidsRepository)
  const metadataManager = new MetadataManager(metadataRepository)

  return new IpfsPinnerProvider(ipfsClient, metadataManager, ipfsPinner)
}

export { IpfsPinnerProvider, IpfsClient, IpfsPinner, MetadataManager, Entities, IpfsMetadata, IpfsPinnedCid }
