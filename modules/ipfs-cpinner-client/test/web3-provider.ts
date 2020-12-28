import { Web3Provider } from '../src/web3provider/types'
import { createPersonalSign } from './util'

export class Provider implements Web3Provider {
  privateKey: Buffer
  account: string

  constructor (privateKey: Buffer, account: string) {
    this.privateKey = privateKey
    this.account = account
  }

  request ({ method, params }): any {
    if (method === 'eth_accounts') return Promise.resolve([this.account])
    if (method === 'personal_sign') {
      const personalSign = createPersonalSign(this.privateKey)
      if (params[0] === this.account) return Promise.resolve(personalSign(params[1]))
      else throw new Error('Invalid account')
    }
    throw new Error('Invalid method')
  }
}
