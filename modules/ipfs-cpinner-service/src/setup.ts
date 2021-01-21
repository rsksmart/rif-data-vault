import setupAuth from '@rsksmart/express-did-auth'
import { Express } from 'express'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import { setupPermissionedApi } from './api'
import { Logger } from 'winston'

export interface AuthConfig {
  serviceUrl: string
  serviceDid: string
  serviceSigner: any
  challengeSecret: string
  networkName?: string
  rpcUrl?: string
  loginMessageHeader?: string
}

export default function (app: Express, provider: IpfsPinnerProvider, config: AuthConfig, logger?: Logger) {
  const { serviceDid, serviceSigner, serviceUrl, challengeSecret, loginMessageHeader } = config
  const authMiddleware = setupAuth({ serviceDid, serviceSigner, serviceUrl, challengeSecret, loginMessageHeader })(app)

  app.use(authMiddleware)

  setupPermissionedApi(app, provider, logger)
}
