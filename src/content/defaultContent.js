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

const caseStudy = (
  headline,
  summary,
  role = 'Fashion & technology',
  year = '2024',
  tags = ['Experimental', 'Wearable'],
  body = [
    'Exploring the intersection of garment construction, embedded systems, and interactive presentation.',
    'This study documents material experiments, prototyping iterations, and the final installation outcome.'
  ]
) => ({
  headline,
  summary,
  role,
  year,
  tags,
  body
})

const panel = (id, title, primary, position, rotation, study, urlsOverride) => ({
  id,
  title,
  urls: urlsOverride ?? triple(primary),
  position,
  rotation,
  caseStudy: study
})

export const defaultPanels = [
  panel(
    '1',
    'Waveform Mesh Tops',
    '01-mannequin-wires.png',
    [0, 0, 2.5],
    [0, 0, 0],
    caseStudy(
      'Waveform Mesh Tops',
      'Patterned sheer high-neck tops shown across fit variations, focused on stripe alignment and drape.',
      'Garment study',
      '2024',
      ['Mesh', 'Pattern placement'],
      [
        'This set documents the same black-and-cream motif across multiple top constructions, from clean flat lay to softer draped presentation.',
        'The emphasis is on how the vertical columns stay visually consistent while sleeve shape, neckline finish, and fabric tension change.'
      ]
    ),
    [asset('01-panel1-1.png'), asset('01-panel1-3.png'), asset('01-panel1-4.png')]
  ),
  panel(
    '2',
    'Printed Trousers Study',
    '06-wiring-harness.png',
    [-2.5, 0, 2.75],
    [0, Math.PI / 2.5, 0],
    caseStudy(
      'Printed Trousers Study',
      'Printed straight-leg pants paired with a textile close-up to show motif scale and surface texture.',
      'Print development',
      '2024',
      ['Textile print', 'Trousers'],
      [
        'The first frame presents the full trouser silhouette, while the second isolates the repeat pattern as raw material.',
        'Together they map how the mirrored teal-black graphic translates from yardage into panel placement on the finished garment.'
      ]
    ),
    [asset('02-panel2-1.png'), asset('02-panel2-2.png')]
  ),
  panel(
    '3',
    'Hooded Mesh Tunic',
    '05-deconstructed-jeans.png',
    [-2.15, 0, 1.5],
    [0, Math.PI / 2.5, 0],
    caseStudy(
      'Hooded Mesh Tunic',
      'Sleeveless hooded mesh top in grayscale print, shown in front, alternate fit, and neckline detail.',
      'Construction and fit',
      '2024',
      ['Mesh', 'Detail focus'],
      [
        'The sequence moves from full silhouette to closer construction reads, highlighting armhole cut, hood volume, and center-front line.',
        'A final detail frame focuses on seam and edge finishing so the technical build is visible beyond the graphic print.'
      ]
    ),
    [asset('03-panel3-1.png'), asset('03-panel3-2.png'), asset('03-panel3-3.png')]
  ),
  panel(
    '4',
    'Cable-Closure Jacket',
    '04-denim-patchwork.png',
    [-1.75, 0, 0.25],
    [0, Math.PI / 2.5, 0],
    caseStudy(
      'Cable-Closure Jacket',
      'Printed cropped jacket with engineered front closures and a mirrored back graphic.',
      'Outerwear and hardware',
      '2024',
      ['Jacket', 'Closure system'],
      [
        'Front and back views show how placement print flows around the body, from collar through cuff and hem.',
        'Custom cable-and-clip closures act as the central design feature, replacing a standard placket with visible hardware.'
      ]
    ),
    [asset('04-panel4-1.png'), asset('04-panel4-2.png')]
  ),
  panel(
    '5',
    'Asymmetric Printed Skirt',
    '02-soundwave-dress.png',
    [-0.8, 0, -0.6],
    [0, 0, 0],
    caseStudy(
      'Asymmetric Printed Skirt',
      'Asymmetric mini skirt cut from the same pink-violet print family, composed with overlapping front layers.',
      'Skirt development',
      '2024',
      ['Skirt', 'Layered construction'],
      [
        'This frame captures the skirt as an independent piece, with offset wrap geometry and directional print blocking.',
        'Focus is on hem angle, overlap depth, and how circular motifs remain readable across curved seams.'
      ]
    ),
    [asset('05-panel5-1.png')]
  ),
  panel(
    '6',
    'Waveform Woven Label',
    '03-mesh-top.png',
    [0.8, 0, -0.6],
    [0, 0, 0],
    caseStudy(
      'Waveform Woven Label',
      'Woven magenta label featuring a black waveform mark used as a graphic identity element.',
      'Brand detail',
      '2024',
      ['Label', 'Identity'],
      [
        'The gallery isolates a single trim component to show stitching quality, weave clarity, and color contrast.',
        'It functions as a signature marker that ties garments and hardware pieces into one visual language.'
      ]
    ),
    [asset('06-panel6-1.png')]
  ),
  panel(
    '7',
    'Strapless Waveform Dress',
    '07-patchwork-vest.png',
    [1.75, 0, 0.25],
    [0, -Math.PI / 2.5, 0],
    caseStudy(
      'Strapless Waveform Dress',
      'Strapless bodycon dress in the black-and-cream waveform pattern, shown on a mannequin for fit read.',
      'Dress silhouette',
      '2024',
      ['Dress', 'Form fit'],
      [
        'This look centers on vertical pattern columns and contour seams that shape the body without additional trim.',
        'Presented on form, it emphasizes proportion, bust shaping, and uninterrupted motif flow from neckline to hem.'
      ]
    ),
    [asset('07-panel7-1.png')]
  ),
  panel(
    '8',
    'Harness Assemblies',
    '08-printed-jacket.png',
    [2.15, 0, 1.5],
    [0, -Math.PI / 2.5, 0],
    caseStudy(
      'Harness Assemblies',
      'Custom wiring harness assemblies presented as standalone objects, from terminated branch sets to rack routing.',
      'Systems fabrication',
      '2024',
      ['Cable work', 'Hardware'],
      [
        'The first frame documents hand-built multi-branch cable sets with connector terminations and color-coded leads.',
        'The second frame expands to rack-level organization, showing bundled routing and endpoint management as finished craft.'
      ]
    ),
    [asset('08-panel8-1.png'), asset('08-panel8-2.png')]
  ),
  panel(
    '9',
    'Magenta Dress System',
    '08-printed-jacket.png',
    [2.5, 0, 2.75],
    [0, -Math.PI / 2.5, 0],
    caseStudy(
      'Magenta Dress System',
      'Magenta-and-black dress system shown as worn back view plus two flat component studies.',
      'Garment system breakdown',
      '2024',
      ['Dress components', 'Construction views'],
      [
        'The sequence moves from mannequin fit to deconstructed pieces, revealing side hardware points and panel architecture.',
        'By combining worn and flat views, the gallery explains how straps, rings, and body panels resolve into the final silhouette.'
      ]
    ),
    [asset('09-panel9-1.png'), asset('09-panel9-2.png'), asset('09-panel9-3.png')]
  )
]

export const defaultAboutContent = {
  title: 'Mr Nobody',
  lead: `nobody knows because Nobody doesn't know. The "brand" is just a collection of tangible objects inspired by anything.`,
  body: [
    `Perhaps it draws a certain audience, maybe it doesn't draw one at all. Nobody doesn't care if nobody cares because Nobody cares.`,
    `Nobody likes making things for Nobody. So, nobody could like it and nobody could hate it and Nobody will still make it for Nobody.`
  ],
  closing: 'The brand is for Nobody and for anybody that enjoys the things Nobody does.'
}

export const defaultContactContent = {
  title: 'Contact',
  lead: 'For projects, commissions, styling, and creative collaborations.',
  emailLabel: 'whosmrnobody@gmail.com',
  emailAddress: 'hello@mrnobody.studio',
  instagramLabel: '@whosmrnobody.io',
  instagramUrl: 'https://instagram.com/mrnobody',
  closing: 'Based in Philadelphia. Working worldwide.'
}
