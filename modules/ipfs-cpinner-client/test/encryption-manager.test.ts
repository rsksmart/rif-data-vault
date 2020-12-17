import encryptionManagerFactory from '../src/encryption-manager'
import { EthEncryptedData } from 'eth-sig-util'
import { decryptTestFn, getEncryptionPublicKeyTestFn } from './util'
import { NO_DECRYPT_FN, NO_GET_ENCRYPTION_PUBLIC_KEY_FN } from '../src/constants'

describe('', function (this: {

}) {
  describe('encrypt', () => {
    test('should return an hexa', async () => {
      const { encrypt } = encryptionManagerFactory(getEncryptionPublicKeyTestFn, decryptTestFn)
      const message = 'Hello my name is Javi'

      const encryptedHex = await encrypt(message)

      expect(encryptedHex.startsWith('0x')).toBe(true)
      expect(encryptedHex.substr(2)).toMatch(/[0-9A-Fa-f]+/)
    })

    test('should encrypt using x25519-xsalsa20-poly1305 algorithm', async () => {
      const { encrypt } = encryptionManagerFactory(getEncryptionPublicKeyTestFn, decryptTestFn)
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
      const { encrypt } = encryptionManagerFactory(mockedFn, decryptTestFn)

      const message = 'Hello world again!'

      await encrypt(message)

      expect(mockedFn.mock.calls.length).toBe(1)
    })

    test('should throw an error if no function to get the public key', async () => {
      const { encrypt } = encryptionManagerFactory(undefined, decryptTestFn)

      expect(() => encrypt('Will fail')).toThrowError(NO_GET_ENCRYPTION_PUBLIC_KEY_FN)
    })
  })

  describe('decrypt', () => {
    test('should return a decrypted string', async () => {
      const { decrypt, encrypt } = encryptionManagerFactory(getEncryptionPublicKeyTestFn, decryptTestFn)

      const content = 'This is a test'
      const encryptedHex = await encrypt(content)
      const decrypted = await decrypt(encryptedHex)

      expect(decrypted).toEqual(content)
    })

    test('should use the decrypt function provided by the user', async () => {
      const mockedFn = jest.fn(decryptTestFn)
      const { encrypt, decrypt } = encryptionManagerFactory(getEncryptionPublicKeyTestFn, mockedFn)

      const content = 'This is another test'
      const encryptedHex = await encrypt(content)
      await decrypt(encryptedHex)

      expect(mockedFn.mock.calls.length).toBe(1)
    })

    test('should throw an error if no function to decrypt', async () => {
      const { decrypt } = encryptionManagerFactory(getEncryptionPublicKeyTestFn, undefined)

      expect(() => decrypt('Will fail')).toThrowError(NO_DECRYPT_FN)
    })
  })
})
