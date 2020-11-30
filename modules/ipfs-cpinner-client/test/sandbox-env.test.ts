import DataVaultWebClient from '../src'
import { identityFactory } from './util'
import localStorageMockFactory from './localStorageMockFactory'

jest.setTimeout(12000)

// this are integration tests

describe('sandbox environment', function (this: {
  did: string
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did
    const rpcPersonalSign = clientIdentity.rpcPersonalSign

    // COMPLETE WITH YOUR SANDBOX ENVIRONMENT VALUES
    const serviceDid = 'did:ethr:rsk:testnet:0x285B30492a3F444d78f75261A35cB292Fc8F41A6'
    const serviceUrl = 'http://ec2-3-131-142-122.us-east-2.compute.amazonaws.com:5107'

    return new DataVaultWebClient({ serviceUrl, did: this.did, rpcPersonalSign, serviceDid })
  }

  beforeEach(() => { global.localStorage = localStorageMockFactory() })

  test('should create a content', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.create({ key, content })

    expect(id).toBeTruthy()
  })

  test('should get all keys', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    await client.create({ key, content })

    const keys = await client.getKeys()

    expect(keys).toEqual([key])
  })

  test('should get a content', async () => {
    const client = await setup()

    const key = `AKey${Date.now()}`
    const content = `the content ${Date.now()}`

    await client.create({ key, content })

    const values = await client.get({ did: this.did, key })

    expect(values).toEqual([content])
  })

  test('should swap content', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    const { id } = await client.swap({ key, content })

    expect(id).toBeTruthy()
  })

  test('should delete content', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    await client.create({ key, content })
    const deleted = await client.delete({ key })

    expect(deleted).toBeTruthy()
  })
})
