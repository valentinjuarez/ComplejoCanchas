import axios from 'axios';

export function mpClient(accessToken: string) {
  return axios.create({
    baseURL: 'https://api.mercadopago.com',
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
}
