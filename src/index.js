import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'

const img = (file) => `${process.env.PUBLIC_URL || ''}/gallery/${file}`

const images = [
  // Front
  { position: [0, 0, 1.5], rotation: [0, 0, 0], url: img('01-mannequin-wires.png'), title: 'Mannequin Wires' },
  // Back
  { position: [-0.8, 0, -0.6], rotation: [0, 0, 0], url: img('02-pink-dress.png'), title: 'Pink Dress' },
  { position: [0.8, 0, -0.6], rotation: [0, 0, 0], url: img('03-mesh-top.png'), title: 'Mesh Top' },
  { position: [0, 0, -1.4], rotation: [0, 0, 0], url: img('10-printed-jacket-detail.png'), title: 'Printed Jacket' },
  // Left
  { position: [-1.75, 0, 0.25], rotation: [0, Math.PI / 2.5, 0], url: img('04-patchwork-skirt.png'), title: 'Patchwork Skirt' },
  { position: [-2.15, 0, 1.5], rotation: [0, Math.PI / 2.5, 0], url: img('05-chain-pants.png'), title: 'Chain Pants' },
  { position: [-2, 0, 2.75], rotation: [0, Math.PI / 2.5, 0], url: img('06-wiring-harness.png'), title: 'Wiring Harness' },
  // Right
  { position: [1.75, 0, 0.25], rotation: [0, -Math.PI / 2.5, 0], url: img('07-denim-vest.png'), title: 'Denim Vest' },
  { position: [2.15, 0, 1.5], rotation: [0, -Math.PI / 2.5, 0], url: img('08-printed-jacket.png'), title: 'Printed Jacket II' },
  { position: [2, 0, 2.75], rotation: [0, -Math.PI / 2.5, 0], url: img('09-printed-jacket-alt.png'), title: 'Printed Jacket III' }
]

createRoot(document.getElementById('root')).render(
  <Suspense fallback={null}>
    <App images={images} />
  </Suspense>
)
