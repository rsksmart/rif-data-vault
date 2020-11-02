import { Connection } from 'typeorm'
import { IpfsMetadata, MetadataManager } from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'

const database = './ipfs-pinner-provider.metadataManager.test.sqlite'

describe('metadata manager', () => {
  let dbConnection: Promise<Connection>
  let metadataManager: MetadataManager

  beforeAll(() => {
    dbConnection = createSqliteConnection(database)
  })

  beforeEach(async () => {
    await resetDatabase(dbConnection)
    const repository = (await dbConnection).getRepository(IpfsMetadata)
    metadataManager = new MetadataManager(repository)
  })

  afterAll(async () => {
    deleteDatabase(await dbConnection, database)
  })

  test('saves metadata and returns true', async () => {
    const did = 'did:ethr:rsk:12345678'
    const key = 'a key'
    const cid = 'a cid'

    const result = await metadataManager.save(did, key, cid)

    expect(result).toBeTruthy()
  })

  test('gets one metadata', async () => {
    const did = 'did:ethr:rsk:987654321abc'
    const key = 'one key'
    const cid = 'one cid'

    await metadataManager.save(did, key, cid)
    const result = await metadataManager.find(did, key)

    expect(result).toEqual([cid])
  })

  test('gets two metadata with same key and did', async () => {
    const did = 'did:ethr:rsk:987654321def'
    const key = 'one key'
    const cid = 'one cid'
    const anotherCid = 'another cid'

    await metadataManager.save(did, key, cid)
    await metadataManager.save(did, key, anotherCid)
    const result = await metadataManager.find(did, key)

    expect(result).toEqual([cid, anotherCid])
  })

  test('deletes existing metadata', async () => {
    const did = 'did:ethr:rsk:abcde'
    const key = 'one key'
    const cid = 'one cid'

    await metadataManager.save(did, key, cid)
    const result = await metadataManager.delete(did, key, cid)

    expect(result).toBeTruthy()
  })

  test('deletes invalid metadata', async () => {
    const did = 'did:ethr:rsk:edcba'
    const key = 'one key'
    const cid = 'one cid'

    await metadataManager.save(did, key, cid)
    const result = await metadataManager.delete(did, key, 'another')

    expect(result).toBeFalsy()
  })
})
