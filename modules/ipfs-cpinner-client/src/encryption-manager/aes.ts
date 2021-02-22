import HmacSHA256 from 'crypto-js/hmac-sha256'
import HmacSHA512 from 'crypto-js/hmac-sha512'
import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'
import encHex from 'crypto-js/enc-hex'
import ModeCTR from 'crypto-js/mode-ctr'
import WordArray from 'crypto-js/lib-typedarrays'
import { Web3Provider } from '../web3provider/types'

export const generateKeyViaRPC = (provider: Web3Provider, account: string) => provider.request({
  method: 'personal_sign', params: [account, 'The website wants permission to access and manage your data vault']
}).then(sig => provider.request({
  // make sure the wallet signing is deterministic
  method: 'personal_sign', params: [account, 'The website wants permission to access and manage your data vault']
}).then(sig2 => {
  if (sig2 !== sig) throw new Error('Sorry, your wallet does not support encryption. You cannot access your Data Vault')
  // Check the size of r and s - // 0x r(32) s(32) v(1)
  if (sig.length !== 132) throw new Error('Sorry, your wallet does not support encryption. You cannot access your Data Vault')
  const r = sig.slice(2, 66)
  const s = sig.slice(66, 130)

  return HmacSHA512(r, s).toString()
})
).then(hmac => ({
  // split the resulting string in half, and use one half as
  // the encryption key and the other half as hmac secret
  key: hmac.substring(0, 64),
  macKey: hmac.substring(64, 128)
}))

export const encrypt = (key, message, macKey) => {
  const iv = encHex.stringify(WordArray.random(16))

  const c = AES.encrypt(message, key, { iv: iv, mode: ModeCTR }).toString()
  // do a MAC preventing padding oracle attacks
  const m = HmacSHA256(iv + c, macKey).toString()

  return iv + c + m
}

export const decrypt = (key, cipher, macKey) => {
  const iv = cipher.substring(0, 32)
  const c = cipher.substring(32, cipher.length - 64)
  const m = cipher.substring(cipher.length - 64)

  const calculatedM = HmacSHA256(iv + c, macKey).toString()

  if (calculatedM !== m) {
    throw new Error('Decryption failed. Corrupted message.')
  }

  return AES.decrypt(c, key, { iv: iv, mode: ModeCTR }).toString(encUtf8)
}
