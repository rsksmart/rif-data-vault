import { IEncryptionManager } from './types'
import { encrypt, decrypt, generateKeyViaRPC } from './aes'
import { Web3Provider } from '../web3provider/types'

class EncryptionManager implements IEncryptionManager {
  private key: string
  private macKey: string

  constructor (key: string, macKey: string) {
    this.key = key
    this.macKey = macKey
  }

  encrypt = (data: string) => {
    const cipher = encrypt(this.key, data, this.macKey)
    return Promise.resolve(Buffer.from(cipher, 'utf-8').toString('hex'))
  }

  decrypt = (data: string) => {
    const cipher = Buffer.from(data, 'hex').toString('utf-8')
    return Promise.resolve(decrypt(this.key, cipher, this.macKey))
  }

  static fromWeb3Provider = (provider: Web3Provider) =>
    provider.request({
      method: 'eth_accounts'
    }).then(accounts => generateKeyViaRPC(provider, accounts[0]))
      .then(({ key, macKey }) => new EncryptionManager(key, macKey))
}

export default EncryptionManager
