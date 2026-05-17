import * as THREE from 'three'
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useCursor, MeshReflectorMaterial, Image, Text, Environment, Mask, useMask, Html } from '@react-three/drei'
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
const IMAGE_VIEW_SCALE = [0.85, 0.9, 1]
/**
 * Html is rasterized at its css size then magnified in 3D. On-screen size ≈ px × distanceFactor,
 * so for sharper images: multiply px only, divide distanceFactor by the same amount.
 */
const HTML_BASE_DISTANCE_FACTOR = 10
const HTML_RESOLUTION_SCALE = 6
const HTML_DISTANCE_FACTOR = HTML_BASE_DISTANCE_FACTOR / HTML_RESOLUTION_SCALE
const htmlPx = (units) => units * (400 / HTML_BASE_DISTANCE_FACTOR) * HTML_RESOLUTION_SCALE
/**
 * Html px = mask plane geometry; height ÷ φ cancels the frame mesh Y scale so the
 * box aligns with the opening on screen. Inset padding is applied inside .wrapper.
 */
const FRAME_HTML_W = htmlPx(FRAME_INNER_W)
const FRAME_HTML_H = htmlPx(FRAME_INNER_H / GOLDENRATIO)
const FRAME_PAD = `${((1 - IMAGE_VIEW_SCALE[0] / FRAME_INNER_W) / 2) * 100}%`
const SCROLL_INDEX_SCALE = 1 / 520
const SCROLL_DELTA_MAX = 0.12
const SNAP_DAMP = 14
const WHEEL_IDLE_MS = 140
/** Extra scroll at gallery ends (slide units) before advancing to the next panel. */
const PANEL_EDGE_OVERFLOW = 1.05
const EDGE_PULL_GAIN = 0.45
const PANEL_NAV_COOLDOWN_MS = 700
const CAMERA_INTRO = new THREE.Vector3(0, 2, 32)
const CAMERA_GALLERY = new THREE.Vector3(0, 0, 5.5)
const TITLE_POSITION = [0, 0, 25]
const INTRO_TARGET = new THREE.Vector3()
const LABEL_X = 0.55
const LABEL_Y = GOLDENRATIO
const DOT_GAP = 0.008
const DOT_SPACING = 0.026
const DOT_SIZE = 0.028

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

export const App = ({ images }) => {
  const meshyStore = useCreateStore()
  const titleTextStore = useCreateStore()
  const spotlightStore = useCreateStore()
  const scrollProgress = useRef(0)
  const [isEditor] = useRoute('/editor')
  const [, params] = useRoute('/item/:id')

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollProgress.current = max <= 0 ? 1 : Math.min(1, window.scrollY / max)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
        camera={{ fov: 70, position: CAMERA_INTRO.toArray() }}>
        <color attach="background" args={['#191920']} />
        <fog attach="fog" args={['#191920', 0, 40]} />
        <group position={TITLE_POSITION}>
          <TitleSpotlight />
          <MrNobodyTitle scale={7} />
        </group>
        <group position={[0, -0.5, 0]}>
          <CameraRig scrollProgress={scrollProgress} images={images} />
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
      </div>
    </LevaStoresContext.Provider>
  )
}

function CameraRig({ scrollProgress, images, q = new THREE.Quaternion(), p = new THREE.Vector3() }) {
  const framesRef = useRef()
  const clicked = useRef()
  const [, params] = useRoute('/item/:id')

  useEffect(() => {
    clicked.current = framesRef.current?.getObjectByName(params?.id)
    if (clicked.current) {
      clicked.current.parent.updateWorldMatrix(true, true)
      clicked.current.parent.localToWorld(p.set(0, GOLDENRATIO / 2, 1.25))
      clicked.current.parent.getWorldQuaternion(q)
    }
  }, [params?.id])

  useFrame((state, dt) => {
    if (params?.id && clicked.current) {
      easing.damp3(state.camera.position, p, 0.4, dt)
      easing.dampQ(state.camera.quaternion, q, 0.4, dt)
      return
    }

    const t = smoothstep(scrollProgress.current)
    INTRO_TARGET.copy(CAMERA_INTRO).lerp(CAMERA_GALLERY, t)
    easing.damp3(state.camera.position, INTRO_TARGET, 0.35, dt)
    q.identity()
    easing.dampQ(state.camera.quaternion, q, 0.35, dt)
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

function FrameGallery({ urls, initialIndex, onIndexChange, onScrollEdge }) {
  const scrollRef = useRef(null)
  const scrollPos = useRef(initialIndex)
  const wheeling = useRef(false)
  const wheelTimer = useRef(null)
  const edgePull = useRef(0)
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
    reportedIndex.current = clamped
    onIndexChange(clamped)
    const el = scrollRef.current
    if (el?.clientHeight) el.scrollTop = clamped * el.clientHeight
  }

  useLayoutEffect(() => {
    if (galleryNavLock.current) galleryWheelConsume.current = true
    scrollPos.current = initialIndex
    edgePull.current = 0
    reportedIndex.current = initialIndex
    const el = scrollRef.current
    if (el?.clientHeight) el.scrollTop = initialIndex * el.clientHeight
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
          edgePull.current += (next - lastIndex) * EDGE_PULL_GAIN
          if (edgePull.current >= PANEL_EDGE_OVERFLOW) {
            edgePull.current = 0
            goToPanel(1)
          }
        }
        return
      }

      if (next < lastIndex - 0.12 || next > 0.12) edgePull.current = 0
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
        el.scrollTop = scrollPos.current * el.clientHeight
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
      style={{ width: FRAME_HTML_W, height: FRAME_HTML_H, '--frame-pad': FRAME_PAD }}>
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

const FrameImage = forwardRef(function FrameImage({ stencil, ...props }, forwardedRef) {
  const localRef = useRef()
  const setRef = (node) => {
    localRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }
  useLayoutEffect(() => {
    const mat = localRef.current?.material
    if (mat) Object.assign(mat, stencil)
  }, [stencil])
  return <Image ref={setRef} raycast={() => null} {...props} />
})

function Frame({ id, title, urls, ...props }) {
  const image = useRef()
  const frame = useRef()
  const [, params] = useRoute('/item/:id')
  const [, setLocation] = useLocation()
  const [hovered, hover] = useState(false)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)
  const handleGalleryIndex = useCallback((index) => {
    setDisplayIndex(index)
  }, [])
  const [rnd] = useState(() => Math.random())
  const maskId = Number(id)
  const stencil = useMask(maskId)
  const isActive = params?.id === id
  const hasMultiple = urls.length > 1
  const imageScale = [
    IMAGE_VIEW_SCALE[0] * (!isActive && hovered ? 0.85 : 1),
    IMAGE_VIEW_SCALE[1] * (!isActive && hovered ? 0.905 : 1),
    1
  ]
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
      if (image.current) {
        const zoom = 2 + Math.sin(rnd * 10000 + state.clock.elapsedTime / 3) / 2
        if (image.current.material) {
          Object.assign(image.current.material, stencil)
          if (image.current.material.zoom != null) image.current.material.zoom = zoom
        }
        easing.damp3(image.current.scale, imageScale, 0.1, dt)
      }
    }
    easing.dampC(frame.current.material.color, hovered ? 'orange' : 'white', 0.1, dt)
  })

  return (
    <group {...props}>
      <mesh
        name={id}
        onPointerOver={(e) => (e.stopPropagation(), hover(true))}
        onPointerOut={() => hover(false)}
        scale={[1, GOLDENRATIO, 0.05]}
        position={[0, GOLDENRATIO / 2, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#151515" metalness={0.5} roughness={0.5} envMapIntensity={2} />
        <mesh ref={frame} raycast={() => null} scale={[0.9, 0.93, 0.9]} position={[0, 0, 0.2]}>
          <boxGeometry />
          <meshBasicMaterial toneMapped={false} fog={false} />
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
            />
          )}
        </Mask>
        {(!isActive || !hasMultiple) && (
          <FrameImage ref={image} stencil={stencil} position={[0, 0, 0.68]} url={urls[0]} scale={imageScale} />
        )}
      </mesh>
      <FrameLabel title={title} count={urls.length} index={displayIndex} />
    </group>
  )
}

function FrameLabel({ title, count, index }) {
  const [dotsY, setDotsY] = useState(LABEL_Y - 0.034)
  const onTitleSync = (troika) => {
    const bounds = troika.textRenderInfo?.blockBounds
    if (!bounds) return
    const minY = bounds[1]
    setDotsY(LABEL_Y + minY - DOT_GAP)
  }
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
    </>
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
