import IpfsHttpClient from 'ipfs-http-client'
import { IpfsClient } from '../src'
import { getRandomString } from './util'
import ipfsHash from 'ipfs-only-hash'

describe('ipfs client', () => {
  let ipfsHttpClient
  let ipfsClient: IpfsClient

  beforeAll(() => {
    ipfsHttpClient = IpfsHttpClient({ url: 'http://localhost:5001' })
  })

  beforeEach(() => {
    ipfsClient = new IpfsClient(ipfsHttpClient)
  })

  test('should put a new file', async () => {
    const content = getRandomString()
    const cid = await ipfsClient.put(content)

    expect(cid).toBeTruthy()

    const expectedCid = await ipfsHash.of(Buffer.from(content))
    expect(cid).toEqual(expectedCid)
  })

  test('should get a file', async () => {
    const content = getRandomString()
    const cid = await ipfsClient.put(content)

    expect(cid).toBeTruthy()

    const retrievedContent = await ipfsClient.get(cid)
    expect(retrievedContent).toEqual(content)
  })
})
