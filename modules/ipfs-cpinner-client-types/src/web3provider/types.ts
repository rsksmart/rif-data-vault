export interface Web3Provider {
  request(args: { method: 'eth_accounts' }): Promise<string[]>
  request(args: { method: 'personal_sign', params: [data: string, account: string] }): Promise<string>
  request(args: { method: 'eth_getEncryptionPublicKey', params: [account: string] }): Promise<string>
  request(args: { method: 'eth_decrypt', params: [cipher: string, account: string] }): Promise<string>
}
