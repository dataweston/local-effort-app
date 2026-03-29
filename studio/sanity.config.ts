// If some environments fail to resolve 'sanity', consider swapping to:
// import {defineConfig} from 'sanity/lib/exports'
import {defineConfig} from 'sanity'
import type {Template} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {iconPicker} from 'sanity-plugin-icon-picker'
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
            S.listItem()
              .title('Sales')
              .child(S.documentTypeList('sale').title('Sales')),
            S.listItem()
              .title('Decision Priorities')
              .child(S.documentTypeList('decisionPriority').title('Decision Priorities')),
            S.divider(),
            // Fallback: all other types
            ...S.documentTypeListItems().filter(
              (li) => li.getId() && !['product', 'sale', 'decisionPriority'].includes(li.getId()!),
            ),
          ]),
    }),
  visionTool(),
  iconPicker(),
  ],

  schema: {
    types: schemaTypes,
  },
  templates: (prev: Template[]) => [
    ...prev,
    {
      id: 'sale-default',
      title: 'Sale (Standard layout)',
      schemaType: 'sale',
      value: {
        layoutVariant: 'standard',
        pickupWindow: {
          timezone: 'America/Chicago',
        },
        theme: {
          backgroundColor: '#0f172a',
          foregroundColor: '#f8fafc',
          accentColor: '#f97316',
        },
      },
    },
    {
      id: 'sale-paikka',
      title: 'Sale (Paikka layout)',
      schemaType: 'sale',
      value: {
        layoutVariant: 'paikka',
        pickupWindow: {
          timezone: 'America/Chicago',
        },
        theme: {
          backgroundColor: '#f6f3ed',
          foregroundColor: '#1f1b16',
          accentColor: '#b45309',
          cardStyle: 'frosted',
        },
      },
    },
  ],
})
