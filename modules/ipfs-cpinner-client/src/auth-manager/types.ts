export type LoginResponse = { accessToken: string, refreshToken: string }

export type PersonalSign = (data: string) => Promise<string>

export interface ClientKeyValueStorage {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

export type DIDAuthConfig = {
  did?: string
  serviceUrl: string
  serviceDid?: string // TODO: unused, if we verify challenge request we should use it to assert signer, otherwise remove it
  personalSign?: PersonalSign
  storage?: ClientKeyValueStorage
}
