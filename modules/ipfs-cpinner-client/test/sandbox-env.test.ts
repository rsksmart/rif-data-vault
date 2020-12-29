import DataVaultWebClient from '../src'
import { identityFactory, getEncryptionPublicKeyTestFn, decryptTestFn, customStorageFactory } from './util'
import localStorageMockFactory from './localStorageMockFactory'
import AuthManager from '../src/auth-manager'
import EncryptionManager from '../src/encryption-manager'

jest.setTimeout(12000)

// these are integration tests

describe.skip('sandbox environment', function (this: {
  did: string
}) {
  const setup = async (): Promise<DataVaultWebClient> => {
    const clientIdentity = await identityFactory()
    this.did = clientIdentity.did

    // COMPLETE WITH YOUR SANDBOX ENVIRONMENT VALUES
    // const serviceDid = ''
    const serviceUrl = ''

    return new DataVaultWebClient({
      serviceUrl,
      authManager: new AuthManager({
        did: this.did,
        serviceUrl: serviceUrl,
        personalSign: clientIdentity.personalSign,
        store: customStorageFactory()
      }),
      encryptionManager: new EncryptionManager({
        getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
        decrypt: decryptTestFn
      })
    })
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

  test('should get storage information', async () => {
    const client = await setup()

    const key = 'AKey'
    const content = 'the content'

    await client.create({ key, content })

    const storage = await client.getStorageInformation()

    expect(storage.available).toEqual(1000000 - 11)
    expect(storage.used).toEqual(11)
  })

  test('should get a content', async () => {
    const client = await setup()

    const key = `AKey${Date.now()}`
    const content = `the content ${Date.now()}`

    const { id } = await client.create({ key, content })

    const values = await client.get({ key })

    expect(values).toEqual([{ id, content }])
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
