import * as THREE from 'three'
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useCursor, MeshReflectorMaterial, Image, Text, Environment, Mask, Html } from '@react-three/drei'
import { useRoute, useLocation } from 'wouter'
import { easing } from 'maath'
import { Leva, LevaPanel, useCreateStore } from 'leva'
import { MrNobodyTitle } from './MrNobodyTitle'
import { TitleSpotlight } from './TitleSpotlight'
import { LevaStoresContext } from './levaStores'
import { PANEL_ORDER } from './panelOrder'

const GOLDENRATIO = 1.61803398875
const FRAME_INNER_W = 0.9
const FRAME_INNER_H = GOLDENRATIO * 0.93
const FRAME_VIEW_W = 0.85
const FRAME_VIEW_RATIO = FRAME_VIEW_W / FRAME_INNER_W
const IMAGE_VIEW_SCALE = [FRAME_VIEW_W, FRAME_INNER_H * FRAME_VIEW_RATIO, 1]
/** Keep physical frame depth slim so adjacent angled panels do not intersect/clip each other. */
const FRAME_DEPTH_SCALE = 0.02
/** Set true to re-enable slow zoom on panel cover textures. */
const KEN_BURNS_ENABLED = false

/**
 * Html is rasterized at its css size then magnified in 3D. On-screen size ≈ px × distanceFactor,
 * so for sharper images: multiply px only, divide distanceFactor by the same amount.
 */
const HTML_BASE_DISTANCE_FACTOR = 10
const HTML_RESOLUTION_SCALE = 6
const HTML_DISTANCE_FACTOR = HTML_BASE_DISTANCE_FACTOR / HTML_RESOLUTION_SCALE
const htmlPx = (units) => units * (400 / HTML_BASE_DISTANCE_FACTOR) * HTML_RESOLUTION_SCALE
/**
 * Html px = mask plane geometry dimensions. Inset padding is applied inside .wrapper.
 */
const FRAME_HTML_W = htmlPx(FRAME_INNER_W)
const FRAME_HTML_H = htmlPx(FRAME_INNER_H)
const FRAME_PAD = `${((1 - FRAME_VIEW_RATIO) / 2) * 100}%`
const GALLERY_SLIDE_GAP = htmlPx(0.14)
const SCROLL_INDEX_SCALE = 1 / 520
const SCROLL_DELTA_MAX = 0.12
const SNAP_DAMP = 14
const WHEEL_IDLE_MS = 140
const COVER_HOVER_SCALE = 0.95
const COVER_HOVER_SPEED = 22
/** Extra scroll at gallery ends (slide units) before advancing to the next panel. */
const PANEL_EDGE_OVERFLOW = 1.05
const EDGE_PULL_GAIN = 0.45
const PANEL_NAV_COOLDOWN_MS = 700
const GALLERY_NAV_FADE_START = 0.5
const GALLERY_NAV_FADE_RANGE = 0.15
const CAMERA_INTRO = new THREE.Vector3(0, 2, 32)
const CAMERA_GALLERY = new THREE.Vector3(0, 0, 5.5)
const CAMERA_INTRO_NARROW = new THREE.Vector3(0, 1.8, 44)
const CAMERA_GALLERY_NARROW = new THREE.Vector3(0, 0.15, 6.7)
/** maath damp smooth time — lower is snappier, higher is slower. */
const CAMERA_PANEL_DAMP = 0.1
const CAMERA_INTRO_DAMP = 0.15
/** Local-space offset from a focused panel: [x, y, z]. Z controls stand-off distance. */
const CAMERA_PANEL_OFFSET = [0, GOLDENRATIO / 2, 1.25]
const CAMERA_PANEL_OFFSET_NARROW = [0, GOLDENRATIO / 2 + 0.08, 1.7]
const TITLE_POSITION = [0, 0, 25]
const TITLE_POSITION_NARROW = [0.2, 0, 25]
const TITLE_SCALE_DESKTOP = 7
const TITLE_SCALE_NARROW = 3.9
const INTRO_ASPECT_WIDE = 1.2
const INTRO_ASPECT_NARROW = 0.45
const INTRO_WIDTH_WIDE = 1200
const INTRO_WIDTH_NARROW = 360
const INTRO_TARGET = new THREE.Vector3()
const LABEL_X = 0.55
const LABEL_Y = GOLDENRATIO
const DOT_GAP = 0.008
const DOT_SPACING = 0.026
const DOT_SIZE = 0.028
const EDGE_HINT_W = 0.068
const EDGE_HINT_H = 0.0025
const EDGE_HINT_GAP = 0.01

function adjacentPanelId(id, delta) {
  const i = PANEL_ORDER.indexOf(id)
  if (i < 0) return null
  const j = i + delta
  return j >= 0 && j < PANEL_ORDER.length ? PANEL_ORDER[j] : null
}

/** When walking backward through the gallery, open the previous panel on its last image. */
const panelEnterState = { current: null }
/** Shared across gallery instances — refs reset on remount so momentum can't carry into the next panel. */
const galleryNavLock = { current: false }
const galleryWheelConsume = { current: false }

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function lerpArray(a, b, t) {
  return a.map((v, i) => THREE.MathUtils.lerp(v, b[i], t))
}

export const App = ({ images }) => {
  const meshyStore = useCreateStore()
  const titleTextStore = useCreateStore()
  const spotlightStore = useCreateStore()
  const scrollProgress = useRef(0)
  const galleryNavRef = useRef(null)
  const galleryNavOpacityRef = useRef(0)
  const galleryNavVisibleRef = useRef(false)
  const [isEditor] = useRoute('/editor')
  const [isAbout] = useRoute('/about')
  const [isContact] = useRoute('/contact')
  const [, params] = useRoute('/item/:id')
  const [, setLocation] = useLocation()
  const [viewportSize, setViewportSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight })
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const viewportAspect = viewportSize.h > 0 ? viewportSize.w / viewportSize.h : INTRO_ASPECT_WIDE
  const introBlendByAspect = THREE.MathUtils.inverseLerp(INTRO_ASPECT_WIDE, INTRO_ASPECT_NARROW, viewportAspect)
  const introBlendByWidth = THREE.MathUtils.inverseLerp(INTRO_WIDTH_WIDE, INTRO_WIDTH_NARROW, viewportSize.w)
  const introBlend = THREE.MathUtils.clamp(Math.max(introBlendByAspect, introBlendByWidth), 0, 1)

  const introCamera = useMemo(
    () => CAMERA_INTRO.clone().lerp(CAMERA_INTRO_NARROW, introBlend),
    [introBlend]
  )
  const galleryCamera = useMemo(
    () => CAMERA_GALLERY.clone().lerp(CAMERA_GALLERY_NARROW, introBlend),
    [introBlend]
  )
  const panelCameraOffset = useMemo(
    () => lerpArray(CAMERA_PANEL_OFFSET, CAMERA_PANEL_OFFSET_NARROW, introBlend),
    [introBlend]
  )
  const titleScale = THREE.MathUtils.lerp(TITLE_SCALE_DESKTOP, TITLE_SCALE_NARROW, introBlend)
  const titlePosition = useMemo(
    () => lerpArray(TITLE_POSITION, TITLE_POSITION_NARROW, introBlend),
    [introBlend]
  )

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max <= 0 ? 1 : Math.min(1, window.scrollY / max)
      scrollProgress.current = progress
      const fadeProgress = (progress - GALLERY_NAV_FADE_START) / GALLERY_NAV_FADE_RANGE
      const nextOpacity = params?.id ? 0 : isAbout || isContact ? 1 : THREE.MathUtils.clamp(fadeProgress, 0, 1)
      if (Math.abs(galleryNavOpacityRef.current - nextOpacity) > 0.01) {
        galleryNavOpacityRef.current = nextOpacity
        if (galleryNavRef.current) galleryNavRef.current.style.opacity = nextOpacity.toFixed(3)
      }
      const nextVisible = nextOpacity > 0.02
      if (nextVisible !== galleryNavVisibleRef.current) {
        galleryNavVisibleRef.current = nextVisible
        if (galleryNavRef.current) galleryNavRef.current.style.pointerEvents = nextVisible ? 'auto' : 'none'
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [params?.id, isAbout, isContact])

  useEffect(() => {
    const onWheel = (e) => {
      if (params?.id || !e.target.closest?.('canvas')) return
      if (e.target.closest?.('.case-study-overlay')) return
      e.preventDefault()
      window.scrollBy({ top: e.deltaY })
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [params?.id])

  return (
    <LevaStoresContext.Provider value={{ meshyStore, titleTextStore, spotlightStore }}>
      <div className="app">
      <nav ref={galleryNavRef} className={`gallery-nav${isAbout || isContact ? ' is-light' : ''}`}>
        <div className="gallery-nav__spacer" aria-hidden />
        <button type="button" className="gallery-nav__brand gallery-nav__action" onClick={() => setLocation('/')}>
          Mr Nobody
        </button>
        <div className="gallery-nav__links">
          <button
            type="button"
            className={`gallery-nav__action gallery-nav__link${isAbout ? ' is-active' : ''}`}
            onClick={() => setLocation('/about')}>
            About
          </button>
          <button
            type="button"
            className={`gallery-nav__action gallery-nav__link${isContact ? ' is-active' : ''}`}
            onClick={() => setLocation('/contact')}>
            Contact
          </button>
        </div>
      </nav>
      <Leva hidden />
      {isEditor && (
        <div className="leva-panels">
          <LevaPanel
            store={meshyStore}
            collapsed
            titleBar={{ title: 'Meshy material', drag: true, filter: false }}
          />
          <LevaPanel
            store={titleTextStore}
            collapsed
            titleBar={{ title: 'Title text', drag: true, filter: false }}
          />
          <LevaPanel
            store={spotlightStore}
            collapsed
            titleBar={{ title: 'Title spotlight', drag: true, filter: false }}
          />
        </div>
      )}
      <div className="scroll-spacer" aria-hidden />
      <Canvas
        className="scene-canvas"
        dpr={[1, 1.5]}
        gl={{ stencil: true }}
        camera={{ fov: 70, position: introCamera.toArray() }}>
        <color attach="background" args={['#191920']} />
        <fog attach="fog" args={['#191920', 0, 40]} />
        <group position={titlePosition}>
          <TitleSpotlight />
          <MrNobodyTitle scale={titleScale} />
        </group>
        <group position={[0, -0.5, 0]}>
          <CameraRig
            scrollProgress={scrollProgress}
            images={images}
            introCamera={introCamera}
            galleryCamera={galleryCamera}
            panelCameraOffset={panelCameraOffset}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[70, 70]} />
            <MeshReflectorMaterial
              blur={[300, 100]}
              resolution={2048}
              mixBlur={1}
              mixStrength={40}
              roughness={1}
              depthScale={1.2}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color="#050505"
              metalness={0.5}
            />
          </mesh>
        </group>
        <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
      </Canvas>
      <CaseStudyOverlay panels={images} />
      <AboutOverlay isOpen={isAbout} onClose={() => setLocation('/')} />
      <ContactOverlay isOpen={isContact} onClose={() => setLocation('/')} />
      </div>
    </LevaStoresContext.Provider>
  )
}

function CameraRig({ scrollProgress, images, introCamera, galleryCamera, panelCameraOffset, q = new THREE.Quaternion(), p = new THREE.Vector3() }) {
  const framesRef = useRef()
  const clicked = useRef()
  const [, params] = useRoute('/item/:id')

  useEffect(() => {
    clicked.current = framesRef.current?.getObjectByName(params?.id)
    if (clicked.current) {
      clicked.current.parent.updateWorldMatrix(true, true)
      clicked.current.parent.localToWorld(p.set(...panelCameraOffset))
      clicked.current.parent.getWorldQuaternion(q)
    }
  }, [params?.id, panelCameraOffset])

  useFrame((state, dt) => {
    if (params?.id && clicked.current) {
      easing.damp3(state.camera.position, p, CAMERA_PANEL_DAMP, dt)
      easing.dampQ(state.camera.quaternion, q, CAMERA_PANEL_DAMP, dt)
      return
    }

    const t = smoothstep(scrollProgress.current)
    INTRO_TARGET.copy(introCamera).lerp(galleryCamera, t)
    easing.damp3(state.camera.position, INTRO_TARGET, CAMERA_INTRO_DAMP, dt)
    q.identity()
    easing.dampQ(state.camera.quaternion, q, CAMERA_INTRO_DAMP, dt)
  })

  return <Frames ref={framesRef} images={images} />
}

function CaseStudyOverlay({ panels }) {
  const [, params] = useRoute('/item/:id')
  const [, setLocation] = useLocation()
  const panel = panels.find((p) => p.id === params?.id)
  const isOpen = Boolean(panel)
  const { caseStudy } = panel || {}

  return (
    <aside className={`case-study-overlay${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      {panel && (
        <div className="case-study-overlay__panel">
          <button type="button" className="case-study-overlay__close" onClick={() => setLocation('/')} aria-label="Close case study">
            ×
          </button>
          <p className="case-study-overlay__eyebrow">Case study</p>
          <h2 className="case-study-overlay__title">{caseStudy.headline}</h2>
          <p className="case-study-overlay__meta">
            {caseStudy.year} · {caseStudy.role}
          </p>
          <p className="case-study-overlay__summary">{caseStudy.summary}</p>
          <ul className="case-study-overlay__tags">
            {caseStudy.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <div className="case-study-overlay__body">
            {caseStudy.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function AboutOverlay({ isOpen, onClose }) {
  return (
    <section className={`about-page${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="about-page__sheet">
        <div className="about-page__content">
          <button type="button" className="about-page__close" onClick={onClose} aria-label="Close about page">
            ×
          </button>
          <h2 className="about-page__title">Mr Nobody</h2>
          <p className="about-page__lead">
            nobody knows because Nobody doesn&apos;t know. The &quot;brand&quot; is just a collection of tangible objects inspired
            by anything.
          </p>
          <p>
            Perhaps it draws a certain audience, maybe it doesn&apos;t draw one at all. Nobody doesn&apos;t care if nobody cares
            because Nobody cares.
          </p>
          <p>
            Nobody likes making things for Nobody. So, nobody could like it and nobody could hate it and Nobody will still make
            it for Nobody.
          </p>
          <p className="about-page__closing">The brand is for Nobody and for anybody that enjoys the things Nobody does.</p>
        </div>
      </div>
    </section>
  )
}

function ContactOverlay({ isOpen, onClose }) {
  return (
    <section className={`about-page contact-page${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="about-page__sheet">
        <div className="about-page__content">
          <button type="button" className="about-page__close" onClick={onClose} aria-label="Close contact page">
            ×
          </button>
          <h2 className="about-page__title">Contact</h2>
          <p className="about-page__lead">For projects, commissions, styling, and creative collaborations.</p>
          <a className="contact-page__link" href="mailto:hello@mrnobody.studio">
            whosmrnobody@gmail.com
          </a>
          <a className="contact-page__link" href="https://instagram.com/mrnobody" target="_blank" rel="noreferrer">
            @whosmrnobody.io
          </a>
          <p className="about-page__closing">Based in Philadelphia. Working worldwide.</p>
        </div>
      </div>
    </section>
  )
}

const Frames = forwardRef(function Frames({ images }, ref) {
  const clicked = useRef()
  const [, params] = useRoute('/item/:id')
  const [, setLocation] = useLocation()
  useEffect(() => {
    clicked.current = ref?.current?.getObjectByName(params?.id)
  }, [params?.id, ref])
  return (
    <group
      ref={ref}
      onClick={(e) => (e.stopPropagation(), setLocation(clicked.current === e.object ? '/' : '/item/' + e.object.name))}
      onPointerMissed={() => setLocation('/')}>
      {images.map((props) => (
        <Frame key={props.id} {...props} />
      ))}
    </group>
  )
})

function FrameGallery({ urls, initialIndex, onIndexChange, onScrollEdge, edgeHintRef }) {
  const scrollRef = useRef(null)
  const scrollPos = useRef(initialIndex)
  const wheeling = useRef(false)
  const wheelTimer = useRef(null)
  const edgePull = useRef(0)
  const edgeDirection = useRef(0)
  const touchY = useRef(null)
  const touchGallery = useRef(false)
  const reportedIndex = useRef(initialIndex)
  const lastIndex = urls.length - 1

  const setIndex = (next) => {
    const clamped = Math.max(0, Math.min(lastIndex, Math.round(next)))
    if (reportedIndex.current === clamped) return
    reportedIndex.current = clamped
    onIndexChange(clamped)
  }

  const goToPanel = (direction) => {
    if (galleryNavLock.current) return
    galleryNavLock.current = true
    galleryWheelConsume.current = true
    edgePull.current = 0
    edgeDirection.current = 0
    onScrollEdge(direction)
    setTimeout(() => {
      galleryNavLock.current = false
      galleryWheelConsume.current = false
    }, PANEL_NAV_COOLDOWN_MS)
  }

  const snapTo = (index) => {
    const clamped = Math.max(0, Math.min(lastIndex, index))
    scrollPos.current = clamped
    edgePull.current = 0
    edgeDirection.current = 0
    reportedIndex.current = clamped
    onIndexChange(clamped)
    const el = scrollRef.current
    if (el?.clientHeight) el.scrollTop = clamped * (el.clientHeight + GALLERY_SLIDE_GAP)
  }

  useLayoutEffect(() => {
    if (galleryNavLock.current) galleryWheelConsume.current = true
    scrollPos.current = initialIndex
    edgePull.current = 0
    edgeDirection.current = 0
    reportedIndex.current = initialIndex
    const el = scrollRef.current
    if (el?.clientHeight) el.scrollTop = initialIndex * (el.clientHeight + GALLERY_SLIDE_GAP)
    onIndexChange(initialIndex)
  }, [initialIndex, onIndexChange])

  useEffect(() => {
    const scheduleWheelIdle = () => {
      clearTimeout(wheelTimer.current)
      wheelTimer.current = setTimeout(() => {
        wheeling.current = false
        galleryWheelConsume.current = false
      }, WHEEL_IDLE_MS)
    }

    const markWheeling = () => {
      wheeling.current = true
      scheduleWheelIdle()
    }

    const advance = (direction) => {
      const target = Math.round(scrollPos.current) + direction
      if (target >= 0 && target <= lastIndex) snapTo(target)
      else goToPanel(direction)
    }

    const applyScrollDelta = (delta) => {
      if (galleryNavLock.current || galleryWheelConsume.current) {
        scheduleWheelIdle()
        return
      }
      markWheeling()

      const next = scrollPos.current + delta

      if (next < 0) {
        const wasAtStart = scrollPos.current <= 0.02
        scrollPos.current = 0
        setIndex(0)
        if (delta < 0 && wasAtStart) {
          edgeDirection.current = -1
          edgePull.current += -next * EDGE_PULL_GAIN
          if (edgePull.current >= PANEL_EDGE_OVERFLOW) {
            edgePull.current = 0
            goToPanel(-1)
          }
        }
        return
      }

      if (next > lastIndex) {
        const wasAtEnd = scrollPos.current >= lastIndex - 0.02
        scrollPos.current = lastIndex
        setIndex(lastIndex)
        if (delta > 0 && wasAtEnd) {
          edgeDirection.current = 1
          edgePull.current += (next - lastIndex) * EDGE_PULL_GAIN
          if (edgePull.current >= PANEL_EDGE_OVERFLOW) {
            edgePull.current = 0
            goToPanel(1)
          }
        }
        return
      }

      if (next < lastIndex - 0.12 || next > 0.12) {
        edgePull.current = 0
        edgeDirection.current = 0
      }
      scrollPos.current = next
      setIndex(Math.round(next))
    }

    const onWheel = (e) => {
      if (e.target.closest?.('.case-study-overlay')) return
      e.preventDefault()
      const raw = e.deltaY * SCROLL_INDEX_SCALE
      const delta = Math.sign(raw) * Math.min(Math.abs(raw), SCROLL_DELTA_MAX)
      applyScrollDelta(delta)
    }

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      if (e.target.closest?.('.case-study-overlay')) return
      if (!e.target.closest?.('canvas, .content, .wrapper, .frame-gallery')) return
      touchGallery.current = true
      touchY.current = e.touches[0].clientY
    }

    const onTouchEnd = () => {
      touchGallery.current = false
      touchY.current = null
    }

    const onTouchMove = (e) => {
      if (!touchGallery.current || e.touches.length !== 1 || touchY.current == null) return
      if (e.target.closest?.('.case-study-overlay')) return
      const y = e.touches[0].clientY
      const dy = touchY.current - y
      touchY.current = y
      if (Math.abs(dy) < 2) return
      e.preventDefault()
      const delta = Math.sign(dy) * Math.min(Math.abs(dy) * SCROLL_INDEX_SCALE, SCROLL_DELTA_MAX)
      applyScrollDelta(delta)
    }

    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        advance(1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        advance(-1)
      }
    }

    let raf
    let last = performance.now()
    const tick = (now) => {
      const el = scrollRef.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (el?.clientHeight) {
        if (!wheeling.current) {
          const snap = Math.round(scrollPos.current)
          scrollPos.current = THREE.MathUtils.damp(scrollPos.current, snap, SNAP_DAMP, dt)
        }
        setIndex(scrollPos.current)
        el.scrollTop = scrollPos.current * (el.clientHeight + GALLERY_SLIDE_GAP)
      }

      if (edgeHintRef) {
        edgeHintRef.current.progress = Math.min(1, edgePull.current / PANEL_EDGE_OVERFLOW)
        edgeHintRef.current.direction = edgeDirection.current
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(wheelTimer.current)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [urls.length, lastIndex, onIndexChange, onScrollEdge])

  return (
    <Html
      className="content"
      transform
      occlude
      distanceFactor={HTML_DISTANCE_FACTOR}
      position={[0, 0, 0.01]}
      style={{
        width: FRAME_HTML_W,
        height: FRAME_HTML_H,
        '--frame-pad': FRAME_PAD,
        '--gallery-slide-gap': `${GALLERY_SLIDE_GAP}px`
      }}>
      <div className="wrapper" onPointerDown={(e) => e.stopPropagation()}>
        <div ref={scrollRef} className="frame-gallery">
          {urls.map((url) => (
            <div key={url} className="frame-gallery__slide">
              <img src={url} alt="" draggable={false} />
            </div>
          ))}
        </div>
      </div>
    </Html>
  )
}

const FrameImage = forwardRef(function FrameImage({ url, scale = IMAGE_VIEW_SCALE, ...props }, forwardedRef) {
  const localRef = useRef()
  const setRef = (node) => {
    localRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }
  const meshScale = Array.isArray(scale) ? [scale[0], scale[1], scale[2] ?? 1] : scale
  return <Image ref={setRef} raycast={() => null} url={url} scale={meshScale} {...props} />
})

function Frame({ id, title, urls, ...props }) {
  const image = useRef()
  const frame = useRef()
  const hoverScaleTarget = useRef(new THREE.Vector3(...IMAGE_VIEW_SCALE))
  const [, params] = useRoute('/item/:id')
  const [, setLocation] = useLocation()
  const [hovered, hover] = useState(false)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)
  const edgeHint = useRef({ progress: 0, direction: 0 })
  const handleGalleryIndex = useCallback((index) => {
    setDisplayIndex(index)
  }, [])
  const maskId = Number(id)
  const isActive = params?.id === id
  const hasMultiple = urls.length > 1
  const hoverScale = !isActive && hovered ? COVER_HOVER_SCALE : 1
  const imageScale = [IMAGE_VIEW_SCALE[0] * hoverScale, IMAGE_VIEW_SCALE[1] * hoverScale, 1]
  useCursor(hovered)

  const focusAdjacentPanel = useCallback(
    (direction) => {
      const nextId = adjacentPanelId(id, direction)
      if (!nextId) return
      if (direction < 0) panelEnterState.current = { id: nextId, atLast: true }
      setLocation('/item/' + nextId)
    },
    [id, setLocation]
  )

  useEffect(() => {
    if (!isActive) {
      setDisplayIndex(0)
      edgeHint.current = { progress: 0, direction: 0 }
      return
    }
    let initial = 0
    if (panelEnterState.current?.id === id) {
      initial = panelEnterState.current.atLast ? urls.length - 1 : 0
      panelEnterState.current = null
    }
    setGalleryInitialIndex(initial)
    setDisplayIndex(initial)
  }, [isActive, id, urls.length])

  useEffect(() => {
    if (!isActive || hasMultiple) return
    const advance = (direction) => focusAdjacentPanel(direction)
    const onWheel = (e) => {
      if (e.target.closest?.('.case-study-overlay')) return
      e.preventDefault()
      if (e.deltaY > 0) advance(1)
      else if (e.deltaY < 0) advance(-1)
    }
    let touchStartY = null
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      if (e.target.closest?.('.case-study-overlay')) return
      if (!e.target.closest?.('canvas')) return
      touchStartY = e.touches[0].clientY
    }
    const onTouchEnd = (e) => {
      if (touchStartY == null) return
      const y = e.changedTouches[0]?.clientY
      if (y == null) return
      const dy = touchStartY - y
      touchStartY = null
      if (Math.abs(dy) < 48) return
      advance(dy > 0 ? 1 : -1)
    }
    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        advance(1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        advance(-1)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isActive, hasMultiple, id, setLocation, focusAdjacentPanel])

  useFrame((state, dt) => {
    if (!isActive || hasMultiple) {
      if (image.current?.material) {
        if (image.current.material.zoom != null) {
          image.current.material.zoom = KEN_BURNS_ENABLED
            ? 2 + Math.sin(state.clock.elapsedTime / 3) / 2
            : 1
        }
        hoverScaleTarget.current.set(imageScale[0], imageScale[1], imageScale[2])
        image.current.scale.lerp(hoverScaleTarget.current, 1 - Math.exp(-COVER_HOVER_SPEED * dt))
      }
    }
  })

  return (
    <group {...props}>
      <mesh
        name={id}
        onPointerOver={(e) => (e.stopPropagation(), hover(true))}
        onPointerOut={() => hover(false)}
        scale={[1, 1, FRAME_DEPTH_SCALE]}
        position={[0, GOLDENRATIO / 2, 0]}>
        <boxGeometry args={[1, GOLDENRATIO, 1]} />
        <meshStandardMaterial color="#151515" metalness={0.5} roughness={0.5} envMapIntensity={2} />
        <mesh ref={frame} raycast={() => null} scale={[0.9, 0.93, 0.9]} position={[0, 0, 0.2]}>
          <boxGeometry />
          <meshBasicMaterial toneMapped={false} fog={false} transparent opacity={0} depthWrite={false} />
        </mesh>
        <Mask id={maskId} position={[0, 0, 0.68]} renderOrder={-maskId} raycast={() => null}>
          <planeGeometry args={[FRAME_INNER_W, FRAME_INNER_H]} />
          {isActive && hasMultiple && (
            <FrameGallery
              key={`${id}-${galleryInitialIndex}`}
              urls={urls}
              initialIndex={galleryInitialIndex}
              onIndexChange={handleGalleryIndex}
              onScrollEdge={focusAdjacentPanel}
              edgeHintRef={edgeHint}
            />
          )}
        </Mask>
        {(!isActive || !hasMultiple) && (
          <FrameImage ref={image} position={[0, 0, 0.68]} url={urls[0]} scale={IMAGE_VIEW_SCALE} />
        )}
      </mesh>
      <FrameLabel title={title} count={urls.length} index={displayIndex} edgeHintRef={isActive && hasMultiple ? edgeHint : null} />
    </group>
  )
}

function FrameLabel({ title, count, index, edgeHintRef }) {
  const [dotsY, setDotsY] = useState(LABEL_Y - 0.034)
  const onTitleSync = (troika) => {
    const bounds = troika.textRenderInfo?.blockBounds
    if (!bounds) return
    const minY = bounds[1]
    setDotsY(LABEL_Y + minY - DOT_GAP)
  }
  const hintY = dotsY - DOT_SIZE - EDGE_HINT_GAP
  return (
    <>
      <Text
        maxWidth={0.1}
        anchorX="left"
        anchorY="top"
        position={[LABEL_X, LABEL_Y, 0]}
        fontSize={0.025}
        onSync={onTitleSync}>
        {title}
      </Text>
      <DotIndicator count={count} index={index} y={dotsY} />
      {edgeHintRef && (
        <group position={[LABEL_X, hintY, 0]}>
          <PanelEdgeHint edgeHintRef={edgeHintRef} />
        </group>
      )}
    </>
  )
}

function PanelEdgeHint({ edgeHintRef }) {
  const fillRef = useRef()
  const progress = useRef(0)
  const opacity = useRef(0)
  const direction = useRef(1)

  useFrame((_, dt) => {
    const fill = fillRef.current
    if (!fill) return

    const { progress: targetP, direction: targetD } = edgeHintRef.current
    const active = targetP > 0.001 && targetD !== 0
    const targetProgress = active ? targetP : 0
    const targetOpacity = active ? 0.22 + targetP * 0.45 : 0

    progress.current = THREE.MathUtils.damp(progress.current, targetProgress, 12, dt)
    opacity.current = THREE.MathUtils.damp(opacity.current, targetOpacity, 12, dt)
    if (active) direction.current = targetD

    const w = progress.current * EDGE_HINT_W
    fill.scale.x = Math.max(progress.current, 0.0001)
    fill.material.opacity = opacity.current
    fill.position.x = direction.current > 0 ? w / 2 : EDGE_HINT_W - w / 2
    fill.visible = opacity.current > 0.01
  })

  return (
    <mesh ref={fillRef} visible={false}>
      <planeGeometry args={[EDGE_HINT_W, EDGE_HINT_H]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} fog={false} />
    </mesh>
  )
}

function DotIndicator({ count, index, y }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Text
          key={i}
          anchorX="left"
          anchorY="top"
          position={[LABEL_X + i * DOT_SPACING, y, 0]}
          fontSize={DOT_SIZE}
          color={i === index ? '#ffffff' : '#666666'}>
          •
        </Text>
      ))}
    </>
  )
}
