import { encrypt as ethEncrypt } from 'eth-sig-util'
import { NO_DECRYPT_FN, NO_GET_ENCRYPTION_PUBLIC_KEY_FN } from './constants'
import { DecryptFn, EncryptionManager, GetEncryptionPublicKeyFn } from './types'

export default (getEncryptionPublicKey: GetEncryptionPublicKeyFn, decryptFn: DecryptFn): EncryptionManager => {
  return {
    encrypt: (data: string): Promise<string> => {
      if (!getEncryptionPublicKey) throw new Error(NO_GET_ENCRYPTION_PUBLIC_KEY_FN)

      return getEncryptionPublicKey()
        .then(publicKey => ethEncrypt(publicKey, { data }, 'x25519-xsalsa20-poly1305'))
        .then(cipher => `0x${Buffer.from(JSON.stringify(cipher), 'utf8').toString('hex')}`)
    },

    decrypt: (hexa: string): Promise<string> => {
      if (!decryptFn) throw new Error(NO_DECRYPT_FN)
      return decryptFn(hexa)
    }
  }
}
