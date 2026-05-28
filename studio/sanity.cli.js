import { defineCliConfig } from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.REACT_APP_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.REACT_APP_SANITY_DATASET || 'production'

export default defineCliConfig({
  api: {
    projectId: projectId || 'missing-project-id',
    dataset
  }
})
