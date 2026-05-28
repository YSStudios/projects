import { createClient } from '@sanity/client'
import { defaultAboutContent, defaultContactContent, defaultPanels } from './defaultContent'

const sanityProjectId = process.env.REACT_APP_SANITY_PROJECT_ID
const sanityDataset = process.env.REACT_APP_SANITY_DATASET
const sanityApiVersion = process.env.REACT_APP_SANITY_API_VERSION || '2026-01-01'

const hasSanityConfig = Boolean(sanityProjectId && sanityDataset)

const sanityClient = hasSanityConfig
  ? createClient({
      projectId: sanityProjectId,
      dataset: sanityDataset,
      apiVersion: sanityApiVersion,
      useCdn: true
    })
  : null

const CONTENT_QUERY = `{
  "panels": *[_type == "panel"] | order(order asc) {
    "id": panelId,
    title,
    order,
    "urls": galleryImages[].asset->url,
    caseStudy {
      headline,
      summary,
      role,
      year,
      tags,
      body
    }
  },
  "about": *[_type == "aboutPage"][0]{
    title,
    lead,
    body,
    closing
  },
  "contact": *[_type == "contactPage"][0]{
    title,
    lead,
    emailLabel,
    emailAddress,
    instagramLabel,
    instagramUrl,
    closing
  }
}`

const fallbackPanelMap = new Map(defaultPanels.map((panel) => [panel.id, panel]))
const fallbackPanelOrder = new Map(defaultPanels.map((panel, index) => [panel.id, index]))

function asStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return fallback
  const next = value.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
  return next.length ? next : fallback
}

function mergePanel(cmsPanel, fallbackPanel) {
  const panelId = `${cmsPanel?.id ?? fallbackPanel?.id ?? ''}`.trim()
  const urls = asStringArray(cmsPanel?.urls, fallbackPanel?.urls ?? [])
  const fallbackCaseStudy = fallbackPanel?.caseStudy ?? {}
  const caseStudy = {
    headline: cmsPanel?.caseStudy?.headline || fallbackCaseStudy.headline || '',
    summary: cmsPanel?.caseStudy?.summary || fallbackCaseStudy.summary || '',
    role: cmsPanel?.caseStudy?.role || fallbackCaseStudy.role || '',
    year: cmsPanel?.caseStudy?.year || fallbackCaseStudy.year || '',
    tags: asStringArray(cmsPanel?.caseStudy?.tags, fallbackCaseStudy.tags ?? []),
    body: asStringArray(cmsPanel?.caseStudy?.body, fallbackCaseStudy.body ?? [])
  }

  return {
    ...fallbackPanel,
    id: panelId || fallbackPanel?.id,
    title: cmsPanel?.title || fallbackPanel?.title || 'Untitled panel',
    urls,
    caseStudy
  }
}

function mergePanels(cmsPanels) {
  if (!Array.isArray(cmsPanels) || cmsPanels.length === 0) return defaultPanels

  const merged = []
  const usedFallbackIds = new Set()

  cmsPanels.forEach((cmsPanel, index) => {
    const panelId = `${cmsPanel?.id ?? ''}`.trim()
    const fallbackPanel = fallbackPanelMap.get(panelId) ?? defaultPanels[index]
    if (!fallbackPanel) return
    usedFallbackIds.add(fallbackPanel.id)
    merged.push(mergePanel(cmsPanel, fallbackPanel))
  })

  defaultPanels.forEach((panel) => {
    if (!usedFallbackIds.has(panel.id)) merged.push(panel)
  })

  merged.sort((a, b) => {
    const aIndex = fallbackPanelOrder.get(a.id)
    const bIndex = fallbackPanelOrder.get(b.id)
    const aKnown = Number.isInteger(aIndex)
    const bKnown = Number.isInteger(bIndex)
    if (aKnown && bKnown) return aIndex - bIndex
    if (aKnown) return -1
    if (bKnown) return 1
    return `${a.id}`.localeCompare(`${b.id}`, undefined, { numeric: true })
  })

  return merged
}

function mergeSiteContent(cmsAboutContent, cmsContactContent) {
  return {
    about: {
      ...defaultAboutContent,
      ...(cmsAboutContent || {}),
      body: asStringArray(cmsAboutContent?.body, defaultAboutContent.body)
    },
    contact: {
      ...defaultContactContent,
      ...(cmsContactContent || {})
    }
  }
}

export async function fetchSiteContent() {
  if (!sanityClient) {
    return {
      panels: defaultPanels,
      about: defaultAboutContent,
      contact: defaultContactContent
    }
  }

  const content = await sanityClient.fetch(CONTENT_QUERY)

  return {
    panels: mergePanels(content?.panels),
    ...mergeSiteContent(content?.about, content?.contact)
  }
}
