// Not all the functions are covered. The covered stuff is the one used by this package
declare module 'ipfs-http-client' {
  import CID from 'cids'
  import { Readable } from 'stream'

  export type CidAddress = CID | Buffer | string

  export type Pins = Array<string>

  export interface IpfsResult {
    path: string
    size: number
    hash: string
  }

  export interface IpfsObject {
    path: string
    content?: Buffer
  }

  export interface IpfsPinResult {
    pins: Pins
    progress: number
  }

  export interface IpfsHttpClient {
    add (data: Buffer | File | Readable): Promise<IpfsResult>
    get (path: CidAddress): AsyncGenerator<IpfsObject>
    pin: {
      ls (cid: CidAddress): Promise<IpfsPinResult[]>
      add (cid: CidAddress): Promise<IpfsPinResult>
      rm (cid: CidAddress): Promise<IpfsPinResult>
    }
  }

  export default function ipfsClient ({ url: string }): IpfsHttpClient
}
