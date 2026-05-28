import { fetchJson } from '../platform/bridge'

/**
 * Canonical response envelope returned by the Ontology REST API.
 * `Result` varies per endpoint, so callers pin `T` at the call site.
 */
export interface OntologyRestResponse<T = unknown> {
  Action: string
  Desc: string
  Error: number
  Result: T
  Version: string
}

export interface OntologyTransactionResult<TInner = unknown> {
  TxHash: string
  State: number
  GasConsumed: number
  /**
   * Payload varies per endpoint — string for simple queries, arrays for list
   * queries. Callers pin `TInner` via `sendRawTransaction<TInner>(…)`.
   */
  Result: TInner
  Notify: unknown[]
}

export class RestProxy {
  url: string

  constructor(url: string) {
    this.url = url.replace(/\/$/, '')
  }

  sendRawTransaction<TInner = string>(
    data: string,
    preExec = false
  ): Promise<OntologyRestResponse<OntologyTransactionResult<TInner>>> {
    const url = `${this.url}/api/v1/transaction`
    const params = preExec ? '?preExec=1' : ''
    return fetchJson<OntologyRestResponse<OntologyTransactionResult<TInner>>>(url + params, {
      method: 'POST',
      body: {
        Action: 'sendrawtransaction',
        Version: '1.0.0',
        Data: data,
      },
    })
  }

  getContract(codeHash: string): Promise<OntologyRestResponse> {
    const url = `${this.url}/api/v1/contract/${codeHash}`
    return fetchJson<OntologyRestResponse>(url)
  }

  getBalance(address: string | { toBase58: () => string }): Promise<OntologyRestResponse> {
    const addr = typeof address === 'string' ? address : address.toBase58()
    const url = `${this.url}/api/v1/balance/${addr}`
    return fetchJson<OntologyRestResponse>(url)
  }

  getAllowance(
    asset: string,
    from: string | { toBase58: () => string },
    to: string | { toBase58: () => string }
  ): Promise<OntologyRestResponse> {
    const fromAddr = typeof from === 'string' ? from : from.toBase58()
    const toAddr = typeof to === 'string' ? to : to.toBase58()
    const url = `${this.url}/api/v1/allowance/${asset}/${fromAddr}/${toAddr}`
    return fetchJson<OntologyRestResponse>(url)
  }

  getUnboundong(address: string | { toBase58: () => string }): Promise<OntologyRestResponse> {
    const addr = typeof address === 'string' ? address : address.toBase58()
    const url = `${this.url}/api/v1/unboundong/${addr}`
    return fetchJson<OntologyRestResponse>(url)
  }

  getGrantOng(address: string | { toBase58: () => string }): Promise<OntologyRestResponse> {
    const addr = typeof address === 'string' ? address : address.toBase58()
    const url = `${this.url}/api/v1/grantong/${addr}`
    return fetchJson<OntologyRestResponse>(url)
  }

  getStorage(codeHash: string, key: string): Promise<OntologyRestResponse> {
    const url = `${this.url}/api/v1/storage/${codeHash}/${key}`
    return fetchJson<OntologyRestResponse>(url)
  }

  getBlockHeight(): Promise<OntologyRestResponse<number>> {
    const url = `${this.url}/api/v1/block/height`
    return fetchJson<OntologyRestResponse<number>>(url)
  }

  getBlockJson(height: number): Promise<OntologyRestResponse> {
    const url = `${this.url}/api/v1/block/details/height/${height}`
    return fetchJson<OntologyRestResponse>(url)
  }
}
