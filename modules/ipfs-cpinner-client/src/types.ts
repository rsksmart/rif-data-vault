export type GetContentPayload = { did: string, key: string }
export type GetContentResponsePayload = { id: string, content: string }
export type CreateContentPayload = { key: string, content: string }
export type CreateContentResponse = { id: string }
export type LoginResponse = { accessToken: string, refreshToken: string }
export type DeleteTokenPayload = { key: string, id?: string }
export type SwapContentPayload = { key: string, content: string, id?: string }
export type SwapContentResponse = { id: string }
export type StorageInformation = { used: number, available: number }

export interface ClientKeyValueStorage {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

export interface EncryptionManager {
  encrypt(data: string): Promise<string>
  decrypt(data: string): Promise<string>
}

export type GetEncryptionPublicKeyFn = () => Promise<string>
export type DecryptFn = (data: string) => Promise<string>
type RPCPersonalSignFn = (data: string) => Promise<string>

export type Config = {
  serviceUrl: string
  serviceDid?: string
  did?: string
  rpcPersonalSign?: RPCPersonalSignFn
  decrypt?: DecryptFn
  getEncryptionPublicKey?: GetEncryptionPublicKeyFn
  storage?: ClientKeyValueStorage
}
