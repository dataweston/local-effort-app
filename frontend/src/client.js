// src/client.js
import {createClient} from '@sanity/client'

export default createClient({
  projectId: 'd6l9d0ea', // Find this in your sanity.json or at manage.sanity.io
  dataset: 'localeffort', // Or the name of your dataset
  useCdn: true, // `false` if you want to ensure fresh data
  apiVersion: '2023-05-03', // Use a consistent API version
})