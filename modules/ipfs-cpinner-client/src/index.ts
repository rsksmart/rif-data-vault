import axios from 'axios'

type GetFilePayload = { did: string, key: string }

type Options = {
  serviceUrl: string
}

export default class {
  // eslint-disable-next-line no-useless-constructor
  constructor (private opts: Options) {}

  get ({ did, key }: GetFilePayload): Promise<string> {
    return axios.get(`${this.opts.serviceUrl}/${did}/${key}`)
      .then(res => res.status === 200 && res.data)
      .then(({ content }) => content.length && content)
  }
}
