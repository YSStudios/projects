export default {
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() },
    { name: 'lead', title: 'Lead', type: 'text', rows: 3, validation: (rule) => rule.required() },
    { name: 'emailLabel', title: 'Email Label', type: 'string', validation: (rule) => rule.required() },
    { name: 'emailAddress', title: 'Email Address', type: 'string', validation: (rule) => rule.required() },
    { name: 'instagramLabel', title: 'Instagram Label', type: 'string', validation: (rule) => rule.required() },
    { name: 'instagramUrl', title: 'Instagram URL', type: 'url', validation: (rule) => rule.required() },
    { name: 'closing', title: 'Closing Line', type: 'text', rows: 2, validation: (rule) => rule.required() }
  ],
  preview: {
    prepare() {
      return {
        title: 'Contact Page'
      }
    }
  }
}
