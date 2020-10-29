import { IpfsPinnerProvider } from '@rsksmart/ipfs-pinner-provider'
import { Express } from 'express'

export function setupDataVault (app: Express, provider: IpfsPinnerProvider) {
  app.get('/:did/:key', async (req, res) => {
    const { did, key } = req.params

    const content = await provider.get(did, key)

    res.status(200).json({ content })
  })
}
