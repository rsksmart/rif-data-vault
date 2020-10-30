import setupAuth from '@rsksmart/express-did-auth'
import { Express } from 'express'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import { setupPublicApi, setupPermissionedApi } from './api'
import { Logger } from 'winston'

export interface AuthConfig {
  serviceUrl: string
  serviceDid: string
  serviceSigner: any
  challengeSecret: string
  networkName?: string
  rpcUrl?: string
}

export default function (app: Express, provider: IpfsPinnerProvider, config: AuthConfig, logger?: Logger) {
  const { serviceDid, serviceSigner, serviceUrl, challengeSecret } = config
  const authMiddleware = setupAuth({ serviceDid, serviceSigner, serviceUrl, challengeSecret })(app)

  setupPublicApi(app, provider, logger)

  app.use(authMiddleware)

  setupPermissionedApi(app, provider, logger)
}
