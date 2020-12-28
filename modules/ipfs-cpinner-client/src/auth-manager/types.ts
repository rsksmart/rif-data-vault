export type LoginResponse = { accessToken: string, refreshToken: string }

export type PersonalSign = (data: string) => Promise<string>

export interface KeyValueStore {
  get (key: string): Promise<string>
  set (key: string, value: string): Promise<void>
}

export type DIDAuthConfig = {
  did: string
  serviceUrl: string
  // TODO: unused, if we verify challenge request we should use it to assert signer, otherwise remove it
  // serviceDid?: string
  personalSign: PersonalSign
  store?: KeyValueStore
}
