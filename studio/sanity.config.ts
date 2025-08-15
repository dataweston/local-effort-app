import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Local Effort',

  projectId: 'd6l9d0ea',
  dataset: 'localeffort',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
