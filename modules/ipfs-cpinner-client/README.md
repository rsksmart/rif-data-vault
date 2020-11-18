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

## Usage

### Instantiate

The package expose a `DataVaultWebClient` class that receives a `Config` object when it is instantiated.

The `Config` object has the following fields:

`serviceUrl: string`: the IPFS Centralized Data Vault Service url
`serviceDid?: string`: the IPFS Centralized Data Vault Service url did. It is required if the package will be used to perform authenticated requests (Create, Swap or Delete). This field will be used to compare with the issuer of the access token.
`did?: string`: the client did. It is required if performing authenticated requests
`signer?: (data: string) => string`: the signer function associated to the client did. It is used to sign the challenge in the login process
`storage?: ClientKeyValueStorage`: object that MUST implement the `ClientKeyValueStorage` interface. It is used to save the `accessToken` and `refreshToken`. It uses [window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) if not storage object provided.

```typescript
import DataVaultWebClient, { ClientKeyValueStorage } from '@rsksmart/ipfs-cpinner-client'

const serviceUrl = 'http://your-ipfs-cpinner-service.com'
const storage: ClientKeyValueStorage = myCustomStorage

// the following fields are required just to perform write operations
const serviceDid = 'did:ethr:rsk:0x123456789....abc'
const did = 'did:ethr:rsk:0xabcdef....123'
const signer = mySignerFunction

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid, storage })

```

### Get

It returns all the `content` associated to a given `key` and `did` in a form of `string[]`

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl })

const key = 'EmailCredential'

const credentials = await client.get({ did, key })
```

### Create

It saves new `content` associated to the given `key` into the service and returns the associated `id`.
Receives an object containing the `key` and the `content`

If the `key` already exists, it will add `content` associated to that `key`. Old `content` will still be there.
If not, a new `key` will be created and associated to the logged in `did`.

If the client is not logged in yet, it will log it in prior to saving the new `content`, so it may prompt the user to sign the login message. Please refer to the [DID Auth protocol](https://rsksmart.github.io/rif-identity-docs/ssi/libraries/express-did-auth) for more information.


```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.create({ key, content })
```

### Swap

It replaces `content` and returns the `id` of the just created `content`.
It receives an object with `key` and `content` as mandatory fields. It also allows to add the `id` of the desired `content` to be replaced.
If `id` is not provided, it will replace ALL the `content` associated to the `key` with the new `content`.
If `id` is provided, it just replace the `content` with the given `id` and `key`

If the `key` does not exist, will create it.

If the client is not logged in yet, it will log it in prior to replacing the new `content`, so it may prompt the user to sign the login message


#### Without `id`

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.swap({ key, content })
```

#### With `id`

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'
const original1 = 'this is my content number 1'
const original2 = 'this is my content number 2'

const id1 = await client.create({ key, content: original1 })
const id2 = await client.create({ key, content: original2 })

const newContent = 'this is the new content'

const newId = await client.swap({ key, content, id: id1 })

const MyKeys = await client.get(key) // it will return an array containing [original2, newContent]
```

### Delete

It deletes the `content` associated to the given `key` (and `id` if provided).
It receives an object with `key` as the mandatory field. It also allows to add the `id` of the desired `content` to be deleted.
If `id` is not provided, it will delete ALL the `content` associated to the `key`.
If `id` is provided, it just deletes the `content` that matches the given `id` and `key`

If the `key` does not exist, will create it.

If the client is not logged in yet, it will log it in prior to deleting, so it may prompt the user to sign the login message


#### Without `id`

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'

await client.delete({ key })
```

#### With `id`

```typescript
import DataVaultWebClient from '@rsksmart/ipfs-cpinner-client'

const client = new DataVaultWebClient({ serviceUrl, did, signer, serviceDid })

const key = 'MyKey'
const content = 'this is my content'

const id = await client.create({ key, content: original1 })

await client.delete({ key, id })
```

## Open work

- Encrypt/decrypt content prior to save or after retrieving it from the service

## Test

From base repo directory run `npm test` or any of the described [test script variants](../../README#test).
