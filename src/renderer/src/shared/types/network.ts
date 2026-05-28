export interface ApiResponse<T = unknown> {
  code: number
  result: T
  msg?: string
}

export interface HttpRequestConfig {
  params?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  method?: string
  url?: string
  data?: unknown
}
