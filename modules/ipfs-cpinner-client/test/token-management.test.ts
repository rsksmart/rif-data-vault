import DataVaultWebClient from '../src'
describe('getTokens', function (this: {
  serviceUrl: string,
}) {
  describe('get', () => {
    describe('accessToken', () => {
      test('should get undefined if nothing set', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const accessToken = await client.getAccessToken()

        expect(accessToken).toBeUndefined()
      })

      test('should return something if the token has been set before', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        await client.setAccessToken('this is a token')

        const accessToken = await client.getAccessToken()

        expect(accessToken).toBeTruthy()
      })

      test('should return the set token', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const setToken = await client.setAccessToken('this is a token')

        const gotToken = await client.getAccessToken()

        expect(gotToken).toEqual(setToken)
      })
    })

    describe('refreshToken', () => {
      test('should return nothing if nothing set before', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const accessToken = await client.getRefreshToken()

        expect(accessToken).toBeUndefined()
      })

      test('should return something if the token has been set before', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        await client.setRefreshToken('this is a token')

        const refreshToken = await client.getRefreshToken()

        expect(refreshToken).toBeTruthy()
      })

      test('should return the set token', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const setToken = await client.setRefreshToken('this is a token')

        const gotToken = await client.getRefreshToken()

        expect(gotToken).toEqual(setToken)
      })
    })
  })

  describe('set', () => {
    describe('accessToken', () => {
      test('should return something', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const actual = await client.setAccessToken('an access token')

        expect(actual).toBeTruthy()
      })

      test('should return the sent token', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const accessToken = 'an access token'
        const actual = await client.setAccessToken(accessToken)

        expect(actual).toEqual(accessToken)
      })
    })

    describe('refreshToken', () => {
      test('should return something', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const actual = await client.setRefreshToken('a refresh token')

        expect(actual).toBeTruthy()
      })

      test('should return return the sent token', async () => {
        const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

        const refreshToken = 'a refresh token'
        const actual = await client.setRefreshToken(refreshToken)

        expect(actual).toEqual(refreshToken)
      })
    })
  })
})
