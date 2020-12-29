export type LoginResponse = { accessToken: string, refreshToken: string }

export type PersonalSign = (data: string) => Promise<string>

export interface KeyValueStore {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

export type DIDAuthServiceConfig = {
  did?: string
  serviceUrl: string
  // TODO: unused, if we verify challenge request we should use it to assert signer, otherwise remove it
  // serviceDid?: string
}

export type DIDAuthClientConfig = {
  personalSign?: PersonalSign
}

export type DIDAuthStoreConfig = {
  store?: KeyValueStore
}

export type DIDAuthConfig = DIDAuthServiceConfig & DIDAuthClientConfig & DIDAuthStoreConfig
