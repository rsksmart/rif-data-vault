export interface Web3Provider {
  request(args: { method: 'eth_accounts' }): Promise<string[]>
  request(args: { method: 'personal_sign', params: string[] }): Promise<string>
}
