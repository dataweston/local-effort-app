// If some environments fail to resolve 'sanity', consider swapping to:
// import {defineConfig} from 'sanity/lib/exports'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Local Effort',

  projectId: 'd6l9d0ea',
  dataset: 'localeffort',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Store section
            S.listItem()
              .title('Store')
              .child(
                S.list()
                  .title('Store')
                  .items([
                    S.documentTypeListItem('product').title('Products'),
                  ]),
              ),
            S.divider(),
            // Fallback: all other types
            ...S.documentTypeListItems().filter(
              (li) => li.getId() && li.getId() !== 'product',
            ),
          ]),
    }),
  visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
