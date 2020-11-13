import DataVaultWebClient from '../src'
import ipfsHash from 'ipfs-only-hash'

describe('', function (this: {
  serviceUrl: string
}) {
  test('1', async () => {
    const key = 'AKey'
    const content = 'the content'
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    const response = await client.create({ key, content })

    expect(response).toBeTruthy()
  })

  test('2', async () => {
    const key = 'AKey'
    const content = 'the content'
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    const { id } = await client.create({ key, content })

    expect(id).toBeTruthy()
  })

  test('3', async () => {
    const key = 'AnotherKey'
    const content = 'another content'
    const client = new DataVaultWebClient({ serviceUrl: this.serviceUrl })

    const { id } = await client.create({ key, content })

    const expected = await ipfsHash.of(Buffer.from(content))

    expect(id).toEqual(expected)
  })

  /*
  quiero hacer uno para verificar que al traerme el contenido guardado,
  coincide, pero me doy cuenta que necesito hacer el login y todo eso, por ende, necesito
  mas data al instanciar la lib, ahí es donde tengo que cambiar los tests viejos

  por otro lado, al darme cuenta que necesito el accessToken y el refreshToken, debo cambiar el login,
  para que no devuelva nada y solo guarde en el estado esos tokens. Eso implica cambiar los tests de
  login y crear metodo nuevo de getAT y getRT.
  */
})
