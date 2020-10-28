import { ipfsPinnerProviderFactory, Entities } from '@rsksmart/ipfs-pinner-provider'
import { setupDataVault } from '../src/data-vault'
import request from 'supertest'
import { deleteDatabase } from '../../../packages/ipfs-cpinner-provider/test/util'
import { createConnection } from 'typeorm'

const createSqliteConnection = (database: string) => createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

describe('GET', () => {
  test('should return content associated to an existing key', async () => {
    const key = 'ExistingKey'
    const content = 'This is the content'
    const did = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70'

    const ipfsApi = 'http://localhost:5001'
    const database = 'my-tdd.sqlite'
    const connection = await createSqliteConnection(database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory(connection, ipfsApi)

    await ipfsPinnerProvider.create(did, key, content)

    const app = setupDataVault(ipfsPinnerProvider)

    const { body } = await request(app).get(`/${did}/${key}`).expect(200)

    expect(body.content).toEqual([content])

    await deleteDatabase(connection, database)
  })

  test('2', async () => {
    const key = 'ExistingKey'
    const content = 'This is another content'
    const did = 'did:ethr:rsk:testnet:0xce83da2a364f37e44ec1a17f7f453a5e24395c70'

    const ipfsApi = 'http://localhost:5001'
    const database = 'my-tdd2.sqlite'
    const connection = await createSqliteConnection(database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory(connection, ipfsApi)

    await ipfsPinnerProvider.create(did, key, content)

    const app = setupDataVault(ipfsPinnerProvider)

    const { body } = await request(app).get(`/${did}/${key}`).expect(200)

    expect(body.content).toEqual([content])

    await deleteDatabase(connection, database)
  })

  test('3', async () => {
    const key = 'ExistingKey'
    const content = 'This is another content for another did'
    const did = 'did:ethr:rsk:testnet:0x1234567890abcdef'

    const ipfsApi = 'http://localhost:5001'
    const database = 'my-tdd3.sqlite'
    const connection = await createSqliteConnection(database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory(connection, ipfsApi)

    await ipfsPinnerProvider.create(did, key, content)

    const app = setupDataVault(ipfsPinnerProvider)

    const { body } = await request(app).get(`/${did}/${key}`).expect(200)

    expect(body.content).toEqual([content])

    await deleteDatabase(connection, database)
  })

  test('4', async () => {
    const key = 'ExistingKey'
    const content1 = 'This is content one'
    const content2 = 'This is content two'
    const did = 'did:ethr:rsk:testnet:0x1234567890abcdef'

    const ipfsApi = 'http://localhost:5001'
    const database = 'my-tdd4.sqlite'
    const connection = await createSqliteConnection(database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory(connection, ipfsApi)

    await ipfsPinnerProvider.create(did, key, content1)
    await ipfsPinnerProvider.create(did, key, content2)

    const app = setupDataVault(ipfsPinnerProvider)

    const { body } = await request(app).get(`/${did}/${key}`).expect(200)

    expect(body.content).toEqual([content1, content2])

    await deleteDatabase(connection, database)
  })

  test('5', async () => {
    const key = 'ExistingKey'
    const did = 'did:ethr:rsk:testnet:0x1234567890abcdef'

    const ipfsApi = 'http://localhost:5001'
    const database = 'my-tdd4.sqlite'
    const connection = await createSqliteConnection(database)
    const ipfsPinnerProvider = await ipfsPinnerProviderFactory(connection, ipfsApi)

    const app = setupDataVault(ipfsPinnerProvider)

    const { body } = await request(app).get(`/${did}/${key}`).expect(200)

    expect(body.content).toEqual([])

    await deleteDatabase(connection, database)
  })
})
