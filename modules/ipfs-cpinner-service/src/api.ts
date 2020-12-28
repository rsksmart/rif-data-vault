import { IpfsPinnerProvider } from '@rsksmart/ipfs-cpinner-provider'
import { Express, Request, Response } from 'express'
import { Logger } from 'winston'
import { MAX_STORAGE_REACHED } from './constants'

interface AuthenticatedRequest extends Request {
  user: { did: string }
}

const errorHandlerFactory = (logger: Logger) => (err: Error, req: Request, res: Response) => {
  if (err.message === MAX_STORAGE_REACHED) return res.status(400).send(MAX_STORAGE_REACHED)

  logger.error(`Caught error on ${req.method.toUpperCase()} ${req.path}`, err)
  return res.status(500).send()
}

export function setupPermissionedApi (app: Express, provider: IpfsPinnerProvider, logger?: Logger) {
  const errorHandler = errorHandlerFactory(logger)

  app.get('/content/:key', async (req: AuthenticatedRequest, res: Response) => {
    const { key } = req.params
    const { did } = req.user

    logger.info(`Retrieving content from ${did}. Key: ${key}`)

    return provider.get(did, key)
      .then(content => res.status(200).json(content))
      .catch(err => errorHandlerFactory(logger)(err, req, res))
  })

  app.get('/storage', async (req: AuthenticatedRequest, res: Response) => {
    const { did } = req.user

    logger.info(`Retrieving storage information from ${did}`)

    try {
      const used = await provider.getUsedStorage(did)
      const available = await provider.getAvailableStorage(did)

      return res.status(200).json({ used, available })
    } catch (err) {
      return errorHandler(err, req, res)
    }
  })

  app.get('/keys', async (req: AuthenticatedRequest, res) => {
    const { did } = req.user

    logger.info(`Retrieving keys from ${did}`)

    return provider.getKeys(did)
      .then(keys => res.status(200).json({ keys }))
      .catch(err => errorHandler(err, req, res))
  })

  app.post('/content/:key', (req: AuthenticatedRequest, res: Response) => {
    const { did } = req.user
    const { key } = req.params
    const { content } = req.body

    logger.info(`DID ${did} about to create content under ${key}`)

    return provider.create(did, key, content)
      .then(id => res.status(201).json({ id }))
      .catch(err => errorHandler(err, req, res))
  })

  app.put('/content/:key', async (req: AuthenticatedRequest, res: Response) => {
    const { did } = req.user
    const { key } = req.params
    const { content } = req.body

    logger.info(`DID ${did} about to swap all the content under ${key}`)

    return provider.update(did, key, content)
      .then(id => res.status(200).send({ id }))
      .catch(err => errorHandler(err, req, res))
  })

  app.put('/content/:key/:id', async (req: AuthenticatedRequest, res: Response) => {
    const { did } = req.user
    const { key, id } = req.params
    const { content } = req.body

    logger.info(`DID ${did} about to swap specific content under ${key} and the id ${id}`)

    return provider.update(did, key, content, id)
      .then(newId => res.status(200).send({ id: newId }))
      .catch(err => errorHandler(err, req, res))
  })

  app.delete('/content/:key', async (req: AuthenticatedRequest, res: Response) => {
    const { did } = req.user
    const { key } = req.params

    logger.info(`DID ${did} about to delete all the content under ${key}`)

    return provider.delete(did, key)
      .then(() => res.status(200).send())
      .catch(err => errorHandler(err, req, res))
  })

  app.delete('/content/:key/:id', async (req: AuthenticatedRequest, res: Response) => {
    const { did } = req.user
    const { key, id } = req.params

    logger.info(`DID ${did} about to delete specific content under ${key} and the id ${id}`)

    return provider.delete(did, key, id)
      .then(() => res.status(200).send())
      .catch(err => errorHandler(err, req, res))
  })
}
