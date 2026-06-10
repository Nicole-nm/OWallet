// Stylelint guardrail. Intent: keep colors flowing through design tokens
// (var(--ow-*)) so raw hex/rgb values can't silently bypass theming again.
// Deliberately does NOT forbid !important (those overrides are load-bearing
// against Ant Design's runtime-injected CSS).

const COLOR_PROPS = '/^(color|background|background-color|border-color|fill|stroke|outline-color)$/'

export default {
  extends: ['stylelint-config-recommended-scss', 'stylelint-config-recommended-vue/scss'],
  rules: {
    // Force tokens for colors.
    'color-no-hex': true,
    'declaration-property-value-disallowed-list': {
      [COLOR_PROPS]: ['/rgba?\\(/', '/hsla?\\(/'],
    },
    // Noisy / not relevant to a token guardrail.
    'no-descending-specificity': null,
    'scss/dollar-variable-pattern': null,
    'scss/at-mixin-pattern': null,
  },
  overrides: [
    {
      // Token source-of-truth + @font-face legitimately define raw values.
      files: ['**/shared/styles/tokens.scss', '**/shared/styles/base.scss'],
      rules: {
        'color-no-hex': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
  ],
}
