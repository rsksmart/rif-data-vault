import { Connection } from 'typeorm'
import { IpfsMetadata, MetadataManager } from '../src'
import { createSqliteConnection, resetDatabase, deleteDatabase } from './util'

const database = './ipfs-pinner-provider.metadataManager.test.sqlite'

describe('metadata manager', function (this: {
  dbConnection: Connection,
  metadataManager: MetadataManager
}) {
  const did = 'did:ethr:rsk:12345678'
  const key = 'a key'
  const cid = 'a cid'
  const contentSize = 10

  beforeAll(async () => {
    this.dbConnection = await createSqliteConnection(database)
  })

  beforeEach(async () => {
    await resetDatabase(this.dbConnection)
    const repository = this.dbConnection.getRepository(IpfsMetadata)
    this.metadataManager = new MetadataManager(repository)
  })

  afterAll(async () => {
    deleteDatabase(this.dbConnection, database)
  })

  test('saves metadata and returns true', async () => {
    const result = await this.metadataManager.save(did, key, cid, contentSize)

    expect(result).toBeTruthy()
  })

  test('gets one metadata', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    const result = await this.metadataManager.find(did, key)

    expect(result).toEqual([cid])
  })

  test('gets two metadata with same key and did', async () => {
    const anotherCid = 'another cid'

    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, key, anotherCid, contentSize)
    const result = await this.metadataManager.find(did, key)

    expect(result).toEqual([cid, anotherCid])
  })

  test('deletes existing metadata', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    const result = await this.metadataManager.delete(did, key, cid)

    expect(result).toBe(true)
  })

  test('deletes invalid metadata', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    const result = await this.metadataManager.delete(did, key, 'another')

    expect(result).toBe(false)
  })

  test('gets empty array if no keys', async () => {
    const result = await this.metadataManager.getKeys(did)

    expect(result).toEqual([])
  })

  test('gets array with just created key', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    const result = await this.metadataManager.getKeys(did)

    expect(result).toEqual([key])
  })

  test('gets array with more than one key', async () => {
    const anotherKey = 'another key'

    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, anotherKey, cid, contentSize)
    const result = await this.metadataManager.getKeys(did)

    expect(result).toEqual([key, anotherKey])
  })

  test('gets array with non repeated keys', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, key, cid, contentSize)
    const result = await this.metadataManager.getKeys(did)

    expect(result).toEqual([key])
  })

  test('get keys should not return a deleted key', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    const before = await this.metadataManager.getKeys(did)
    expect(before).toEqual([key])

    await this.metadataManager.delete(did, key, cid)
    const after = await this.metadataManager.getKeys(did)
    expect(after).toEqual([])
  })

  test('get used storage should return zero if no content saved', async () => {
    const available = await this.metadataManager.getUsedStorage(did)

    expect(available).toEqual(0)
  })

  test('get used storage should return the just added contentSize', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)

    const available = await this.metadataManager.getUsedStorage(did)

    expect(available).toEqual(contentSize)
  })

  test('get used storage should should return the addition of both contents added even if they are the same', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, key, cid, contentSize)

    const available = await this.metadataManager.getUsedStorage(did)

    expect(available).toEqual(contentSize * 2)
  })

  test('get used storage should decrease if a content is deleted', async () => {
    const anotherKey = 'this is another key'
    const anotherContentSize = 16

    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, anotherKey, cid, anotherContentSize)

    const availableBeforeDeletion = await this.metadataManager.getUsedStorage(did)
    expect(availableBeforeDeletion).toEqual(contentSize + anotherContentSize)

    await this.metadataManager.delete(did, key, cid)

    const availableAfterDeletion = await this.metadataManager.getUsedStorage(did)
    expect(availableAfterDeletion).toEqual(anotherContentSize)
  })

  test('get used storage by did, key and cid should return the just added contentSize', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)

    const sizeWithoutCidParam = await this.metadataManager.getUsedStorageByDidKeyAndCid(did, key)
    expect(sizeWithoutCidParam).toEqual(contentSize)

    const sizeWitCidParam = await this.metadataManager.getUsedStorageByDidKeyAndCid(did, key, cid)
    expect(sizeWitCidParam).toEqual(contentSize)
  })

  test('get used storage by did, key and cid should return only the contentSize associated with the given cid and should be different from the usedStorage by did', async () => {
    const anotherKey = 'AnotherKey'
    const anotherContentSize = 123

    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, anotherKey, cid, anotherContentSize)

    const firstKeySize = await this.metadataManager.getUsedStorageByDidKeyAndCid(did, key)
    expect(firstKeySize).toEqual(contentSize)

    const anotherKeySize = await this.metadataManager.getUsedStorageByDidKeyAndCid(did, anotherKey)
    expect(anotherKeySize).toEqual(anotherContentSize)

    const totalUsedStorage = await this.metadataManager.getUsedStorage(did)
    expect(totalUsedStorage).toEqual(contentSize + anotherContentSize)
  })

  test('should get empty array when getting a backup if no content created', async () => {
    const data = await this.metadataManager.getBackupByDid(did)

    expect(data).toEqual([])
  })

  test('should get an array containing created data when requesting the backup', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)

    const data = await this.metadataManager.getBackupByDid(did)
    expect(data).toEqual([{ key, id: cid }])
  })

  test('should get an array with repeated data if it has been saved twice', async () => {
    await this.metadataManager.save(did, key, cid, contentSize)
    await this.metadataManager.save(did, key, cid, contentSize)

    const data = await this.metadataManager.getBackupByDid(did)
    expect(data).toEqual([{ key, id: cid }, { key, id: cid }])
  })
})
