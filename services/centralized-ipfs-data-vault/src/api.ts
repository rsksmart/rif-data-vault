import { IpfsPinnerProvider } from '@rsksmart/ipfs-pinner-provider'
import { Express, Request } from 'express'

interface AuthenticatedRequest extends Request {
  user: { did: string }
}

export function setupPublicApi (app: Express, provider: IpfsPinnerProvider) {
  app.get('/:did/:key', async (req, res) => {
    const { did, key } = req.params

    const content = await provider.get(did, key)

    res.status(200).json({ content })
  })
}

export function setupPermissionedApi (app: Express, provider: IpfsPinnerProvider) {
  app.post('/:key', async (req: AuthenticatedRequest, res) => {
    const { key } = req.params
    const { content } = req.body

    const id = await provider.create(req.user.did, key, content)

    res.status(201).json({ id })
  })
}
