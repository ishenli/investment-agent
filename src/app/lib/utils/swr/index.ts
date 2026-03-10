import useSWR, { SWRHook } from 'swr';

const isDesktop = true;

/**
 * This type of request method is relatively flexible data, which will be triggered on the first time
 *
 * Refresh rules have two types:
 *
 * - when the user refocuses, it will be refreshed outside the 5mins interval.
 * - can be combined with refreshXXX methods to refresh data
 *
 * Suitable for messages, topics, sessions, and other data that users will interact with on the client.
 *
 * 这一类请求方法是相对灵活的数据，会在请求时触发
 *
 * 刷新规则有两种：
 * - 当用户重新聚焦时，在 5mins 间隔外会重新刷新一次
 * - 可以搭配 refreshXXX 这样的方法刷新数据
 *
 * 适用于 messages、topics、sessions 等用户会在客户端交互的数据
 */
// @ts-expect-error SWRHook generic overload mismatch
export const useClientDataSWR: SWRHook = (key, fetch, config) =>
  useSWR(key, fetch, {
    // 原先设置为 0 是为了解决快速切换 session 时的问题，
    // 但 0 会导致极短时间内并发触发多次真实请求。
    // 设为 300ms：在同一渲染周期内的并发触发会被合并，
    // 同时不影响正常的用户交互切换场景。
    dedupingInterval: 300,
    focusThrottleInterval:
      // FIXME: desktop 云同步模式也是走 edge 请求，也应该增大延迟
      // desktop 1.5s
      isDesktop
        ? 1500
        : // web 300s
          5 * 60 * 1000,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    ...config,
  });

/**
 * This type of request method is relatively "dead" request mode, which will only be triggered on the first request.
 * it suitable for first time request like `initUserState`

 * 这一类请求方法是相对“死”的请求模式，只会在第一次请求时触发。
 * 适用于第一次请求，例如 `initUserState`
 */
// @ts-expect-error SWRHook generic overload mismatch
export const useOnlyFetchOnceSWR: SWRHook = (key, fetch, config) =>
  useSWR(key, fetch, {
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    ...config,
  });

/**
 * 这一类请求方法用于做操作触发，必须使用 mutute 来触发请求操作，好处是自带了 loading / error 状态。
 * 可以很简单地完成 loading / error 态的交互处理，同时，相同 swr key 的请求会自动共享 loading态（例如新建助手按钮和右上角的 + 号）
 * 非常适用于新建等操作。
 */
// @ts-expect-error SWRHook generic overload mismatch
export const useActionSWR: SWRHook = (key, fetch, config) =>
  useSWR(key, fetch, {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    ...config,
  });

export interface SWRRefreshParams<T, A = (...args: any[]) => any> {
  action: A;
  optimisticData?: (data: T | undefined) => T;
}

export type SWRefreshMethod<T> = <A extends (...args: any[]) => Promise<any>>(
  params?: SWRRefreshParams<T, A>,
) => ReturnType<A>;
