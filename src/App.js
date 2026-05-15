import * as THREE from 'three'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useCursor, MeshReflectorMaterial, Image, Text, Environment } from '@react-three/drei'
import { useRoute, useLocation } from 'wouter'
import { easing } from 'maath'
import { MrNobodyTitle } from './MrNobodyTitle'

const GOLDENRATIO = 1.61803398875
const SCROLL_THRESHOLD = 900
const CAMERA_INTRO = new THREE.Vector3(0, 2, 32)
const CAMERA_GALLERY = new THREE.Vector3(0, 0, 5.5)
const TITLE_POSITION = [0, 0, 25]
const INTRO_TARGET = new THREE.Vector3()
const LABEL_X = 0.55
const LABEL_Y = GOLDENRATIO
const DOT_GAP = 0.008
const DOT_SPACING = 0.026
const DOT_SIZE = 0.028

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

export const App = ({ images }) => {
  const scrollProgress = useRef(0)
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
    <div className="app">
      <div className="scroll-spacer" aria-hidden />
      <Canvas
        className="scene-canvas"
        dpr={[1, 1.5]}
        camera={{ fov: 70, position: CAMERA_INTRO.toArray() }}>
        <color attach="background" args={['#191920']} />
        <fog attach="fog" args={['#191920', 0, 40]} />
        <MrNobodyTitle position={TITLE_POSITION} scale={7} />
        <group position={[0, -0.5, 0]}>
          <CameraRig scrollProgress={scrollProgress} images={images} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 50]} />
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

function Frame({ id, title, urls, ...props }) {
  const image = useRef()
  const frame = useRef()
  const scrollAccum = useRef(0)
  const [, params] = useRoute('/item/:id')
  const [hovered, hover] = useState(false)
  const [index, setIndex] = useState(0)
  const [rnd] = useState(() => Math.random())
  const isActive = params?.id === id
  const hasMultiple = urls.length > 1
  const displayIndex = isActive ? index : 0
  useCursor(hovered)
  useEffect(() => {
    if (!isActive) {
      setIndex(0)
      scrollAccum.current = 0
    }
  }, [isActive])
  useEffect(() => {
    if (!isActive || !hasMultiple) return
    const step = (direction) => {
      setIndex((current) => Math.max(0, Math.min(urls.length - 1, current + direction)))
    }
    const onWheel = (e) => {
      if (e.target.closest?.('.case-study-overlay')) return
      e.preventDefault()
      scrollAccum.current += e.deltaY
      if (Math.abs(scrollAccum.current) < SCROLL_THRESHOLD) return
      step(scrollAccum.current > 0 ? 1 : -1)
      scrollAccum.current = 0
    }
    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isActive, hasMultiple, urls.length])
  useFrame((state, dt) => {
    if (image.current?.material) {
      image.current.material.zoom = 2 + Math.sin(rnd * 10000 + state.clock.elapsedTime / 3) / 2
    }
    easing.damp3(image.current.scale, [0.85 * (!isActive && hovered ? 0.85 : 1), 0.9 * (!isActive && hovered ? 0.905 : 1), 1], 0.1, dt)
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
        <Image ref={image} raycast={() => null} position={[0, 0, 0.7]} url={urls[displayIndex]} key={urls[displayIndex]} />
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
