import { Connection } from 'typeorm'
import { IpfsMetadata, IpfsPinnedCid } from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'

const database = './ipfs-pinner-provider.entities.test.sqlite'

describe('entities', () => {
  let dbConnection: Promise<Connection>

  beforeAll(() => {
    dbConnection = createSqliteConnection(database)
  })

  beforeEach(async () => {
    await resetDatabase(dbConnection)
  })

  afterAll(async () => {
    deleteDatabase(await dbConnection, database)
  })

  test('save ipfs metadata to DB', async () => {
    const connection = await dbConnection
    const metadataRepository = connection.getRepository(IpfsMetadata)

    const did = 'did:ethr:rsk:123456789'
    const key = 'my new content'
    const cid = 'the cid'

    const metadata = new IpfsMetadata(did, key, cid)
    await metadataRepository.save(metadata)

    const metadataFromDb = await metadataRepository.findOne({ where: { did } })
    if (!metadataFromDb) throw new Error('Error')
    expect(metadataFromDb.did).toEqual(did)
    expect(metadataFromDb.cid).toEqual(cid)
    expect(metadataFromDb.key).toEqual(key)
  })

  test('save ipfs pinned cid to DB', async () => {
    const connection = await dbConnection
    const pinnedCidRepository = connection.getRepository(IpfsPinnedCid)

    const cid = 'another cid'

    const pinnedCid = new IpfsPinnedCid(cid)
    await pinnedCidRepository.save(pinnedCid)

    const pinnedCidFromDb = await pinnedCidRepository.findOne({ where: { cid } })
    if (!pinnedCidFromDb) throw new Error('Error')
    expect(pinnedCidFromDb.cid).toEqual(cid)
  })
})
