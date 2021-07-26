<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle">RIF Data Vault</h3>
<p align="middle">
    A user centric cloud storage system
</p>
<p align="middle">
  <a href="https://rsksmart.github.io/rif-identity-docs/data-vault">
    <img src="https://img.shields.io/badge/-docs-brightgreen" alt="docs" />
  </a>
  <a href="https://lgtm.com/projects/g/rsksmart/rif-data-vault/alerts/">
    <img src="https://img.shields.io/lgtm/alerts/github/rsksmart/rif-data-vault" alt="alerts">
  </a>
  <a href="https://lgtm.com/projects/g/rsksmart/rif-data-vault/context:javascript">
    <img src="https://img.shields.io/lgtm/grade/javascript/github/rsksmart/rif-data-vault">
  </a>
  <a href="https://codecov.io/gh/rsksmart/rif-data-vault">
    <img src="https://codecov.io/gh/rsksmart/rif-data-vault/branch/develop/graph/badge.svg?token=NFEOFRUKW0"/>
  </a>
</p>

The Data Vault is a user-centric cloud service. Allows any user with a digital wallet to connect to their own storage cloud, encrypting their information on the client side.

## Quick start

Connect to RIF Data Vault from your browser app!

```ts
import DataVaultWebClient, { AuthManager, AsymmetricEncryptionManager } from '@rsksmart/ipfs-cpinner-client'

const serviceUrl = 'https://data-vault.identity.rifos.org'

// using Metamask
const address = await window.ethereum.request({ method: 'eth_accounts' }).then(accounts => accounts[0])
const did = `did:ethr:rsk:${address}`

const dataVault = new DataVaultWebClient({
  serviceUrl,
  authManager: new AuthManager({ did, serviceUrl, personalSign: (data: string) => window.ethereum.request({ method: 'personal_sign', params: [data, address] }) }),
  encryptionManager: AsymmetricEncryptionManager.fromWeb3Provider(window.ethereum)
})

const key = 'MyKey'
const content = 'this is my content'

const id = await dataVault.create({ key, content })

await dataVault.get({ did, key })
```

[Read the docs](https://developers.rsk.co/rif/identity/data-vault/) and find out more!

## Modules

- [`@rsksmart/ipfs-cpinner-client`](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-client) - the web SDK. Enables users to log to their clouds with standard web3 wallets
- [`@rsksmart/ipfs-cpinner-provider`](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-provider) - implements the storage layer: storing and pinning files on IPFS
- [`@rsksmart/ipfs-cpinner-service`](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-service) - API for the Data Vault. This abstraction allows to create different implementations for the storage layer
- [`@rsksmart/ipfs-cpinner-client-types`](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-client-types) - types for the SDK

## Run for development

1. Install dependencies

    ```
    npm i
    npm run setup
    ```

2. Install IPFS CLI. Find your option: https://docs.ipfs.io/how-to/command-line-quick-start/.

### Test

1. Init IPFS (once)

  ```
  ipfs init
  ```

2. Start IPFS Daemon

  ```
  ipfs daemon
  ```

3. Run tests

  ```
  npm test
  ```

  or watch mode with

  ```
  test:watch
  ```

### Lint

```
npm run lint
```

### Branching model

- `master` has latest release. Do merge commits.
- `develop` has latest approved PR. PRs need to pass `ci` and `LGTM`. Do squash & merge.
- Use branches pointing to `develop` to add new PRs.
- Do external PRs against latest commit in `develop`.

## Deploy your Data Vault instance

To run a **productive instance** of the Data Vault refer to [Data Vault service configuration](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-service#configure)

