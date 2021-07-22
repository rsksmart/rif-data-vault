import { PersonalSign } from '@rsksmart/ipfs-cpinner-client-types/lib/auth-manager/types'
import { Web3Provider } from '@rsksmart/ipfs-cpinner-client-types/lib/web3provider/types'
import { createPersonalSign, getEncryptionPublicKeyTestFn, decryptTestFn } from './util'

export class Provider implements Web3Provider {
  privateKey: Buffer
  account: string
  personalSign: PersonalSign

  constructor (privateKey: Buffer, account: string) {
    this.privateKey = privateKey
    this.account = account
    this.personalSign = createPersonalSign(this.privateKey)
  }

  private validateAccount (account: string) {
    if (account !== this.account) throw new Error('Invalid account')
  }

  request ({ method, params }): any {
    if (method === 'eth_accounts') {
      return Promise.resolve([this.account])
    }
    if (method === 'personal_sign') {
      this.validateAccount(params[1])
      return Promise.resolve(this.personalSign(params[0]))
    }
    if (method === 'eth_getEncryptionPublicKey') {
      this.validateAccount(params[0])
      return getEncryptionPublicKeyTestFn()
    }
    if (method === 'eth_decrypt') {
      this.validateAccount(params[1])
      return decryptTestFn(params[0])
    }
    throw new Error('Invalid method')
  }
}
