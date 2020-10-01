<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle"><code>rif-data-vault</code></h3>
<p align="middle">
    RIF Data Vault.
</p>
<p align="middle">
    <a href="https://badge.fury.io/js/%40rsksmart%2Frif-id">
        <img src="https://badge.fury.io/js/%40rsksmart%2Frif-id.svg" alt="npm" />
    </a>
</p>

_This project is a work in progress_

The Data Vault is a user centric cloud storage system. This repo currently exposes a Javascript implementation for interacting with [this centralized IPFS pinner service](https://github.com/rsksmart/rif-identity-services/tree/develop/services/data-vault).

## Getting started

Use the Data Vault client to store and retrieve files

> View the data-vault service README for a quick-start

```typescript
import { SecretBox } from 'daf-libsodium'

// holderAgent is a uPort agent

const secretKey = await SecretBox.createSecretKey()
const secretBox = new SecretBox(secretKey)
const dataVault = CentralizedIPFSPinnerClient.fromAgent((await holderAgent.getIdentities())[0], holderAgent, secretBox, 'http://localhost:5102', { ipfsDefault: true })

const cid1 = await dataVault.put('some key', 'some value')
const cid2 = await dataVault.put('some key', 'some other value')

const result = await dataVault.get('some key')

await dataVault.delete('some key', cid1)
await dataVault.delete('some key', cid2)
```

## Setup

Install dependencies

```
npm i
npm run setup
```

## Run tests

_Currently no tests_
