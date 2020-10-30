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
    const { did } = req.user
    const { key } = req.params
    const { content } = req.body

    const id = await provider.create(did, key, content)

    res.status(201).json({ id })
  })

  app.put('/:key', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key } = req.params
    const { content } = req.body

    const id = await provider.update(did, key, content)

    res.status(200).send({ id })
  })

  app.put('/:key/:id', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key, id } = req.params
    const { content } = req.body

    const newId = await provider.update(did, key, content, id)

    res.status(200).send({ id: newId })
  })
}
