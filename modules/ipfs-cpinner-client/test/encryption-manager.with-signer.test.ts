import EncryptionManager from '../src/encryption-manager/with-signer'
import { Provider } from './web3-provider'

describe('encryption manager with signer', () => {
  test('it should work with a web3 provider', async () => {
    const provider = new Provider(Buffer.from('a328c06ab0b21f9c385d4b52a6f05feb5936d3de16c93add8c26a368c4bb5acf', 'hex'), '0x9b1cf6bb0f560415b63d6b6a1fea05c64d619fca')
    const manager = await EncryptionManager.fromWeb3Provider(provider)

    const text = 'Hello aes'
    const cipher = await manager.encrypt(text)
    const decrypted = await manager.decrypt(cipher)

    expect(decrypted).toEqual(text)
  })
})
