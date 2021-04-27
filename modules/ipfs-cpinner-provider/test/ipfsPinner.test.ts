import IpfsHttpClient from 'ipfs-http-client'
import { IpfsPinnedCid, IpfsPinner } from '../src'
import { createSqliteConnection, deleteDatabase, getRandomString, resetDatabase } from './util'
import { Connection, Repository } from 'typeorm'
import all from 'it-all'
import { DEFAULT_IPFS_API } from '../src/constants'

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

describe('ipfs pinner', function (this: {
  ipfsHttpClient
  ipfsPinner: IpfsPinner
  dbConnection: Connection
  repository: Repository<IpfsPinnedCid>
}) {
  beforeAll(async () => {
    this.ipfsHttpClient = IpfsHttpClient({ url: DEFAULT_IPFS_API })
    this.dbConnection = await createSqliteConnection(database)
  })

  beforeEach(async () => {
    this.repository = this.dbConnection.getRepository(IpfsPinnedCid)
    this.ipfsPinner = new IpfsPinner(this.ipfsHttpClient, this.repository)

    await resetDatabase(this.dbConnection)
  })

  afterAll(() => deleteDatabase(this.dbConnection, database))

  test('should pin a cid and add it to db', async () => {
    const content = getRandomString()
    const { path } = await this.ipfsHttpClient.add(Buffer.from(content))

    const pinned = await this.ipfsPinner.pin(path)
    expect(pinned).toBeTruthy()

    const ipfsResult = await getPinnedCidFactory(this.ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(1)

    // check that it has been saved in the db
    const found = await this.repository.findOne({ where: { cid: path } })

    expect(found.cid).toEqual(path)
    expect(found.count).toEqual(1)
  })

  test('should unpin a cid and remove it from the db', async () => {
    const content = getRandomString()
    const { path } = await this.ipfsHttpClient.add(Buffer.from(content))

    const pinned = await this.ipfsPinner.pin(path)
    expect(pinned).toBeTruthy()

    // check that it has been saved in the db
    const found = await this.repository.findOne({ where: { cid: path } })
    expect(found.cid).toEqual(path)
    expect(found.count).toEqual(1)

    const unpinned = await this.ipfsPinner.unpin(path)
    expect(unpinned).toBeTruthy()

    // check that it has been removed from the db
    const notFound = await this.repository.findOne({ where: { cid: path } })
    expect(notFound).toBeFalsy()

    const ipfsResult = await getPinnedCidFactory(this.ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(0)
  })

  test('should not unpin a cid if it has been pinned more than once', async () => {
    const content = getRandomString()
    const { path } = await this.ipfsHttpClient.add(Buffer.from(content))

    await this.ipfsPinner.pin(path)
    await this.ipfsPinner.pin(path)

    // check that it has been saved in the db
    let pinned = await this.repository.findOne({ where: { cid: path } })
    expect(pinned.count).toEqual(2)

    let ipfsResult = await getPinnedCidFactory(this.ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(1)

    const unpinned = await this.ipfsPinner.unpin(path)
    expect(unpinned).toBeTruthy()

    // check that the count has been decreased
    pinned = await this.repository.findOne({ where: { cid: path } })
    expect(pinned.count).toEqual(1)

    // check that the cid is still pinned
    ipfsResult = await getPinnedCidFactory(this.ipfsHttpClient)(path)
    expect(ipfsResult).toHaveLength(1)
  })
})
