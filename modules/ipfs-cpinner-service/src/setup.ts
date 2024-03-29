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
  noCsrfSecure?: boolean
}

export default async function (app: Express, provider: IpfsPinnerProvider, config: AuthConfig, logger?: Logger) {
  const { serviceDid, serviceSigner, serviceUrl, challengeSecret, loginMessageHeader, noCsrfSecure } = config
  const authMiddleware = await setupAuth({ serviceDid, serviceSigner, serviceUrl, challengeSecret, loginMessageHeader, useCookies: true, noCsrfSecure })(app)

  app.use(authMiddleware)

  setupPermissionedApi(app, provider, logger)
}
