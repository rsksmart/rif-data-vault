import { KeyValueStore } from '@rsksmart/ipfs-cpinner-client-types/lib/auth-manager/types'

export class LocalStorage implements KeyValueStore {
  public get = (key: string) => Promise.resolve(localStorage.getItem(key))
  public set = (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value))
}
