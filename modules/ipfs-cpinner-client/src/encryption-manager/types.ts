export type GetEncryptionPublicKeyFn = () => Promise<string>
export type DecryptFn = (data: string) => Promise<string>

export type EncryptionManagerConfig = {
  decrypt?: DecryptFn
  getEncryptionPublicKey?: GetEncryptionPublicKeyFn
}

export interface IEncryptionManager {
  encrypt(data: string): Promise<string>
  decrypt(data: string): Promise<string>
}
