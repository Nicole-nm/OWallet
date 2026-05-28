import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta = {
  title: 'Design System/Renderer Styles',
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Tokens: Story = {
  render: () => ({
    setup: () => ({
      colors: [
        ['Brand', 'var(--ow-color-brand)'],
        ['Accent', 'var(--ow-color-accent)'],
        ['Surface', 'var(--ow-color-surface-card)'],
        ['Selected', 'var(--ow-color-surface-selected)'],
        ['Text', 'var(--ow-color-text-primary)'],
        ['Danger', 'var(--ow-color-danger)'],
        ['Success', 'var(--ow-color-success)'],
      ],
      spaces: [
        ['1', 'var(--ow-space-1)'],
        ['2', 'var(--ow-space-2)'],
        ['4', 'var(--ow-space-4)'],
        ['6', 'var(--ow-space-6)'],
        ['8', 'var(--ow-space-8)'],
        ['12', 'var(--ow-space-12)'],
        ['16', 'var(--ow-space-16)'],
      ],
    }),
    template: `
      <div style="display:grid;gap:24px;max-width:760px">
        <section>
          <h3 class="ow-text-title">Color Tokens</h3>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
            <div v-for="[name, color] in colors" :key="name" style="display:flex;align-items:center;gap:10px">
              <span :style="{ background: color, width: '32px', height: '32px', border: '1px solid var(--ow-color-border-default)' }"></span>
              <span class="ow-summary-value">{{ name }}</span>
            </div>
          </div>
        </section>
        <section>
          <h3 class="ow-text-title">Spacing Tokens</h3>
          <div style="display:grid;gap:8px">
            <div v-for="[name, size] in spaces" :key="name" style="display:flex;align-items:center;gap:12px">
              <span class="ow-summary-label" style="width:40px">space {{ name }}</span>
              <span :style="{ width: size, height: '12px', background: 'var(--ow-color-brand)' }"></span>
            </div>
          </div>
        </section>
      </div>
    `,
  }),
}

export const FlowSummary: Story = {
  render: () => ({
    template: `
      <div class="ow-send-flow">
        <p class="ow-flow-title">Send</p>
        <div class="ow-summary-table">
          <div class="ow-summary-row">
            <span class="ow-summary-label">Amount</span>
            <span class="ow-summary-value">10 ONT</span>
          </div>
          <div class="ow-summary-row">
            <span class="ow-summary-label">Recipient</span>
            <span class="ow-summary-value">AXvY...bF91</span>
          </div>
          <div class="ow-summary-value">Fee: 0.01 ONG</div>
        </div>
        <p class="ow-flow-title">Confirmation</p>
        <div class="ow-flow-content">
          <label class="ow-flow-check">
            <input type="checkbox" checked />
            Agree to send
          </label>
          <div class="ow-flow-actions">
            <button class="ant-btn">Back</button>
            <button class="ant-btn ant-btn-primary">Submit</button>
          </div>
        </div>
      </div>
    `,
  }),
}

export const PagePatterns: Story = {
  render: () => ({
    template: `
      <div class="ow-page" style="padding:0">
        <div class="ow-page-header">
          <div>
            <h2 class="ow-page-title">Governance</h2>
            <p class="ow-page-subtitle">Compact actions and repeated data views.</p>
          </div>
          <button class="ant-btn ant-btn-primary">Primary</button>
        </div>

        <div class="ow-card-grid ow-card-grid--padded" style="margin-bottom:24px">
          <div class="ow-action-card ow-action-card--tile">
            <p class="ow-action-card__title">Node Stake</p>
            <p class="ow-action-card__meta">Manage node registration and staking.</p>
            <span class="ow-action-card__control">→</span>
          </div>
          <div class="ow-action-card ow-action-card--tile">
            <p class="ow-action-card__title">Vote</p>
            <p class="ow-action-card__meta">Create and review voting topics.</p>
            <span class="ow-action-card__control">→</span>
          </div>
        </div>

        <div class="ow-panel ow-panel--flat">
          <div class="ow-panel-header">
            <p class="ow-panel-heading">Recent Topics</p>
            <span class="ow-status-pill ow-status-pill--info">Active</span>
          </div>
          <div class="ow-panel-body">
            <div class="ow-data-list">
              <div class="ow-data-row">
                <div class="ow-data-title">Upgrade validator reward distribution</div>
                <div>
                  <p class="ow-data-label">Duration</p>
                  <p class="ow-data-value">2026-04-01 - 2026-04-30</p>
                </div>
                <div>
                  <p class="ow-data-label">Status</p>
                  <p class="ow-data-value">In progress</p>
                </div>
                <div class="ow-data-actions">
                  <button class="ant-btn ant-btn-link">Detail</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}

export const WalletPatterns: Story = {
  render: () => ({
    template: `
      <div style="display:grid;gap:28px">
        <div class="ow-card-grid" style="max-width:760px">
        <div class="ow-list-card ow-list-card--wallet">
          <div class="ow-detail-card">
            <div class="ow-detail-kind">Shared Wallet</div>
            <div class="ow-detail-name">Operations Treasury</div>
            <div class="ow-detail-address">
              <div>Wallet Address:</div>
              <span class="ow-detail-address-text">AXvY1xz2zX6nQ2H7bP1Q</span>
            </div>
            <span class="ow-icon-delete ow-detail-actions"></span>
          </div>
        </div>
          <div class="ow-create-card ow-create-card--wallet ow-create-card--bordered">
            Create or import
          </div>
        </div>
        <div class="ow-wallet-summary">
          <div class="ow-wallet-title">Operations Treasury</div>
          <div class="ow-wallet-title ow-wallet-address">AXvY1xz2zX6nQ2H7bP1Q</div>
          <div class="ow-wallet-meta">
            <div class="ow-wallet-meta-row">
              <span class="ow-summary-label">Total copayers</span>
              <span class="ow-summary-value">3</span>
            </div>
            <div class="ow-wallet-meta-row">
              <span class="ow-summary-label">Required signatures</span>
              <span class="ow-summary-value">2</span>
            </div>
          </div>
          <div class="ow-copayer-list">
            <div class="ow-copayer-row">
              <span class="ow-step-circle">1</span>
              <span class="ow-copayer-name">Alice</span>
              <span class="ow-copayer-address">AXvY1xz2zX6nQ2H7bP1Q</span>
            </div>
            <div class="ow-copayer-row">
              <span class="ow-step-circle">2</span>
              <span class="ow-copayer-name">Bob</span>
              <span class="ow-copayer-address">AfG9Q1aVx2Zp7sT4K8Lm</span>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}
