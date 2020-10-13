import IpfsHttpClient from 'ipfs-http-client'
import { IpfsPinnedCid, IpfsPinner } from '../src'
import { createSqliteConnection, deleteDatabase, getRandomString, resetDatabase } from './util'
import { Connection, Repository } from 'typeorm'
import all from 'it-all'

const database = './ipfs-pinner-provider.ipfsPinner.test.sqlite'

const getPinnedCidFactory = (ipfsHttpClient) => async (cid: string) => {
  let pins = []
  try {
    pins = await all(ipfsHttpClient.pin.ls({ paths: [cid] }))
  } catch (err) {
    const expectedMessage = `path '${cid}' is not pinned`
    if (err.message !== expectedMessage) throw err
  }
  return pins
}

describe('ipfs pinner', () => {
  let ipfsHttpClient
  let ipfsPinner: IpfsPinner
  let dbConnection: Promise<Connection>
  let repository: Repository<IpfsPinnedCid>

  beforeAll(() => {
    ipfsHttpClient = IpfsHttpClient({ url: 'http://localhost:5001' })
    dbConnection = createSqliteConnection(database)
  })

  beforeEach(async () => {
    repository = (await dbConnection).getRepository(IpfsPinnedCid)
    ipfsPinner = new IpfsPinner(ipfsHttpClient, repository)

    await resetDatabase(dbConnection)
  })

  afterAll(async () => {
    deleteDatabase(await dbConnection, database)
  })

  test('should pin a cid and add it to db', async () => {
    const content = getRandomString()
    const { path } = await ipfsHttpClient.add(Buffer.from(content))

    const pinned = await ipfsPinner.pin(path)
    expect(pinned).toBeTruthy()

    const ipfsResult = await getPinnedCidFactory(ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(1)

    // check that it has been saved in the db
    const found = await repository.findOne({ where: { cid: path } })

    expect(found.cid).toEqual(path)
    expect(found.count).toEqual(1)
  })

  test('should unpin a cid and remove it from the db', async () => {
    const content = getRandomString()
    const { path } = await ipfsHttpClient.add(Buffer.from(content))

    const pinned = await ipfsPinner.pin(path)
    expect(pinned).toBeTruthy()

    // check that it has been saved in the db
    const found = await repository.findOne({ where: { cid: path } })
    expect(found.cid).toEqual(path)
    expect(found.count).toEqual(1)

    const unpinned = await ipfsPinner.unpin(path)
    expect(unpinned).toBeTruthy()

    // check that it has been removed from the db
    const notFound = await repository.findOne({ where: { cid: path } })
    expect(notFound).toBeFalsy()

    const ipfsResult = await getPinnedCidFactory(ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(0)
  })

  test('should not unpin a cid if it has been pinned more than once', async () => {
    const content = getRandomString()
    const { path } = await ipfsHttpClient.add(Buffer.from(content))

    await ipfsPinner.pin(path)
    await ipfsPinner.pin(path)

    // check that it has been saved in the db
    let pinned = await repository.findOne({ where: { cid: path } })
    expect(pinned.count).toEqual(2)

    let ipfsResult = await getPinnedCidFactory(ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(1)

    const unpinned = await ipfsPinner.unpin(path)
    expect(unpinned).toBeTruthy()

    // check that the count has been decreased
    pinned = await repository.findOne({ where: { cid: path } })
    expect(pinned.count).toEqual(1)

    // check that the cid is still pinned
    ipfsResult = await getPinnedCidFactory(ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(1)
  })
})
