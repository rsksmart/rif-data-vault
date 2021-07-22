import { IAuthManager } from './auth-manager/types'
import { IEncryptionManager } from './encryption-manager/types'
export * from './auth-manager/types'
export * from './encryption-manager/types'
export type GetContentPayload = { key: string }
export type GetContentResponsePayload = { id: string, content: string }
export type CreateContentPayload = { key: string, content: string }
export type CreateContentResponse = { id: string }
export type DeleteTokenPayload = { key: string, id?: string }
export type SwapContentPayload = { key: string, content: string, id?: string }
export type SwapContentResponse = { id: string }
export type StorageInformation = { used: number, available: number }
export type Backup = { key: string, id: string }[]

export type Config = {
  serviceUrl: string
  authManager?: IAuthManager
  encryptionManager: IEncryptionManager
}

export interface IIPFSCpinnerClient {
    new (config: Config);
    get({ key }: GetContentPayload): Promise<GetContentResponsePayload[]>;
    getKeys(): Promise<string[]>;
    getStorageInformation(): Promise<StorageInformation>;
    getBackup(): Promise<Backup>;
    create(payload: CreateContentPayload): Promise<CreateContentResponse>;
    delete(payload: DeleteTokenPayload): Promise<boolean | void>;
    swap(payload: SwapContentPayload): Promise<SwapContentResponse>;
}
