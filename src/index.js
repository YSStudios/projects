import { Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { defaultAboutContent, defaultContactContent, defaultPanels } from './content/defaultContent'
import { fetchSiteContent } from './content/siteContent'

function BootstrapApp() {
  const [content, setContent] = useState({
    panels: defaultPanels,
    about: defaultAboutContent,
    contact: defaultContactContent
  })

  useEffect(() => {
    let alive = true
    fetchSiteContent()
      .then((nextContent) => {
        if (alive) setContent(nextContent)
      })
      .catch((error) => {
        console.error('Failed to load Sanity content; using fallback content.', error)
      })
    return () => {
      alive = false
    }
  }, [])

  return <App content={content} />
}

createRoot(document.getElementById('root')).render(
  <Suspense fallback={null}>
    <BootstrapApp />
  </Suspense>
)
