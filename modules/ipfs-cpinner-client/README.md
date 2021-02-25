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

- Encrypts content using the user wallet prior to save it in the service - if `getEncryptionPublicKey` function provided

- If retrieving an encrypted content, it decrypts it in the user wallet prior to return it - if proper `decrypt` function provided

## Quick Usage

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const serviceUrl = 'http://your-ipfs-cpinner-service.com'

// the following fields are required just to perform write operations
const serviceDid = 'did:ethr:rsk:0x123456789....abc'
const address = '0xabcdef....123' // user's address
const did = `did:ethr:rsk:${address}`

// these are examples with Metamask
const personalSign = (data: string) => window.ethereum.request({ method: 'personal_sign', params: [data, address] })
const decrypt = (hexCypher: string) => window.ethereum.request({ method: 'eth_decrypt', params: [hexCypher, address] })
const getEncryptionPublicKey = () => window.ethereum.request.request({ method: 'eth_getEncryptionPublicKey', params: [address] })

const client = new DataVaultWebClient({
  serviceUrl,
  authManager: new AuthManager({ did, serviceUrl, personalSign }),
  encryptionManager: new EncryptionManager({ getEncryptionPublicKey, decrypt  })
})
```

> Note: this approach use the browser `localStorage` as the package store. Please refer to the [documentation](https://developers.rsk.co/rif/identity/data-vault/architecture/client/) to check custom storage options.

### Get

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, decrypt, did, rpcPersonalSign })

const key = 'EmailCredential'

const credentials = await client.get({ did, key })
```

### Get keys

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, rpcPersonalSign, serviceDid })

const keys = await client.getKeys()
```

### Get storage information

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, rpcPersonalSign, serviceDid })

const storage = await client.getStorageInformation()

console.log(`Used: ${storage.used}`)
console.log(`Available: ${storage.available}`)
```

### Get backup information

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, rpcPersonalSign, serviceDid })

const backup = await client.getBackup()

console.log('This is the keys and cids you have stored in the DV')
console.log(backup)
```

### Create

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, rpcPersonalSign, serviceDid, getEncryptionPublicKey })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.create({ key, content })
```

### Swap

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, rpcPersonalSign, serviceDid, getEncryptionPublicKey })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.swap({ key, content })
```

### Delete

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, rpcPersonalSign, serviceDid })

const key = 'MyKey'

await client.delete({ key })
```

## Advanced usage 

See our [documentation](https://developers.rsk.co/rif/identity/data-vault/architecture/client/)

## Open work

- Encrypt/decrypt content prior to save or after retrieving it from the service

## Test

From base repo directory run `npm test` or any of the described [test script variants](../../README#test).
