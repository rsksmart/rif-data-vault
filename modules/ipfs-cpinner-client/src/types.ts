export type GetKeysPayload = { did: string }
export type GetContentPayload = { did: string, key: string }
export type CreateContentPayload = { key: string, content: string }
export type CreateContentResponse = { id: string }
export type LoginResponse = { accessToken: string, refreshToken: string }
export type DeleteTokenPayload = { key: string, id?: string }
export type SwapContentPayload = { key: string, content: string, id?: string }
export type SwapContentResponse = { id: string }

export interface ClientKeyValueStorage {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

export interface AuthenticationManager {
  login(): Promise<LoginResponse>
  refreshAccessToken(): Promise<LoginResponse>
}

export type Config = {
  serviceUrl: string
  serviceDid?: string
  did?: string
  rpcPersonalSign?: (data: string) => Promise<string>
  storage?: ClientKeyValueStorage
}
