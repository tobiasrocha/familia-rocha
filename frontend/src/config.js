const PROD_API = 'https://familiarocha-api-694824783472.us-central1.run.app/api';
const DEV_API = '/api';
export const API_BASE = import.meta.env.PROD ? PROD_API : DEV_API;
