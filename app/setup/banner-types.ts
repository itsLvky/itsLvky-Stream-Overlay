export interface BannerItem {
  text: string
  subtitle: string
  icon: string
  color: string
}

export interface BannerConfig {
  bannerEnabled: boolean
  bannerItems: BannerItem[]
  bannerInterval: number
  bannerDuration: number
  bannerPosition: 'top' | 'middle' | 'bottom'
}

// Prop types for TSRX sub-components (avoids complex generics inside .tsrx files)
export type ToggleProps = {
  enabled: boolean
  pending: boolean
  onToggle: () => void
}

export type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
}

export type ItemEditorProps = {
  item: BannerItem
  index: number
  onUpdate: (patch: Partial<BannerItem>) => void
  onRemove: () => void
}
