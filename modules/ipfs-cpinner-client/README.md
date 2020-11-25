<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle"><code>@rsksmart/ipfs-cpinner-client</code></h3>
<p align="middle">
    RIF Identity - IPFS Centralized Pinner Client
</p>
<p align="middle">
  <a href="https://rsksmart.github.io/rif-identity-docs/data-vault/cpinner/cpinner-client">
    <img src="https://img.shields.io/badge/-docs-brightgreen" alt="docs" />
  </a>
</p>

A Web Client to simplify the way the services provided by the IPFS Centralized Data Vault Service are consumed.

## Features

- Manage authentication according to the [DID Auth protocol](https://rsksmart.github.io/rif-identity-docs/ssi/libraries/express-did-auth)

- CRUD operations over the RIF Data Vault

- Stores the authentication credentials in the given storage 

## Quick Usage

```typescript
import DataVaultWebClient, { ClientKeyValueStorage } from '@rsksmart/ipfs-cpinner-client'

const serviceUrl = 'http://your-ipfs-cpinner-service.com'
const storage: ClientKeyValueStorage = myCustomStorage

// the following fields are required just to perform write operations
const serviceDid = 'did:ethr:rsk:0x123456789....abc'
const address = '0xabcdef....123' // user's address
const did = `did:ethr:rsk:${address}`
const signer = (data: string) => window.ethereum.request({ method: 'personal_sign', params: [address, data] }) // this is an example with Metamask

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid, storage })
```

### Get

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl })

const key = 'EmailCredential'

const credentials = await client.get({ did, key })
```

### Create

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.create({ key, content })
```

### Swap

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.swap({ key, content })
```

### Delete

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'

await client.delete({ key })
```

## Advanced usage 

See our [documentation](https://rsksmart.github.io/rif-identity-docs/data-vault/cpinner/cpinner-client)

## Open work

- Encrypt/decrypt content prior to save or after retrieving it from the service

## Test

From base repo directory run `npm test` or any of the described [test script variants](../../README#test).
