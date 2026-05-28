import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

interface WizardPageOptions {
  currentStep?: Ref<number>
  backRouteName: string
  stepTitleKeys?: string[]
  stepCount?: number
}

export function useWizardPage({
  currentStep,
  backRouteName,
  stepTitleKeys = [],
  stepCount = 0,
}: WizardPageOptions) {
  const router = useRouter()
  const { t } = useI18n()
  const resolvedCurrentStep = currentStep ?? ref(0)

  const steps = computed(() => {
    if (stepTitleKeys.length > 0) {
      return stepTitleKeys.map((titleKey, index) => ({
        key: `step-${index}`,
        title: t(titleKey),
      }))
    }

    return Array.from({ length: stepCount }, (_, index) => ({
      key: `step-${index}`,
      title: '',
    }))
  })

  function back() {
    return router.push({ name: backRouteName })
  }

  return {
    currentStep: resolvedCurrentStep,
    steps,
    back,
  }
}
