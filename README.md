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

The project consists of 3 modules:
- [the provider](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-provider) of the data vault service. This module implements the business logic, storing and pining files on IPFS
- [the service API](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-service). It allows modifying the implementation of the provider's messages without modifying the API, keeping the SDK compatible
- [the SDK](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-client). An npm package that allows you to connect to the Data Vault from the web browser using different web3 wallets

## Setup

Install dependencies

```
npm i
npm run setup
```

Install IPFS CLI. Find your option: https://docs.ipfs.io/how-to/command-line-quick-start/.

> To run an instance of the Data Vault refer to [Data Vault service configuration](https://github.com/rsksmart/rif-data-vault/tree/develop/modules/ipfs-cpinner-service#configure)

## Test

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

## Lint

```
npm run lint
```
