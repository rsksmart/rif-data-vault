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
</p>

## Setup

Install dependencies

```
npm i
npm run setup
```

Install IPFS CLI. Find your option: https://docs.ipfs.io/how-to/command-line-quick-start/.

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
