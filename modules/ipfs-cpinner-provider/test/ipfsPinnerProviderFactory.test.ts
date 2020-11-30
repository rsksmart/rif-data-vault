import { IpfsPinnerProvider, createSqliteConnection, ipfsPinnerProviderFactory } from '../src'
import ipfsHash from 'ipfs-only-hash'
import fs from 'fs'
import { getRandomString } from './util'

const database = './ipfs-pinner-provider-factory.ipfsPinnerProvider.test.sqlite'

describe('ipfs pinner provider', () => {
  let centralizedPinnerProvider: IpfsPinnerProvider

  const did = 'did:ethr:rsk:12345678'

  beforeAll(async () => {
    const connection = await createSqliteConnection(database)
    centralizedPinnerProvider = await ipfsPinnerProviderFactory(connection, 'http://localhost:5001')
  })

  afterAll(() => fs.unlinkSync(database))

  test('get keys', async () => {
    const key = getRandomString()
    const content = getRandomString()

    await centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await centralizedPinnerProvider.getKeys(did)
    expect(retrievedContent).toEqual([key])
  })

  test('create content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const cid = await centralizedPinnerProvider.create(did, key, content)

    const expectedCid = await ipfsHash.of(Buffer.from(content))

    expect(cid).toEqual(expectedCid)
  })

  test('get content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const id = await centralizedPinnerProvider.create(did, key, content)

    const retrievedContent = await centralizedPinnerProvider.get(did, key)

    expect(retrievedContent).toEqual([{ id, content }])
  })

  test('update content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const id = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const anotherContent = 'another'
    const newCid = await centralizedPinnerProvider.update(did, key, anotherContent)

    // should get proper content
    const retrievedNewContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedNewContent).toEqual([{ id: newCid, content: anotherContent }])
  })

  test('delete content', async () => {
    const key = getRandomString()
    const content = getRandomString()

    const id = await centralizedPinnerProvider.create(did, key, content)

    // should get proper content
    const retrievedContent = await centralizedPinnerProvider.get(did, key)
    expect(retrievedContent).toEqual([{ id, content }])

    const deleted = await centralizedPinnerProvider.delete(did, key)

    expect(deleted).toBeTruthy()
  })
})
