import IpfsHttpClient from 'ipfs-http-client'
import { IpfsPinner } from '../src'
import { createSqliteConnection, deleteDatabase, getRandomString, resetDatabase } from './util'
import { Connection, Repository } from 'typeorm'
import { IpfsPinnedCid } from '../src/entities'

const database = './ipfs-pinner-provider.ipfsPinner.test.sqlite'

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

    // check that it has been saved in the db
    const found = await repository.findOne({ where: { cid: path } })

    expect(found.cid).toEqual(path)
  })

  test('should unpin a cid and remove it from the db', async () => {
    const content = getRandomString()
    const { path } = await ipfsHttpClient.add(Buffer.from(content))

    const pinned = await ipfsPinner.pin(path)
    expect(pinned).toBeTruthy()

    // check that it has been saved in the db
    const found = await repository.findOne({ where: { cid: path } })
    expect(found.cid).toEqual(path)

    const unpinned = await ipfsPinner.unpin(path)
    expect(unpinned).toBeTruthy()

    // check that it has been removed from the db
    const notFound = await repository.findOne({ where: { cid: path } })
    expect(notFound).toBeFalsy()
  })
})
