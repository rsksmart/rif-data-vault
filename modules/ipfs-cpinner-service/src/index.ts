import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import setupApp, { AuthConfig } from './setup'
import { loggerFactory } from '@rsksmart/rif-node-utils'
import { rskDIDFromPrivateKey, rskTestnetDIDFromPrivateKey } from '@rsksmart/rif-id-ethr-did'
import { Connection, createConnection } from 'typeorm'
import { ipfsPinnerProviderFactory, Entities } from '@rsksmart/ipfs-cpinner-provider'

dotenv.config()

const env = {
  challengeSecret: process.env.CHALLENGE_SECRET,
  serviceUrl: process.env.SERVICE_URL,
  privateKey: process.env.PRIVATE_KEY,
  database: process.env.DB_FILE || './db/new-data-vault.sqlite',
  rpcUrl: process.env.RPC_URL || 'https://did.testnet.rsk.co:4444',
  networkName: process.env.NETWORK_NAME || 'rsk:testnet',
  ipfsHost: process.env.IPFS_HOST || 'localhost',
  ipfsPort: process.env.IPFS_PORT || 5001,
  maxStorage: Number(process.env.MAX_STORAGE) || 1000000
}

const logger = loggerFactory({
  env: process.env.NODE_ENV || 'dev',
  infoFile: process.env.LOG_FILE || './log/new-data-vault.log',
  errorFile: process.env.LOG_ERROR_FILE || './log/new-data-vault.error.log'
})('rlogin:services:centralized-data-vault')

const serviceIdentity = env.networkName === 'rsk:testnet' ? rskTestnetDIDFromPrivateKey()(env.privateKey) : rskDIDFromPrivateKey()(env.privateKey)
const serviceDid = serviceIdentity.did
const serviceSigner = serviceIdentity.signer
logger.info(`Service DID: ${serviceDid}`)

const config: AuthConfig = {
  serviceDid,
  serviceSigner,
  serviceUrl: env.serviceUrl,
  challengeSecret: env.challengeSecret,
  networkName: env.networkName,
  rpcUrl: env.rpcUrl
}

const app = express()
app.use(bodyParser.json())
app.use(cors())

const ipfsApiUrl = `http://${env.ipfsHost}:${env.ipfsPort}`

app.get('/__health', (req: Request, res: Response) => {
  res.status(200).end('OK')
})

createConnection({
  type: 'sqlite',
  database: env.database,
  entities: Entities,
  logging: false,
  dropSchema: false,
  synchronize: true
}).then((dbConnection: Connection) => ipfsPinnerProviderFactory({ dbConnection, ipfsApiUrl, maxStorage: env.maxStorage }))
  .then(ipfsPinnerProvider => setupApp(app, ipfsPinnerProvider, config, logger))
  .then(() => {
    const port = process.env.DATA_VAULT_PORT || 5107
    app.listen(port, () => logger.info(`Data vault service service started on port ${port}`))
  })
  .catch(err => logger.error('Caught error when starting the service', err))
