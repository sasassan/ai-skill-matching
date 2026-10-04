// Stripe Connect 連携のplaceholder。実際の実装時に秘密鍵を環境変数から読み込む。
export const stripeConnectEnabled = false

export function getConnectOnboardingUrl(): string {
  return "/mypage"
}
