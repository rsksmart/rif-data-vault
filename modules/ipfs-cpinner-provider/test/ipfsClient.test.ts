import IpfsHttpClient from 'ipfs-http-client'
import { IpfsClient } from '../src'
import { getRandomString } from './util'
import ipfsHash from 'ipfs-only-hash'
import { DEFAULT_IPFS_API } from '../src/constants'

describe('ipfs client', function (this: {
  ipfsHttpClient,
  ipfsClient: IpfsClient
}) {
  beforeAll(() => {
    this.ipfsHttpClient = IpfsHttpClient({ url: DEFAULT_IPFS_API })
  })

  beforeEach(() => {
    this.ipfsClient = new IpfsClient(this.ipfsHttpClient)
  })

  test('should put a new file', async () => {
    const content = getRandomString()
    const cid = await this.ipfsClient.put(content)

    expect(cid).toBeTruthy()

    const expectedCid = await ipfsHash.of(Buffer.from(content))
    expect(cid).toEqual(expectedCid)
  })

  test('should get a file', async () => {
    const content = getRandomString()
    const cid = await this.ipfsClient.put(content)

    expect(cid).toBeTruthy()

    const retrievedContent = await this.ipfsClient.get(cid)
    expect(retrievedContent).toEqual(content)
  })
})
