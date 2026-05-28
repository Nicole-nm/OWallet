import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  copyText: vi.fn(),
}))

vi.mock('../../shared/composables/useClipboardNotice', () => ({
  useClipboardNotice: () => ({
    copyText: mocks.copyText,
  }),
}))

import { useSharedTxEditor } from './useSharedTxEditor'

describe('useSharedTxEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects signers and creates sign requests', () => {
    const editor = useSharedTxEditor((address: unknown) => ({ address, type: 'CommonWallet' }))

    editor.handleSignerChange('Abc')
    editor.requestSignature({ tx: 'serialized', isFirstSign: true })

    expect(editor.selectedSigner.value).toEqual({ address: 'Abc', type: 'CommonWallet' })
    expect(editor.signRequest.value).toMatchObject({
      isFirstSign: true,
      tx: 'serialized',
    })
  })

  it('opens, copies and resets the serialized tx state', async () => {
    const editor = useSharedTxEditor(() => null)

    editor.openSignedTxModal('0x123')
    await editor.copySerializedTx()
    editor.resetEditorState({ resetSigner: true })

    expect(mocks.copyText).toHaveBeenCalledWith('0x123')
    expect(editor.visible.value).toBe(false)
    expect(editor.serializedTx.value).toBe('')
    expect(editor.selectedSigner.value).toBe('')
  })
})
