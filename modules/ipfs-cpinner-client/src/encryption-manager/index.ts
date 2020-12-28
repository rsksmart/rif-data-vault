import { encrypt as ethEncrypt } from 'eth-sig-util'
import { Web3Provider } from '../web3provider/types'
import { DecryptFn, EncryptionManagerConfig, GetEncryptionPublicKeyFn } from './types'

class EncryptionManager {
  getEncryptionPublicKey: GetEncryptionPublicKeyFn
  public decrypt: DecryptFn
  constructor ({ getEncryptionPublicKey, decrypt }: EncryptionManagerConfig) {
    this.getEncryptionPublicKey = getEncryptionPublicKey
    this.decrypt = decrypt
  }

  public encrypt = (data: string): Promise<string> => this.getEncryptionPublicKey()
    .then(publicKey => ethEncrypt(publicKey, { data }, 'x25519-xsalsa20-poly1305'))
    .then(cipher => `0x${Buffer.from(JSON.stringify(cipher), 'utf8').toString('hex')}`)

  static fromWeb3Provider (provider: Web3Provider) {
    return provider.request({
      method: 'eth_accounts'
    }).then(accounts => new EncryptionManager({
      getEncryptionPublicKey: () => provider.request({
        method: 'eth_getEncryptionPublicKey',
        params: [accounts[0]]
      }),
      decrypt: (cipher: string) => provider.request({
        method: 'eth_decrypt',
        params: [cipher, accounts[0]]
      })
    }))
  }
}

export default EncryptionManager
