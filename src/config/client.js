const axios = require('axios');
require('dotenv').config();

const getCalendlyClient = () => {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) throw new Error("Missing CALENDLY_TOKEN in .env");

  return axios.create({
    baseURL: 'https://api.calendly.com',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};
module.exports = getCalendlyClient;