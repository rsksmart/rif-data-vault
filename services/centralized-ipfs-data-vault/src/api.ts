import { IpfsPinnerProvider } from '@rsksmart/ipfs-pinner-provider'
import { Express, Request } from 'express'
import { Logger } from 'winston'

interface AuthenticatedRequest extends Request {
  user: { did: string }
}

export function setupPublicApi (app: Express, provider: IpfsPinnerProvider, logger?: Logger) {
  app.get('/:did/:key', async (req, res) => {
    const { did, key } = req.params

    logger.info(`Retrieving content from ${did}. Key: ${key}`)

    const content = await provider.get(did, key)

    res.status(200).json({ content })
  })
}

export function setupPermissionedApi (app: Express, provider: IpfsPinnerProvider, logger?: Logger) {
  app.post('/:key', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key } = req.params
    const { content } = req.body

    logger.info(`DID ${did} about to create content under ${key}`)

    const id = await provider.create(did, key, content)

    res.status(201).json({ id })
  })

  app.put('/:key', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key } = req.params
    const { content } = req.body

    logger.info(`DID ${did} about to swap all the content under ${key}`)

    const id = await provider.update(did, key, content)

    res.status(200).send({ id })
  })

  app.put('/:key/:id', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key, id } = req.params
    const { content } = req.body

    logger.info(`DID ${did} about to swap specific content under ${key} and the id ${id}`)

    const newId = await provider.update(did, key, content, id)

    res.status(200).send({ id: newId })
  })

  app.delete('/:key', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key } = req.params

    logger.info(`DID ${did} about to delete all the content under ${key}`)

    await provider.delete(did, key)

    res.status(200).send()
  })

  app.delete('/:key/:id', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user
    const { key, id } = req.params

    logger.info(`DID ${did} about to delete specific content under ${key} and the id ${id}`)

    await provider.delete(did, key, id)

    res.status(200).send()
  })
}
