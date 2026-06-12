<template>
  <div class="authorization-page ow-page ow-page--flush-top">
    <breadcrumb
      :current="$t('nodeMgmt.stakeAuthorization')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="authorization-list-page">
      <div class="ow-page-header authorization-list-header">
        <div class="block-clock ow-panel ow-panel--flat">
          <div class="ow-panel-body countdown-block">
            <div class="countdown-img">
              <img src="../../assets/countdown.svg" alt="" />
            </div>
            <div class="countdown-text">
              <p>{{ $t('nodeMgmt.toNextRound') }}</p>
              <span class="countdown-value">{{ authorizationListCountdownDisplay }}</span>
              <span class="countdown-label">{{ authorizationListCountdownUnit }}</span>
            </div>
            <span class="ow-icon-action question-icon" @click="toQuestion">
              <QuestionCircleOutlined />
            </span>
          </div>
        </div>
        <a-button type="primary" variant="primary" @click="toStakeHistory">{{
          $t('nodeMgmt.stakeHistory')
        }}</a-button>
      </div>
      <div class="authorization-list-table ow-table-shell">
        <a-table
          :columns="columns"
          :dataSource="authorizationListNodes"
          :loading="authorizationListRequesting"
          :pagination="authorizationListPagination"
          tableLayout="fixed"
          :scroll="{ x: 880 }"
          @change="handleTableChange"
        >
          <template #headerCell="{ column }">
            <div v-if="column.key === 'checkmark'" class="table-info-title">
              <p>
                {{ $t('nodeMgmt.checkmark') }}
                <InfoCircleOutlined class="table-info-icon" @click="showCheckmarkTip" />
              </p>
            </div>
            <div v-else-if="column.key === 'nodeProportion'" class="table-info-title">
              <p>
                {{ $t('nodeMgmt.proportionNextRound') }}
                <InfoCircleOutlined class="table-info-icon" @click="showProportionTip" />
              </p>
            </div>
            <div v-else-if="column.key === 'currentStake'" class="table-info-title">
              <p>
                <button
                  type="button"
                  class="table-header-sort"
                  :class="{
                    'table-header-sort--active': authorizationListSortField === 'currentStake',
                  }"
                  @click="toggleAuthorizationSort('currentStake')"
                >
                  <span>{{ $t('nodeMgmt.currentStake') }}</span>
                  <CaretUpOutlined
                    v-if="
                      authorizationListSortField === 'currentStake' &&
                      authorizationListSortOrder === 'ascend'
                    "
                    class="table-sort-icon"
                  />
                  <CaretDownOutlined
                    v-else-if="
                      authorizationListSortField === 'currentStake' &&
                      authorizationListSortOrder === 'descend'
                    "
                    class="table-sort-icon"
                  />
                  <SwapOutlined v-else class="table-sort-icon" />
                </button>
              </p>
            </div>
            <div v-else-if="column.key === 'annualizedYield'" class="table-info-title">
              <p>
                <button
                  type="button"
                  class="table-header-sort"
                  :class="{
                    'table-header-sort--active': authorizationListSortField === 'annualizedYield',
                  }"
                  @click="toggleAuthorizationSort('annualizedYield')"
                >
                  <span>{{ $t('nodeMgmt.annualizedYield') }}</span>
                  <CaretUpOutlined
                    v-if="
                      authorizationListSortField === 'annualizedYield' &&
                      authorizationListSortOrder === 'ascend'
                    "
                    class="table-sort-icon"
                  />
                  <CaretDownOutlined
                    v-else-if="
                      authorizationListSortField === 'annualizedYield' &&
                      authorizationListSortOrder === 'descend'
                    "
                    class="table-sort-icon"
                  />
                  <SwapOutlined v-else class="table-sort-icon" />
                </button>
                <InfoCircleOutlined class="table-info-icon" @click.stop="showAnnualizedYieldTip" />
              </p>
            </div>
          </template>
          <template #bodyCell="{ column, text, record }">
            <template v-if="column.key === 'nodeProportion'"
              ><span class="node-proportion-value"
                >{{ record.nodeProportion }} / {{ record.userProportion }}</span
              ></template
            >
            <div v-else-if="column.key === 'checkmark'" class="node-checkmarks">
              <a-tooltip v-if="Number(record.bad_actor) > 0" :title="$t('nodeMgmt.badActor')">
                <img class="node-checkmark-icon" :src="checkmarkIconUrls.badActor" alt="" />
              </a-tooltip>
              <a-tooltip
                v-if="Number(record.fee_sharing_ratio) > 0"
                :title="$t('nodeMgmt.stableFeeSharingRatio')"
              >
                <img
                  class="node-checkmark-icon"
                  :src="checkmarkIconUrls.stableFeeSharingRatio"
                  alt=""
                />
              </a-tooltip>
              <a-tooltip
                v-if="Number(record.ontology_harbinger) > 0"
                :title="$t('nodeMgmt.ontologyHarbinger')"
              >
                <img
                  class="node-checkmark-icon"
                  :src="checkmarkIconUrls.ontologyHarbinger"
                  alt=""
                />
              </a-tooltip>
              <a-tooltip v-if="Number(record.risky) > 0" :title="$t('nodeMgmt.alert')">
                <img class="node-checkmark-icon" :src="checkmarkIconUrls.risky" alt="" />
              </a-tooltip>
              <span
                v-if="
                  !(
                    Number(record.bad_actor) > 0 ||
                    Number(record.fee_sharing_ratio) > 0 ||
                    Number(record.ontology_harbinger) > 0 ||
                    Number(record.risky) > 0
                  )
                "
                class="node-checkmark-empty"
                >-</span
              >
            </div>
            <a
              v-else-if="column.key === 'name'"
              class="node-name"
              :class="record.status === 2 ? 'node-consensus' : 'node-candidate'"
              @click="handleNodeDetail(record)"
            >
              <a-tooltip placement="top" :title="$t('nodeMgmt.consensusNode')">
                <StarFilled v-if="record.status === 2" />
              </a-tooltip>
              <a-tooltip placement="top" :title="$t('nodeMgmt.candidateNode')">
                <StarOutlined v-if="record.status === 1" />
              </a-tooltip>
              <a-tooltip
                placement="topLeft"
                :title="text ? String(text) : ''"
                :mouse-enter-delay="0.08"
                :mouse-leave-delay="0"
              >
                <span class="node-name__text">{{ text }}</span>
              </a-tooltip>
            </a>
            <template v-else-if="column.key === 'annualizedYield'">
              <span
                class="annualized-yield"
                :class="{ 'annualized-yield--unavailable': !record.annualizedYield }"
                >{{ record.annualizedYield || $t('nodeMgmt.unavailable') }}</span
              >
            </template>
            <div
              v-else-if="
                column.key === 'action' && record.maxAuthorize > 0 && record.process !== '100.00%'
              "
              class="detail-link ow-icon-action"
            >
              <ArrowRightOutlined
                @click="handleAuthorizeLogin(record)"
                v-if="record.maxAuthorize > 0"
              />
            </div>
          </template>
        </a-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import {
  QuestionCircleOutlined,
  InfoCircleOutlined,
  StarFilled,
  StarOutlined,
  ArrowRightOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue'
import { useNodeAuthorizationListPage } from '../../workflows/governance/useNodeAuthorizationListPage'

defineOptions({
  name: 'AuthorizationListPage',
})

const checkmarkIconUrls = {
  badActor:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJFSURBVHgB7VSxctNAEN096WSboVBhepeUJjUzKHxB/iD8QfiDmIKCLvwB+QJIQxvXDDP4Ayj8ASlcMIks6+6xtycLkYltFSmzM7rT7e3u2317d0RPckD4kEFezPL8uTkzw9GJSUaTJBvkiR2QaT75X7IdrFKbXfz4+PpyL0D+8mQiTmecDSXIUJyzXAIWxj7LTSYB0wzGjoKejR1C9uIsa06HMIbe/vx0PO/GTLsL59bXYJ4Y5hYZ8pfIB3iIMBC0nsLEHEbIpicTDK09FcUegKqcxDjoVKdBoEhxIM9R7WRAwBI1om1B98T8D7Amv1mz35Tsqju4TSnrUnVxvRabO2r2RFeSq0uuqxKN3WT6/mu+swIxgpasCaItAPohcLI15XZQG/DWELBvRHP1IEDwkSw0mlEnUrpSBUUMj8gHGtSmLxE/+Dtf7AOIldQVN6WwtES4piYQpOGe4hwbjJi6VhB6YiymOynqCgSkllBJpCxSQA1LaOjRKvSIobXhvQCYi0VBDTcCQnpgY6CtjcZDC96eODS07W7y5ubXcTqeFjHVVJLxp0LXu5igeitNaDPfQlLbaKnw254KiOqbxbyznAvgJbnNtYt807+QWIb98JdoCUra0tzy5268g2+RZjE+monhOZuE4tMwkKchm/35/f3DIV/TB6Cu/YUkvYJ3pJcwXKrqto9rPwBaLVZC7kIbLyByg6X/VS/XfgBBPK5YRI8KPMOtV33cegPA+EWYOQp575b02CLNPrfjI9gXr77QkzyW/AWJZ2VFvBgjCwAAAABJRU5ErkJggg==',
  stableFeeSharingRatio:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAKYSURBVHgB7VW/a1RBEP52bw9ysbloYXtCQBEEDfkHYpMuPzoF0Yi9pPBHYxEbLbSInVYSsDPFBQTLmCooISSlVV6wURLIQUhOz9sZZ3feeyd3Z14kbYZs9tfb7/tmdmYPOLUCM0dtzi7vVdsOV0GY8mwniUzNk4H0G6G1W1h6N3Gm/t8Ej1f3ar+BO54wK0BVUlC02XAcexhiy2m/JaQrPz09rU9XkkKCh192ZwTkLbGB9wocxxTBjYDK3MY5yzx45OOaaaBkp95PlFf+xrPdBGzsfTZymDvcDMPxH6um0HPehz8TDlaphbluvB4CkXxNEfVgBBV5KYkMU0JZo7in33IUIvdVRJArS8EiSUaURVQFyCzsxW+jd0SoFnvAnZAIBFPU3QHNSMZrDuMXStBQGtbt3pzp9YDRCKeUhE3FGTPgrIaAtE0OO9y6XMagU17m1M0+1usBTCMNqAnhvX2xgiejg+bcgI2ujJx3mB4uY+27x+JXD3UhkgRxSSGBZN6Gxh3x0IekFdcfjFRw6WwJ966UsdNkvNn0uXBOSeSzYgK0aTvzILRv+x4v1w9jeB+NDuBAKvDZagsHLe7kKSsJe94sJmBbz/M8vbjdJvBirYn1Hx7PP//CziFntSBJkJFIK7vlbrieiwnvj3cmlH81pD95rVZ9LgAfnwip6CBYKl2rWULrTWPphhsq9GB+bKghsl5lYcq71KtQWJniIJDyMuAF9DHbb9ER5gUkCSqVSAb6fOjUaGrmItgktunmjk0QvQCNif/bnKVgVK71wZSVcMTfMt5er9+Vx+64BMFejw0ltiUkwILmeVrc6SuYhmie90sj9Zsm+RfOkT84mc18bNaIaU4uejJcNJGrt9kvLE5XPuHUTmp/AGYvwn0As4nnAAAAAElFTkSuQmCC',
  ontologyHarbinger:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJVSURBVHgB7VWxjtNAEJ2ZXQ4QBaGkAaPoJEAgEdGjSPQIdB8QvgByBfU5f8DVFKSjpKRCQaKgDFecKClp3Z93hzdjH+Aowmfpypto7fWu/d6bmWeH6CJ6gs9y02q9Gl29lmaiaRpJHwXKRWAloUyBMfysFcby1nhv/8wEBixX5DVLngfVEYC0AU4cWRUEjGvFOovtkWI3L8a7e2Uvwaf1t4Iv16tIVLjKFtBUIwv6A4w9z6TJws7VePfFjVOcuA38I8DrHV4JxYLwIHSoagI4U+RANda0/QUVVW6FqhJvSN5KkHfiKhHdVgNSPAelAAaJPW5KAarZi4WiYAdTg2YnXv6X4MPx0UGtqcCNKAkhZVPWHALbkcnAfZ197gKUpcopH07uPSv/xesk9H69LkIMP72BKEmAwKDJasvyt8bmnIrhmKd3n+xTT0inNOHSNEF3jVIAXu1cq3BNohi27uNEZZSzzD//+HowiOCE4qwB8sHQ3gJjbmtmUOTQzBlnnvcRdHqABwufWC81q57W3ets/cCFv1iuDY2u+/A3CMgIrHEJ7hB4JXurjYTZnIJmatNz9TvichCBlSY3NgSwqW9Abc88asqNDOgVdLx9fv/xYjBBA9CUwnW6Yq1EZDl78LDXNZvRaTJKVFljU6fR1th4PWWevzs6LmlgbBJ8b20Jl5iDzKoCW7I7Cl+eVzQwOgQAXLgFs6kW9iwso/bdMHIaGB2CcnLzCz5pJV4ye5kADOUGzNEzAemSBsZWReX610vSNINrpsE/x/gzoXz4ZnKnpIs47/gNPIFOdM/Z4DAAAAAASUVORK5CYII=',
  risky:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAACPElEQVR4AdVVXWoUQRCumphAnty9wTwKIi6CIIKwEfXVIzg5QcwJlpxAPcEcQxBx900EJQHxOXMD923XrF1lfdU9WZNMMr2PabZmpnu6fr6vvukluu2Dczee/Xx5YNsn8GCmD9v3Px3l+GUlWB2/GAvrlDm6qN0Lpr3tB59nfb5F34bFj3El9LdmFSIVhdmzSpD67Ph51ed/I4I/35/VpFSBE2Jeu/iUVXEr+P3Owy+HtCmC1benEwpSEcKgcokIIhJbk0BY0yBvDck72gTB4uuTkpVOua2cfafRY5P4QwqiNMEQLfZ2H89mWQi2gh4wRb69cljQGBZVi+D1+dwWaIvC665Yd7oWRcOIJQH0yk0zpGs06pf4zhYxVeVRdgKrqoy0FBCM3cxfE50pCUe5MprNTp2WmySw0uAU1OUSQgzpFVtSTWjAEqKDLO0WZHcCKCUW7PhTQ8GUXQIl3hIy2xKB6AYIsFdj4KQSsGWxuXse6cpOwBLuOq20liY+AUflhSZOWunGPIOuWFdkuvh4r7JjYGgfEHrBSaZJrtYTmMZnZ8UtqEl3sJiOxr0JzOmNs+4BEQs6T1+tqFOt+IoNgRXBMSkaJfCdXIl3qfqxOUz9ReqtJq7AeTtvm8vt+cRRdLBC9NHOq18nnQiWy+WJbWoi++3hDBiKM8cqBgI5r3htOKIcTRNCmF+L4LqhdTlY0sUm7u43TY5v7/8BBkpaBT39337XZZnjm5VguN/MjYUja8LcTflwmIng9o9/rrxwzgroWw8AAAAASUVORK5CYII=',
} as const

const {
  columns,
  authorizationListRequesting,
  authorizationListPagination,
  authorizationListNodes,
  authorizationListSortField,
  authorizationListSortOrder,
  authorizationListCountdownDisplay,
  authorizationListCountdownUnit,
  handleRouteBack,
  handleAuthorizeLogin,
  handleNodeDetail,
  handleTableChange,
  toggleAuthorizationSort,
  showProportionTip,
  showCheckmarkTip,
  showAnnualizedYieldTip,
  toStakeHistory,
  toQuestion,
} = useNodeAuthorizationListPage()
</script>

<style scoped lang="scss">
.authorization-list-page {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: var(--ow-space-5);
}

.authorization-list-header {
  margin-bottom: 0;
}

.authorization-list-table {
  width: 100%;
}

.authorization-list-table :deep(.ant-table-cell) {
  padding-right: var(--ow-space-2);
  padding-left: var(--ow-space-2);
}

.authorization-list-table :deep(.authorization-col-rank),
.authorization-list-table :deep(.authorization-col-checkmark),
.authorization-list-table :deep(.authorization-col-proportion),
.authorization-list-table :deep(.authorization-col-current-stake),
.authorization-list-table :deep(.authorization-col-annualized-yield),
.authorization-list-table :deep(.authorization-col-process),
.authorization-list-table :deep(.authorization-col-action) {
  white-space: nowrap;
}

.authorization-list-table :deep(.authorization-col-name) {
  overflow: hidden;
}

.block-clock {
  width: 540px;
  min-height: 86px;
  max-width: 100%;
  margin: 0;
  flex-shrink: 0;
}

.countdown-block {
  position: relative;
}

.countdown-img {
  float: left;
  height: 60px;
  line-height: 60px;
}

.countdown-img img {
  width: 60px;
  height: 60px;
}

.countdown-text {
  padding-right: 60px;
  text-align: center;
}

.countdown-text p {
  margin-bottom: var(--ow-space-2);
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-section);
}

.countdown-value {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-title);
}

.countdown-label {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-subtitle);
  margin-left: var(--ow-space-3);
}

.detail-link {
  margin: 0 auto;
}

.table-info-title p {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  max-width: 100%;
  margin: 0;
  line-height: 1.25;
  white-space: nowrap;
}

.table-info-icon {
  flex: 0 0 auto;
  cursor: pointer;
}

.table-header-sort {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.table-header-sort:focus-visible {
  outline: 2px solid var(--ow-color-brand);
  outline-offset: 2px;
}

.table-sort-icon {
  flex: 0 0 auto;
  color: var(--ow-color-text-muted);
  font-size: 12px;
}

.table-header-sort--active .table-sort-icon {
  color: var(--ow-color-brand);
}

.node-checkmarks {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  min-width: 84px;
}

.node-checkmark-icon {
  display: block;
  width: 18px;
  height: 18px;
}

.node-checkmark-empty,
.annualized-yield--unavailable {
  color: var(--ow-color-text-muted);
}

.node-proportion-value {
  display: block;
  text-align: left;
}

.question-icon {
  position: absolute;
  top: var(--ow-space-3);
  right: var(--ow-space-3);
}

.node-name {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  max-width: 100%;
  min-width: 0;
  vertical-align: middle;
}

.node-name :deep(.anticon) {
  flex: 0 0 auto;
}

.node-name__text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-name:hover {
  color: var(--ow-color-brand) !important;
}

@media (max-width: 760px) {
  .authorization-list-header {
    align-items: stretch;
    flex-direction: column;
  }

  .block-clock {
    width: 100%;
  }
}
</style>
