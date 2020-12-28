import { DIDAuthConfig } from './auth-manager/types'
import { EncryptionManagerConfig } from './encryption-manager/types'

export type GetContentPayload = { did: string, key: string }
export type GetContentResponsePayload = { id: string, content: string }
export type CreateContentPayload = { key: string, content: string }
export type CreateContentResponse = { id: string }
export type DeleteTokenPayload = { key: string, id?: string }
export type SwapContentPayload = { key: string, content: string, id?: string }
export type SwapContentResponse = { id: string }
export type StorageInformation = { used: number, available: number }

export type Config = DIDAuthConfig & EncryptionManagerConfig
