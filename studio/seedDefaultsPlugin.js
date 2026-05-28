import { useEffect, useRef } from 'react'
import { definePlugin, useClient } from 'sanity'
import { seedAboutPage, seedContactPage, seedPanels } from './defaultSeedContent'

const SITE_ORIGIN = 'http://localhost:3000'

function sourceToUrl(sourcePath) {
  if (!sourcePath) return null
  try {
    return new URL(sourcePath, SITE_ORIGIN).toString()
  } catch (_) {
    return null
  }
}

async function uploadPathAsImageRef(client, sourcePath) {
  const sourceUrl = sourceToUrl(sourcePath)
  if (!sourceUrl) return null
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`)
  const blob = await response.blob()
  const filename = sourcePath.split('/').filter(Boolean).pop() || 'gallery-image.png'
  const asset = await client.assets.upload('image', blob, { filename })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

async function uploadGalleryRefs(client, sourcePaths = []) {
  const refs = []
  for (const sourcePath of sourcePaths) {
    const ref = await uploadPathAsImageRef(client, sourcePath)
    if (ref) refs.push(ref)
  }
  return refs
}

function SeedDefaultsLayout(props) {
  const client = useClient({ apiVersion: '2026-01-01', useCdn: false })
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const run = async () => {
      const state = await client.fetch(`{
        "panelCount": count(*[_type == "panel"]),
        "aboutCount": count(*[_type == "aboutPage"]),
        "contactCount": count(*[_type == "contactPage"])
      }`)

      const tx = client.transaction()

      if (!state?.panelCount) {
        for (const panel of seedPanels) {
          const { gallerySourcePaths, ...panelFields } = panel
          const galleryImages = await uploadGalleryRefs(client, gallerySourcePaths)
          tx.createIfNotExists({
            _id: `panel-${panel.panelId}`,
            _type: 'panel',
            ...panelFields,
            galleryImages
          })
        }
      }

      if (!state?.aboutCount) {
        tx.createIfNotExists({
          _id: 'about-page',
          _type: 'aboutPage',
          ...seedAboutPage
        })
      }

      if (!state?.contactCount) {
        tx.createIfNotExists({
          _id: 'contact-page',
          _type: 'contactPage',
          ...seedContactPage
        })
      }

      await tx.commit()

      const legacyPanels = await client.fetch(
        `*[_type == "panel" && defined(galleryImageUrls) && count(galleryImageUrls) > 0]{
          _id,
          galleryImageUrls
        }`
      )

      for (const panel of legacyPanels || []) {
        const galleryImages = await uploadGalleryRefs(client, panel.galleryImageUrls)
        await client.patch(panel._id).set({ galleryImages }).unset(['galleryImageUrls']).commit()
      }
    }

    run().catch((error) => {
      console.error('Failed to seed default Sanity documents.', error)
    })
  }, [client])

  return props.renderDefault(props)
}

export const seedDefaultsPlugin = definePlugin({
  name: 'seed-default-content',
  studio: {
    components: {
      layout: SeedDefaultsLayout
    }
  }
})
