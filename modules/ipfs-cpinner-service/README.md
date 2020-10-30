<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle"><code>@rsksmart/ipfs-cpinner-service</code></h3>
<p align="middle">
    RIF Identity - IPFS Centralized Pinner Service
</p>
<p align="middle">
  <a href="https://rsksmart.github.io/rif-identity-docs/data-vault/cpinner/cpinner-service">
    <img src="https://img.shields.io/badge/-docs-brightgreen" alt="docs" />
  </a>
</p>

A Centralized Data Vault service compatible with RIF Data Vault standard interface. It stores content in an IPFS node associated to a given DID and key.

Alpha version at: []()

## Features

- API for storing, updating and deleting, accessible only proving DID control - uses DID Auth
- Open API for retrieving data - **It is strongly recommend to encrypt the content saved in IPFS using this package.**

It is an API designed using IPFS Centralized Pinner Provider

## Usage

The IPFS Centralized pinner service is designed to let users store files for free. This files are pinned into IPFS.

Content is stored in `did -> key -> file[]` dictionary. Files with a same `key` can be accessed all together.

### API

The API is divided in two. Content modifications need [authenticated requests using DID Auth](https://github.com/rsksmart/rif-identity.js/tree/develop/packages/express-did-auth) and is supposed that the content uploaded is encrypted. This enables the accessing API to be open to anybody.

### Uploading content

Add files given a file `key`

```
POST /:key { body: content } -> { id }
```

Update files of a given `key`

```
PUT /:key/ { content } -> { id }
```

Update a specific file of a given `key`

```
PUT /:key/:id { content } -> { id }
```

Delete all files of a given `key`

```
DELETE /:key -> { }
```

Delete a specific file of a given `key`

```
DELETE /:key/:id -> { }
```

### Accessing content

Get all files of a given `did` and `key`

```
GET /:did/:key -> { content[] } (get files)
```

## Run

The service will:
- Setup a local database were content associated to DIDs is mapped
- Start IPFS client against a local node to put and pin files
- Start Express app with DID Auth asd explained above

### Configure

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

### Run locally

### Run with Docker

## Test

From base repo directory run `npm test` or any of the described [test script variants](../../README#test).
