<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle"><code>@rsksmart/ipfs-cpinner-provider</code></h3>
<p align="middle">
    RIF Identity - IPFS Centralized Pinner Provider
</p>
<p align="middle">
  <a href="https://rsksmart.github.io/rif-identity-docs/data-vault/cpinner/cpinner-provider">
    <img src="https://img.shields.io/badge/-docs-brightgreen" alt="docs" />
  </a>
  <a href="https://badge.fury.io/js/%40rsksmart%2Fipfs-pinner-provider">
    <img src="https://badge.fury.io/js/%40rsksmart%2Fipfs-pinner-provider.svg" alt="npm" />
  </a>
</p>

```
npm i @rsksmart/ipfs-cpinner-provider
```

A Centralized Data Vault provider compatible with RIF Data Vault standard interface. It stores content in an IPFS node associated to a given DID and key.

### Basic instance

Plug and play configuration

```typescript=
import { ipfsPinnerProviderFactory, IpfsPinnedCid, IpfsMetadata } from '@rsksmart/ipfs-cpinner-provider'
import { createConnection } from 'typeorm'

const ipfsApiUrl = 'http://localhost:5001'
const maxStorage = 2000000 // 2 mb

const database = 'my-ipfs-pinner-provider.sqlite'
const Entities = [IpfsPinnedCid, IpfsMetadata]

const dbConnection = await createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

const ipfsPinnerProvider = await ipfsPinnerProviderFactory({ dbConnection, ipfsApiUrl, maxStorage })
// NOTE: ipfsApiUrl is optional. Default value is: 'http://localhost:5001'
// NOTE: maxStorage is optional. Default value is: 1000000 // 1 mb

```

### Usage

```typescript=
const did = 'did:ethr:rsk:12345678'
const key = 'the key'
const content = 'the content'

const cid: string = await ipfsPinnerProvider.create(did, key, content)

const files: { id: string, content: string }[] = await ipfsPinnerProvider.get(did, key)

const keys: string[] = await ipfsPinnerProvider.getKeys(did)

const newCid: string = await ipfsPinnerProvider.swap(did, key, 'the new content')

const anotherCid: string = await ipfsPinnerProvider.swap(did, key, 'the new content', newCid) // cid can be specified if there is more than one content associated to the given did and key

const deleted: boolean = await ipfsPinnerProvider.delete(did, key)

const deleted: boolean = await ipfsPinnerProvider.delete(did, key, cid) // cid can be specified if there is more than one content associated to the given did and key

const availableStorage: number = await ipfsPinnerProvider.getAvailableStorage(did) // return the amount of bytes available to store value associated to the given did

const usedStorage: number = await ipfsPinnerProvider.getUsedStorage(did) // return the amount of bytes used to store value associated to the given did

const didBackup: Backup = await ipfsPinnerProvider.getBackup(did) // return an array containing all the keys and cids created by the given did
```

See our [documentation](https://developers.rsk.co/rif/identity/) for advanced usage.

## Test

From base repo directory run `npm test` or any of the described [test script variants](../../README#test).
