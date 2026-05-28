import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { createVoteTopicTransaction } from '../../modules/governance/application/voteTopicApplicationService'
import { notifyWarning } from '../../shared/ui/feedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { useVoteStore } from '../../stores/modules/Vote'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

interface VoteRoute {
  name: string
  path: string
}

interface TextInputEvent {
  target: { value: string }
}

type DateInputValue = string | number | Date

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatDatePart(value: DateInputValue) {
  const date = new Date(value)
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function formatTimePart(value: DateInputValue) {
  const date = new Date(value)
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`
}

function containsChinese(value: unknown) {
  return /[\u4E00-\u9FA5]/g.test(String(value))
}

export function useVoteCreatePage() {
  const { t } = useI18n()
  const router = useRouter()
  const voteStore = useVoteStore()
  const settingStore = useSettingStore()

  const routes = ref<VoteRoute[]>([
    { name: t('vote.node'), path: '/node' },
    { name: t('vote.votingTopics'), path: '/vote/votes' },
  ])
  const titleLimit = ref(150)
  const detailLimit = ref(2000)
  const title = ref('')
  const content = ref('')
  const startDate = ref<DateInputValue | null>(null)
  const startTime = ref<DateInputValue | null>(null)
  const endDate = ref<DateInputValue | null>(null)
  const endTime = ref<DateInputValue | null>(null)
  const tx = ref<GovernanceSignablePayload>('')
  const signVisible = ref(false)
  const voteWallet = computed(() => voteStore.voteWallet)
  const contractHash = computed(() => voteStore.contractHash)

  function setVoteCreateRoutes(nextRoutes: VoteRoute[]) {
    routes.value = nextRoutes
  }

  function navigateVoteCreateBack() {
    router.back()
  }

  function sanitizeVoteTitle(value: string) {
    if (title.value.length > titleLimit.value) {
      title.value = title.value.substr(0, titleLimit.value)
    }
    if (containsChinese(value)) {
      title.value = title.value.substring(0, value.length - 1)
      return { ok: false, errorKey: 'vote.onlySupportEnglish' }
    }
    return { ok: true }
  }

  function sanitizeVoteContent(value: string) {
    if (content.value.length > detailLimit.value) {
      content.value = content.value.substr(0, detailLimit.value)
    }
    if (containsChinese(value)) {
      content.value = content.value.substring(0, value.length - 1)
      return { ok: false, errorKey: 'vote.onlySupportEnglish' }
    }
    return { ok: true }
  }

  function validateVoteText(rawValue: string) {
    const value = rawValue.trim()
    if (!value) {
      return { ok: false, errorKey: 'vote.fillBlanks' }
    }
    if (containsChinese(value)) {
      return { ok: false, errorKey: 'vote.onlySupportEnglish' }
    }
    return { ok: true }
  }

  async function submitVoteCreateForm() {
    const wallet = voteWallet.value
    if (!wallet?.address) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
      }
    }

    const titleValidation = validateVoteText(title.value)
    if (!titleValidation.ok) {
      return titleValidation
    }

    const contentValidation = validateVoteText(content.value)
    if (!contentValidation.ok) {
      return contentValidation
    }

    if (
      !title.value ||
      !content.value ||
      !startDate.value ||
      !startTime.value ||
      !endDate.value ||
      !endTime.value
    ) {
      return { ok: false, errorKey: 'vote.fillBlanks' }
    }

    const startTimeText = `${formatDatePart(startDate.value)} ${formatTimePart(startTime.value)}`
    const endTimeText = `${formatDatePart(endDate.value)} ${formatTimePart(endTime.value)}`
    const startTimestamp = Math.floor(new Date(startTimeText).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endTimeText).getTime() / 1000)

    if (startTimestamp >= endTimestamp) {
      return { ok: false, errorKey: 'vote.startTimeError' }
    }
    if (Date.now() >= new Date(endTimeText).getTime()) {
      return { ok: false, errorKey: 'vote.endTimeError' }
    }

    const result = await createVoteTopicTransaction({
      contractHash: contractHash.value,
      network: settingStore.network,
      voteWallet: wallet,
      vote: {
        title: title.value,
        content: content.value,
        startTime: startTimestamp,
        endTime: endTimestamp,
        voters: [] as unknown[],
      },
    })
    if (!result.ok) {
      return result
    }

    if (result.contractHash) {
      voteStore.setContractHash(result.contractHash)
    }
    tx.value = result.tx
    signVisible.value = true
    return { ok: true as const }
  }

  function closeVoteCreateDialog() {
    signVisible.value = false
    tx.value = ''
  }

  function handleVoteCreateSent() {
    signVisible.value = false
    router.back()
  }

  function back() {
    navigateVoteCreateBack()
  }

  function onTitleInput(event: TextInputEvent) {
    const result = sanitizeVoteTitle(event.target.value)
    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.networkErr')
    }
    return result
  }

  function onDetailInput(event: TextInputEvent) {
    const result = sanitizeVoteContent(event.target.value)
    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.networkErr')
    }
    return result
  }

  async function submit() {
    const result = await submitVoteCreateForm()
    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.networkErr')
    }
    return result
  }

  function handleCancel() {
    closeVoteCreateDialog()
  }

  function handleTxSent() {
    handleVoteCreateSent()
  }

  return {
    routes,
    titleLimit,
    detailLimit,
    title,
    content,
    startDate,
    startTime,
    endDate,
    endTime,
    tx,
    signVisible,
    voteWallet,
    back,
    onTitleInput,
    onDetailInput,
    submit,
    handleCancel,
    handleTxSent,
    setVoteCreateRoutes,
    navigateVoteCreateBack,
    sanitizeVoteTitle,
    sanitizeVoteContent,
    submitVoteCreateForm,
    closeVoteCreateDialog,
    handleVoteCreateSent,
  }
}
