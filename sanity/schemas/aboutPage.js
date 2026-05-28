export default {
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() },
    { name: 'lead', title: 'Lead', type: 'text', rows: 3, validation: (rule) => rule.required() },
    {
      name: 'body',
      title: 'Body Paragraphs',
      type: 'array',
      of: [{ type: 'text', rows: 4 }],
      validation: (rule) => rule.required().min(1)
    },
    { name: 'closing', title: 'Closing Line', type: 'text', rows: 2, validation: (rule) => rule.required() }
  ],
  preview: {
    prepare() {
      return {
        title: 'About Page'
      }
    }
  }
}
