import { IpfsPinnerProvider } from '@rsksmart/ipfs-pinner-provider'
import express from 'express'

export function setupDataVault (provider: IpfsPinnerProvider) {
  const app = express()

  app.get('/:did/:key', async (req, res) => {
    const { did, key } = req.params

    const content = await provider.get(did, key)

    res.status(200).json({ content })
  })

  return app
}
