import { EthEncryptedData } from 'eth-sig-util'
import { decryptTestFn, getEncryptionPublicKeyTestFn } from './util'
import EncryptionManager from '../src/encryption-manager'
import { Provider } from './web3-provider'

describe('encrypt', () => {
  test('should return an hexa', async () => {
    const { encrypt } = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    })
    const message = 'Hello my name is Javi'

    const encryptedHex = await encrypt(message)

    expect(encryptedHex.startsWith('0x')).toBe(true)
    expect(encryptedHex.substr(2)).toMatch(/[0-9A-Fa-f]+/)
  })

  test('should encrypt using x25519-xsalsa20-poly1305 algorithm', async () => {
    const { encrypt } = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    })
    const message = 'Hello world!'

    const encryptedHex = await encrypt(message)

    const cipher: EthEncryptedData = JSON.parse(Buffer.from(encryptedHex.substr(2), 'hex').toString('utf8'))

    expect(cipher.version).toEqual('x25519-xsalsa20-poly1305')
    expect(cipher.nonce).toBeTruthy()
    expect(cipher.ephemPublicKey).toBeTruthy()
    expect(cipher.ciphertext).toBeTruthy()
  })

  test('should request for the user encryption public key', async () => {
    const mockedFn = jest.fn(getEncryptionPublicKeyTestFn)
    const { encrypt } = new EncryptionManager({
      getEncryptionPublicKey: mockedFn,
      decrypt: decryptTestFn
    })

    const message = 'Hello world again!'

    await encrypt(message)

    expect(mockedFn.mock.calls.length).toBe(1)
  })

  test('should throw an error if no function to get the public key', async () => {
    const { encrypt } = new EncryptionManager({
      getEncryptionPublicKey: undefined,
      decrypt: decryptTestFn
    })

    expect(() => encrypt('Will fail')).toThrowError()
  })
})

describe('decrypt', () => {
  test('should return a decrypted string', async () => {
    const { encrypt, decrypt } = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: decryptTestFn
    })

    const content = 'This is a test'
    const encryptedHex = await encrypt(content)
    const decrypted = await decrypt(encryptedHex)

    expect(decrypted).toEqual(content)
  })

  test('should use the decrypt function provided by the user', async () => {
    const mockedFn = jest.fn(decryptTestFn)
    const { encrypt, decrypt } = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: mockedFn
    })

    const content = 'This is another test'
    const encryptedHex = await encrypt(content)
    await decrypt(encryptedHex)

    expect(mockedFn.mock.calls.length).toBe(1)
  })

  test('should throw an error if no function to decrypt', async () => {
    const { decrypt } = new EncryptionManager({
      getEncryptionPublicKey: getEncryptionPublicKeyTestFn,
      decrypt: undefined
    })

    expect(() => decrypt('Will fail')).toThrowError()
  })

  test('should create auth manager from web3 provider', async () => {
    const provider = new Provider(null, null)
    const encryptionManager = await EncryptionManager.fromWeb3Provider(provider)

    const message = 'Web3 provider'
    const cipher = await encryptionManager.encrypt(message)
    const recovered = await encryptionManager.decrypt(cipher)

    expect(recovered).toEqual(message)
  })
})
