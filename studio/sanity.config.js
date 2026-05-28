import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'
import { seedDefaultsPlugin } from './seedDefaultsPlugin'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.REACT_APP_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.REACT_APP_SANITY_DATASET || 'production'

if (!projectId) {
  console.warn(
    'Missing SANITY_STUDIO_PROJECT_ID (or REACT_APP_SANITY_PROJECT_ID). Studio will not connect until this is configured.'
  )
}

const singletonTypes = new Set(['aboutPage', 'contactPage'])

export default defineConfig({
  name: 'default',
  title: 'Mr Nobody Studio',
  projectId: projectId || 'missing-project-id',
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('panel').title('Gallery Panel'),
            S.listItem()
              .title('About Page')
              .child(S.document().schemaType('aboutPage').documentId('about-page')),
            S.listItem()
              .title('Contact Page')
              .child(S.document().schemaType('contactPage').documentId('contact-page'))
          ])
    }),
    visionTool(),
    seedDefaultsPlugin()
  ],
  document: {
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === 'global') {
        return prev.filter((templateItem) => !singletonTypes.has(templateItem.templateId))
      }
      return prev
    },
    actions: (prev, { schemaType }) => {
      if (singletonTypes.has(schemaType)) {
        return prev.filter(({ action }) => action !== 'duplicate' && action !== 'delete')
      }
      return prev
    }
  },
  schema: {
    types: schemaTypes
  }
})
