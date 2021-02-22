import { encrypt as ethEncrypt } from 'eth-sig-util'
import { Web3Provider } from '../web3provider/types'
import { DecryptFn, EncryptionManagerConfig, GetEncryptionPublicKeyFn } from './types'

interface IEncryptionManager {
  encrypt(data: string): Promise<string>
  decrypt(data: string): Promise<string>
}

class EncryptionManager implements IEncryptionManager {
  getEncryptionPublicKey: GetEncryptionPublicKeyFn
  private decryptInWallet: DecryptFn
  constructor ({ getEncryptionPublicKey, decrypt }: EncryptionManagerConfig) {
    this.getEncryptionPublicKey = getEncryptionPublicKey
    this.decryptInWallet = decrypt
  }

  public decrypt = (data: string): Promise<string> => {
    const hexaRegex = /^0x[0-9a-fA-F]+$/

    // if not an hexadecimal, it means it is not encrypted, return the same data
    if (!this.decryptInWallet || !hexaRegex.test(data)) return Promise.resolve(data)

    const cipherText = Buffer.from(data.substr(2), 'hex').toString('utf8')

    // we assume that if the text contains "version":"x25519-xsalsa20-poly1305", it is a cipherText that can be decrypted in a wallet.
    // more information in https://docs.metamask.io/guide/rpc-api.html#eth-getencryptionpublickey
    if (cipherText.indexOf('"version":"x25519-xsalsa20-poly1305"') > 0) return this.decryptInWallet(data)

    return Promise.resolve(data)
  }

  public encrypt = (data: string): Promise<string> => {
    if (!this.getEncryptionPublicKey) return Promise.resolve(data)

    return this.getEncryptionPublicKey()
      .then(publicKey => ethEncrypt(publicKey, { data }, 'x25519-xsalsa20-poly1305'))
      .then(cipher => `0x${Buffer.from(JSON.stringify(cipher), 'utf8').toString('hex')}`)
  }

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
