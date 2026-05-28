export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'text'
  | 'contrast'
  | 'danger'
export type AppButtonSize = 'default' | 'compact' | 'small' | 'middle' | 'large'

export const BUTTON_VARIANT_CLASSES: Record<AppButtonVariant | '', string> = {
  primary: 'ow-button--primary',
  secondary: 'ow-button--secondary',
  accent: 'ow-button--accent',
  ghost: 'ow-button--ghost',
  text: 'ow-button--text',
  contrast: 'ow-button--contrast',
  danger: 'ow-button--danger',
  '': 'ow-button--secondary',
}

export const BUTTON_SIZE_CLASSES: Record<string, string> = {
  default: 'ow-button--default',
  compact: 'ow-button--compact',
}
