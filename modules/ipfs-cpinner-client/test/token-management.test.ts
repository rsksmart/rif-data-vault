import DataVaultWebClient from '../src'

describe.each([
  ['accessToken'],
  ['refreshToken']
])('manage %s', (tokenType: string) => {
  let client: DataVaultWebClient
  const isAccessToken = tokenType === 'accessToken'

  const getToken = () => isAccessToken ? client.getAccessToken() : client.getRefreshToken()
  const setToken = (token: string) => isAccessToken ? client.setAccessToken(token) : client.setRefreshToken(token)

  beforeEach(function () {
    const serviceUrl = 'http://service.com'
    client = new DataVaultWebClient({ serviceUrl })
  })

  describe('get', () => {
    test('should get undefined if nothing set', async () => {
      const token = await getToken()

      expect(token).toBeUndefined()
    })

    test('should return something if the token has been set before', async () => {
      await setToken('this is a token')

      const token = await getToken()

      expect(token).toBeTruthy()
    })

    test('should return the saved token', async () => {
      const saved = await setToken('this is a token')

      const retrieved = await getToken()

      expect(retrieved).toEqual(saved)
    })
  })

  describe('set', () => {
    test('should return something', async () => {
      const actual = await setToken('an access token')

      expect(actual).toBeTruthy()
    })

    test('should return the sent token', async () => {
      const accessToken = 'an access token'
      const actual = await setToken(accessToken)

      expect(actual).toEqual(accessToken)
    })
  })
})
