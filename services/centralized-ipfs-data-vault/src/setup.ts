import setupAuth from 'je-express-did-auth'
import { Express } from 'express'
import { IpfsPinnerProvider } from '@rsksmart/ipfs-pinner-provider'
import { setupPublicApi, setupPermissionedApi } from './api'

export interface Config {
  serviceUrl: string
  serviceDid: string
  serviceSigner: any
  challengeSecret: string
}

export default function (app: Express, provider: IpfsPinnerProvider, config: Config) {
  const { serviceDid, serviceSigner, serviceUrl, challengeSecret } = config
  const authMiddleware = setupAuth({ serviceDid, serviceSigner, serviceUrl, challengeSecret })(app)

  setupPublicApi(app, provider)

  app.use(authMiddleware)

  setupPermissionedApi(app, provider)
}
