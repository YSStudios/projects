export default {
  name: 'panel',
  title: 'Gallery Panel',
  type: 'document',
  fields: [
    {
      name: 'panelId',
      title: 'Panel ID',
      type: 'string',
      description: 'Matches the 3D panel slot in the site layout (e.g. "1" to "9").',
      validation: (rule) => rule.required()
    },
    {
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Controls gallery navigation order.',
      validation: (rule) => rule.required()
    },
    {
      name: 'title',
      title: 'Panel Title',
      type: 'string',
      validation: (rule) => rule.required()
    },
    {
      name: 'galleryImages',
      title: 'Gallery Images',
      description: 'Upload images directly here.',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (rule) => rule.required().min(1)
    },
    {
      name: 'caseStudy',
      title: 'Case Study',
      type: 'object',
      fields: [
        {
          name: 'headline',
          title: 'Headline',
          type: 'string',
          validation: (rule) => rule.required()
        },
        {
          name: 'summary',
          title: 'Summary',
          type: 'text',
          rows: 3,
          validation: (rule) => rule.required()
        },
        {
          name: 'role',
          title: 'Role',
          type: 'string',
          validation: (rule) => rule.required()
        },
        {
          name: 'year',
          title: 'Year',
          type: 'string',
          validation: (rule) => rule.required()
        },
        {
          name: 'tags',
          title: 'Tags',
          type: 'array',
          of: [{ type: 'string' }],
          validation: (rule) => rule.required().min(1)
        },
        {
          name: 'body',
          title: 'Body Paragraphs',
          description: 'Each item renders as one paragraph in the case study overlay.',
          type: 'array',
          of: [{ type: 'text', rows: 4 }],
          validation: (rule) => rule.required().min(1)
        }
      ]
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'panelId'
    },
    prepare(selection) {
      return {
        title: selection.title || 'Untitled panel',
        subtitle: selection.subtitle ? `Panel ${selection.subtitle}` : 'Panel'
      }
    }
  }
}
