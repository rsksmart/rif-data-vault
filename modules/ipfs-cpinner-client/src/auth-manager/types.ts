export type LoginResponse = { accessToken: string, refreshToken: string }

export type RPCPersonalSignFn = (data: string) => Promise<string>

export interface ClientKeyValueStorage {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

export type Config = {
  serviceUrl: string
  serviceDid?: string
  did?: string
  rpcPersonalSign?: RPCPersonalSignFn
  storage?: ClientKeyValueStorage
}
