import { button, folder, useControls } from 'leva'
import { useLevaStores } from './levaStores'

export const TITLE_SPOTLIGHT_DEFAULTS = {
  position: [0, 5, 2],
  target: [0, 0, 0],
  intensity: 12,
  angleDeg: 90,
  penumbra: 0.6,
  distance: 40,
  decay: 2,
  color: '#fff4e6'
}

function useTitleSpotlightControls(spotlightStore) {
  const [state, set] = useControls(
    'Title spotlight',
    () => ({
      Position: folder({
        position: { value: TITLE_SPOTLIGHT_DEFAULTS.position, step: 0.1, min: -15, max: 15 }
      }),
      Target: folder({
        target: { value: TITLE_SPOTLIGHT_DEFAULTS.target, step: 0.1, min: -10, max: 10 }
      }),
      Beam: folder({
        intensity: { value: TITLE_SPOTLIGHT_DEFAULTS.intensity, min: 0, max: 30, step: 0.1 },
        angleDeg: { value: TITLE_SPOTLIGHT_DEFAULTS.angleDeg, min: 5, max: 90, step: 1, label: 'Angle (°)' },
        penumbra: { value: TITLE_SPOTLIGHT_DEFAULTS.penumbra, min: 0, max: 1 },
        distance: { value: TITLE_SPOTLIGHT_DEFAULTS.distance, min: 0, max: 80, step: 1 },
        decay: { value: TITLE_SPOTLIGHT_DEFAULTS.decay, min: 0, max: 3, step: 0.1 }
      }),
      Color: folder({
        color: TITLE_SPOTLIGHT_DEFAULTS.color
      }),
      Reset: button(() =>
        set({
          ...TITLE_SPOTLIGHT_DEFAULTS,
          position: [...TITLE_SPOTLIGHT_DEFAULTS.position],
          target: [...TITLE_SPOTLIGHT_DEFAULTS.target]
        })
      )
    }),
    { store: spotlightStore }
  )

  return state
}

export function TitleSpotlight() {
  const { spotlightStore } = useLevaStores()
  const { position, target, intensity, angleDeg, penumbra, distance, decay, color } =
    useTitleSpotlightControls(spotlightStore)
  const angle = (angleDeg * Math.PI) / 180

  return (
    <spotLight
      position={position}
      intensity={intensity}
      angle={angle}
      penumbra={penumbra}
      distance={distance}
      decay={decay}
      color={color}>
      <object3D attach="target" position={target} />
    </spotLight>
  )
}
