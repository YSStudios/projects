import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'

const asset = (name) => `${process.env.PUBLIC_URL}/gallery/${name}`

const files = [
  '01-mannequin-wires.png',
  '02-soundwave-dress.png',
  '03-mesh-top.png',
  '04-denim-patchwork.png',
  '05-deconstructed-jeans.png',
  '06-wiring-harness.png',
  '07-patchwork-vest.png',
  '08-printed-jacket.png',
  '09-printed-jacket-detail.png'
]

const triple = (name) => {
  const i = files.indexOf(name)
  return [0, 1, 2].map((j) => asset(files[(i + j) % files.length]))
}

const caseStudy = (headline, summary, role = 'Fashion & technology', year = '2024', tags = ['Experimental', 'Wearable']) => ({
  headline,
  summary,
  role,
  year,
  tags,
  body: [
    'Exploring the intersection of garment construction, embedded systems, and interactive presentation.',
    'This study documents material experiments, prototyping iterations, and the final installation outcome.'
  ]
})

const panel = (id, title, primary, position, rotation, study) => ({
  id,
  title,
  urls: triple(primary),
  position,
  rotation,
  caseStudy: study
})

const images = [
  panel(
    'mannequin',
    'Mannequin Wires',
    '01-mannequin-wires.png',
    [0, 0, 1.5],
    [0, 0, 0],
    caseStudy('Mannequin Wires', 'A wearable electronics rig mapped directly onto a dress form, treating the body as both canvas and circuit.')
  ),
  panel(
    'soundwave-dress',
    'Soundwave Dress',
    '02-soundwave-dress.png',
    [-0.8, 0, -0.6],
    [0, 0, 0],
    caseStudy('Soundwave Dress', 'Digital print and negative-space construction shaped into a column dress with halter structure and side cutouts.')
  ),
  panel(
    'mesh-top',
    'Mesh Top',
    '03-mesh-top.png',
    [0.8, 0, -0.6],
    [0, 0, 0],
    caseStudy('Mesh Top', 'Sheer mesh with engineered stripe motif — flat patterning translated into a sculptural mock-neck silhouette.')
  ),
  panel(
    'denim-patchwork',
    'Denim Patchwork',
    '04-denim-patchwork.png',
    [-1.75, 0, 0.25],
    [0, Math.PI / 2.5, 0],
    caseStudy('Denim Patchwork', 'Deconstructed denim fragments reassembled into an asymmetric wrap with raw edges and mixed washes.')
  ),
  panel(
    'deconstructed-jeans',
    'Deconstructed Jeans',
    '05-deconstructed-jeans.png',
    [-2.15, 0, 1.5],
    [0, Math.PI / 2.5, 0],
    caseStudy('Deconstructed Jeans', 'Segmented denim separated at the thigh and rejoined with hardware chains and medallion connectors.')
  ),
  panel(
    'wiring-harness',
    'Wiring Harness',
    '06-wiring-harness.png',
    [-2, 0, 2.75],
    [0, Math.PI / 2.5, 0],
    caseStudy('Wiring Harness', 'Industrial cable harness laid out as artifact — precision termination and bundle discipline as design language.', 'Systems', '2023', [
      'Hardware',
      'Process'
    ])
  ),
  panel(
    'patchwork-vest',
    'Patchwork Vest',
    '07-patchwork-vest.png',
    [1.75, 0, 0.25],
    [0, -Math.PI / 2.5, 0],
    caseStudy('Patchwork Vest', 'Fur-collared vest built from reclaimed denim blocks with intentional distressing and tonal contrast.')
  ),
  panel(
    'printed-jacket',
    'Printed Jacket',
    '08-printed-jacket.png',
    [2.15, 0, 1.5],
    [0, -Math.PI / 2.5, 0],
    caseStudy('Printed Jacket', 'All-over celestial print with gradient hem, finished with heavy-duty spring clips instead of conventional closure.')
  ),
  panel(
    'jacket-detail',
    'Jacket Detail',
    '09-printed-jacket-detail.png',
    [2, 0, 2.75],
    [0, -Math.PI / 2.5, 0],
    caseStudy('Jacket Detail', 'Close study of clip hardware, print registration, and cuff color falloff on the finished garment.')
  )
]

createRoot(document.getElementById('root')).render(
  <Suspense fallback={null}>
    <App images={images} />
  </Suspense>
)
