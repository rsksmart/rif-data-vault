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

**It is strongly recommend to encrypt the content saved in IPFS using this package.**

## Features

- Stores, retrieve, deletes and swaps content from/in an IPFS node
- Associates did -> key -> cid in a SQLite local DB so it is not needed to remember the added cid
- Pins and unpins cids in the given IPFS node

## Usage

The IPFS Centralized pinner provider was designed to use in Centralized pinner service but can be used as standalone

### Set up IPFS

First of all you need to have access to an IPFS node API. To run it locally:

1. Install IPFS CLI. Find your option: https://docs.ipfs.io/how-to/command-line-quick-start/.

2. Init IPFS (once)

  ```
  ipfs init
  ```

3. Start IPFS Daemon

  ```
  ipfs daemon
  ```

  This will expose the IPFS API in `http://localhost:5001`

### Basic instance

Plug and play configuration

```typescript=
import { ipfsPinnerProviderFactory } from '@rsksmart/ipfs-cpinner-provider'

const ipfsApi = 'http://localhost:5001'
const database = 'my-ipfs-pinner-provider.sqlite'

const ipfsPinnerProvider = await ipfsPinnerProviderFactory(ipfsApi, database)
// NOTE: ipfsApi and database are optional params. Defaults are: 'http://localhost:5001' and 'ipfsPinnerProvider.sqlite'
```

### Advanced instance

This allows to configure the `ipfs-http-client` and set the DB connection with the desired configuration

```typescript=
import { createConnection } from 'typeorm'
import IpfsHttpClient from 'ipfs-http-client'
import IpfsPinnerProvider, { IpfsClient, IpfsPinner, MetadataManager, Entities, IpfsMetadata, IpfsPinnedCid } from '@rsksmart/ipfs-cpinner-provider'

// ipfs config
const ipfsConfig = { ...yourConfig, url: 'http://localhost:5001' } // refer to https://www.npmjs.com/package/ipfs-http-client
const ipfsHttpClient = IpfsHttpClient(ipfsConfig) 

// db config
const database = 'my-ipfs-pinner-database.sqlite'
const dbConnection = await createConnection({
  type: 'sqlite',
  database,
  entities: Entities,
  logging: false,
  dropSchema: true,
  synchronize: true
})

const pinnedCidsRepository = dbConnection.getRepository(IpfsPinnedCid)
const metadataRepository = dbConnection.getRepository(IpfsMetadata)

// set dependencies to inject
const ipfsClient = new IpfsClient(ipfsHttpClient)
const ipfsPinner = new IpfsPinner(ipfsHttpClient, pinnedCidsRepository)
const metadataManager = new MetadataManager(metadataRepository)

const IpfsPinnerProvider = new IpfsPinnerProvider(ipfsClient, metadataManager, ipfsPinner)
```

### Usage

```typescript=
const did = 'did:ethr:rsk:12345678'
const key = 'the key'
const content = 'the content'

const cid: string = await ipfsPinnerProvider.put(did, key, content)

const cids: string[] = await ipfsPinnerProvider.get(did, key)

const newCid: string = await ipfsPinnerProvider.swap(did, key, 'the new content')

const anotherCid: string = await ipfsPinnerProvider.swap(did, key, 'the new content', newCid) // cid can be specified if there is more than one content associated to the given did and key

const deleted: boolean = await ipfsPinnerProvider.delete(did, key)

const deleted: boolean = await ipfsPinnerProvider.delete(did, key, cid) // cid can be specified if there is more than one content associated to the given did and key
```

## Test

From base repo directory run `npm test` or any of the described [test script variants](../../README#test).
