// src/client.js
import { createClient } from '@sanity/client';

export default createClient({
  // Read the projectId from the .env file
  projectId: import.meta.env.VITE_APP_SANITY_PROJECT_ID,

  // Read the dataset from the .env file
  dataset: import.meta.env.VITE_APP_SANITY_DATASET,

  useCdn: false,
  apiVersion: '2023-05-03',
});
