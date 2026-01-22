import axios from 'axios';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

/**
 * Creates a pre-configured Axios instance for Calendly.
 * Can optionally accept a token directly (useful for dynamic integration).
 */
const getCalendlyClient = () => {
  // Priority: 1. Manual Token from DB | 2. Environment Variable
  const token =  process.env.CALENDLY_TOKEN;
  console.log(token);
  

  if (!token) {
    throw new Error("❌ Missing Calendly Authorization Token.");
  }

  return axios.create({
    baseURL: 'https://api.calendly.com',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export default getCalendlyClient;