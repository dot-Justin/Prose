import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  globalCss: {
    body: {
      bg: '#0f0e0d',
      color: '#f5f0eb',
      fontFamily: "'Instrument Sans', system-ui, sans-serif",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Instrument Sans', system-ui, sans-serif" },
        body:    { value: "'Instrument Sans', system-ui, sans-serif" },
        mono:    { value: "'JetBrains Mono', 'Fira Code', monospace" },
      },
      colors: {
        prose: {
          bg:         { value: '#0f0e0d' },
          surface:    { value: '#1a1815' },
          surface2:   { value: '#242220' },
          border:     { value: '#2e2c29' },
          text:       { value: '#f5f0eb' },
          muted:      { value: '#8a8480' },
          subtle:     { value: '#5a5855' },
          accent:     { value: '#c9974a' },
          accentHover:{ value: '#d4a55e' },
          accentDim:  { value: 'rgba(201, 151, 74, 0.12)' },
          green:      { value: '#4caf7d' },
          greenDim:   { value: 'rgba(76, 175, 125, 0.12)' },
          yellow:     { value: '#d4a53a' },
          red:        { value: '#c95a4a' },
          redDim:     { value: 'rgba(201, 90, 74, 0.12)' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'chakra-body-bg':   { value: '#0f0e0d' },
        'chakra-body-text': { value: '#f5f0eb' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
