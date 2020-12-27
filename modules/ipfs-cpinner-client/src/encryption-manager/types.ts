export interface EncryptionManager {
  encrypt(data: string): Promise<string>
  decrypt(data: string): Promise<string>
}

export type GetEncryptionPublicKeyFn = () => Promise<string>
export type DecryptFn = (data: string) => Promise<string>

export type EncryptionManagerConfig = {
  decrypt?: DecryptFn
  getEncryptionPublicKey?: GetEncryptionPublicKeyFn
}
