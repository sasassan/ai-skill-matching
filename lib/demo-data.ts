export type UserRole = "requester" | "craftsman" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
  verified: boolean
}

export interface Skill {
  id: string
  name: string
  category: string
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface CraftsmanProfile {
  id: string
  userId: string
  bio: string
  location: string
  prefecture: string
  coordinates: Coordinates
  serviceAreas: string[]
  skills: Skill[]
  equipment: string[]
  materials: string[]
  specialSkills: string[]
  rating: number
  reviewCount: number
  completedOrders: number
  hourlyRate?: number
}

export interface PortfolioItem {
  id: string
  craftsmanId: string
  title: string
  description: string
  image: string
  tags: string[]
}

export type RequestStatus = "draft" | "structured" | "matching" | "quoted" | "contracted" | "in_progress" | "delivered" | "completed"

export interface RequestSpec {
  id: string
  requestId: string
  title: string
  summary: string
  category: string
  requiredSkills: string[]
  materials: string[]
  budget: string
  deadline: string
  notes: string
}

export interface ProjectRequest {
  id: string
  requesterId: string
  title: string
  description: string
  status: RequestStatus
  image?: string
  createdAt: string
  spec?: RequestSpec
}

export interface Match {
  id: string
  requestId: string
  craftsmanId: string
  score: number
  status: "pending" | "accepted" | "declined"
}

export interface Message {
  id: string
  requestId: string
  senderId: string
  text: string
  createdAt: string
}

export interface Estimate {
  id: string
  requestId: string
  craftsmanId: string
  amount: number
  description: string
  status: "pending" | "accepted" | "rejected"
}

export interface Transaction {
  id: string
  requestId: string
  title: string
  craftsmanName: string
  amount: number
  status: RequestStatus
  updatedAt: string
}

export interface Review {
  id: string
  transactionId: string
  reviewerId: string
  revieweeId: string
  rating: number
  comment: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export const currentUser: User = {
  id: "u-requester-1",
  name: "山田 太郎",
  email: "yamada@example.com",
  role: "requester",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=yamada",
  verified: true,
}

export const users: User[] = [
  currentUser,
  {
    id: "u-craftsman-1",
    name: "佐藤 匠",
    email: "sato@example.com",
    role: "craftsman",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sato",
    verified: true,
  },
  {
    id: "u-craftsman-2",
    name: "田中 工房",
    email: "tanaka@example.com",
    role: "craftsman",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka",
    verified: true,
  },
  {
    id: "u-craftsman-3",
    name: "鈴木 工芸",
    email: "suzuki@example.com",
    role: "craftsman",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=suzuki",
    verified: true,
  },
  {
    id: "u-craftsman-4",
    name: "高橋 カスタム",
    email: "takahashi@example.com",
    role: "craftsman",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=takahashi",
    verified: true,
  },
  {
    id: "u-craftsman-5",
    name: "伊藤 レザー",
    email: "ito@example.com",
    role: "craftsman",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ito",
    verified: true,
  },
  {
    id: "u-craftsman-6",
    name: "渡辺 ウッドワークス",
    email: "watanabe@example.com",
    role: "craftsman",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=watanabe",
    verified: true,
  },
  {
    id: "u-admin-1",
    name: "管理 花子",
    email: "admin@example.com",
    role: "admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    verified: true,
  },
]

export const skills: Skill[] = [
  { id: "s1", name: "内装張り替え", category: "内装" },
  { id: "s2", name: "シートカバー縫製", category: "縫製" },
  { id: "s3", name: "木製パネル加工", category: "木工" },
  { id: "s4", name: "樹脂成型", category: "成型" },
  { id: "s5", name: "CAD設計", category: "設計" },
  { id: "s6", name: "電装配線", category: "電装" },
]

export const craftsmanProfiles: CraftsmanProfile[] = [
  {
    id: "cp1",
    userId: "u-craftsman-1",
    bio: "30年以上の車両内装職人。レザー・ファブリック・木目調パネルまで、オーダーメイドで対応します。",
    location: "東京都世田谷区",
    prefecture: "東京都",
    coordinates: { lat: 35.6466, lng: 139.6532 },
    serviceAreas: ["東京都", "神奈川県", "埼玉県"],
    skills: [skills[0], skills[1], skills[2]],
    equipment: ["工業用ミシン", "レザークラフト工具", "CNCルーター"],
    materials: ["本革", "合皮", "ファブリック", "アルカンターラ"],
    specialSkills: ["オーダーシート縫製", "ステッチカラー自由", "抗菌加工生地対応"],
    rating: 4.8,
    reviewCount: 23,
    completedOrders: 156,
    hourlyRate: 8000,
  },
  {
    id: "cp2",
    userId: "u-craftsman-2",
    bio: "車載収納と内装カスタムを得意とする工房。着脱式収納ボックスや釣り具ラックの実績多数。",
    location: "神奈川県横浜市",
    prefecture: "神奈川県",
    coordinates: { lat: 35.4437, lng: 139.638 },
    serviceAreas: ["神奈川県", "東京都", "千葉県"],
    skills: [skills[2], skills[3], skills[4]],
    equipment: ["3Dプリンター", "レーザーカッター", "丸ノコ盤"],
    materials: ["合板", "MDF", "ABS樹脂", "ポリカーボネート"],
    specialSkills: ["着脱式収納設計", "3Dデータ作成", "軽量化設計"],
    rating: 4.6,
    reviewCount: 17,
    completedOrders: 89,
    hourlyRate: 7000,
  },
  {
    id: "cp3",
    userId: "u-craftsman-3",
    bio: "木工を軸にした車内パネル・収納の製作工房。細かなサイズ合わせと塗装仕上げが強みです。",
    location: "埼玉県さいたま市",
    prefecture: "埼玉県",
    coordinates: { lat: 35.8617, lng: 139.6455 },
    serviceAreas: ["埼玉県", "東京都", "群馬県"],
    skills: [skills[2], skills[4]],
    equipment: ["丸ノコ盤", "トリマー", "塗装ブース"],
    materials: ["合板", "無垢材", "突板", "ウレタン塗料"],
    specialSkills: ["曲面加工", "塗装仕上げ", "オーダーパネル"],
    rating: 4.4,
    reviewCount: 11,
    completedOrders: 54,
    hourlyRate: 6000,
  },
  {
    id: "cp4",
    userId: "u-craftsman-4",
    bio: "樹脂成型と電装配線を得意とするカスタム工房。LED照明や充電ポートなど電装系の相談も可能です。",
    location: "千葉県千葉市",
    prefecture: "千葉県",
    coordinates: { lat: 35.6074, lng: 140.1065 },
    serviceAreas: ["千葉県", "東京都", "茨城県"],
    skills: [skills[3], skills[5]],
    equipment: ["3Dプリンター", "真空成型機", "配線工具一式"],
    materials: ["ABS樹脂", "ポリカーボネート", "アクリル", "LEDユニット"],
    specialSkills: ["電装配線", "LED加工", "防水加工"],
    rating: 4.7,
    reviewCount: 19,
    completedOrders: 71,
    hourlyRate: 9000,
  },
  {
    id: "cp5",
    userId: "u-craftsman-5",
    bio: "本革シートの張り替えと縫製を専門とするレザー工房。スポーツカーの内装リフレッシュ実績多数。",
    location: "東京都練馬区",
    prefecture: "東京都",
    coordinates: { lat: 35.7356, lng: 139.6517 },
    serviceAreas: ["東京都", "埼玉県", "神奈川県"],
    skills: [skills[0], skills[1]],
    equipment: ["工業用ミシン", "革裁断機", "ヒートプレス"],
    materials: ["本革", "スエード", "アルカンターラ", "ステッチ糸"],
    specialSkills: ["本革縫製", "シート張り替え", "内装フルリフレッシュ"],
    rating: 4.9,
    reviewCount: 31,
    completedOrders: 203,
    hourlyRate: 11000,
  },
  {
    id: "cp6",
    userId: "u-craftsman-6",
    bio: "車中泊・アウトドア向けの木製パネルや収納を手がけるワークス。軽量で丈夫な構造設計が得意です。",
    location: "神奈川県川崎市",
    prefecture: "神奈川県",
    coordinates: { lat: 35.5308, lng: 139.703 },
    serviceAreas: ["神奈川県", "東京都"],
    skills: [skills[2]],
    equipment: ["丸ノコ盤", "電動ドリル", "サンダー"],
    materials: ["合板", "シナベニヤ", "断熱材", "防水塗料"],
    specialSkills: ["車中泊レイアウト", "断熱施工", "軽量化設計"],
    rating: 4.3,
    reviewCount: 8,
    completedOrders: 36,
    hourlyRate: 5500,
  },
]

export const portfolioItems: PortfolioItem[] = [
  {
    id: "p1",
    craftsmanId: "cp1",
    title: "アルファード 本革シート張替え",
    description: "ブラウンレザーで高級感のあるシートへ張り替え。",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    tags: ["レザー", "シート", "ミニバン"],
  },
  {
    id: "p2",
    craftsmanId: "cp1",
    title: "ハイエース ウッドパネル内装",
    description: "床・壁面に木目調パネルを施工し、キャンピング仕様に。",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80",
    tags: ["木目調", "パネル", "キャンピング"],
  },
  {
    id: "p3",
    craftsmanId: "cp2",
    title: "軽トラ 着脱式工具箱",
    description: "現場で使う工具を整理できる着脱式収納を設計・製作。",
    image: "https://images.unsplash.com/photo-1605218427306-022ba6c554e6?w=800&q=80",
    tags: ["収納", "工具箱", "軽トラ"],
  },
  {
    id: "p4",
    craftsmanId: "cp2",
    title: "ステップワゴン 釣り具ラック",
    description: "ロッドホルダー付きの車内ラック。釣り後も車内を快適に。",
    image: "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800&q=80",
    tags: ["ラック", "釣り", "アウトドア"],
  },
]

export const requestSpec: RequestSpec = {
  id: "rs1",
  requestId: "r1",
  title: "アルファード 着脱式収納ボックス製作",
  summary: "3列目収納に入る、荷物を仕切りできる着脱式ボックス。軽量で工具不要で取り外せる設計。",
  category: "車両内装カスタム（収納）",
  requiredSkills: ["木工", "CAD設計", "樹脂成型"],
  materials: ["合板", "滑り止めフェルト", "取っ手金具"],
  budget: "15万円〜25万円",
  deadline: "2026年12月中旬",
  notes: "子供用品とキャンプ道具を分けたい。防水加工希望。",
}

export const requests: ProjectRequest[] = [
  {
    id: "r1",
    requesterId: "u-requester-1",
    title: "アルファード 着脱式収納ボックス製作",
    description: "3列目シート下のデッドスペースを活用し、子供用品とキャンプ道具を分けられる着脱式の収納ボックスが欲しい。軽量で、工具なしで取り外せる仕様。",
    status: "matching",
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    createdAt: "2026-10-01T10:00:00Z",
    spec: requestSpec,
  },
  {
    id: "r2",
    requesterId: "u-requester-1",
    title: "ハイエース 内壁ウッドパネル貼り",
    description: "キャンピング仕様にするため、内壁と床に耐水ウッドパネルを貼りたい。",
    status: "quoted",
    createdAt: "2026-09-20T09:00:00Z",
  },
]

export const matches: Match[] = [
  { id: "m1", requestId: "r1", craftsmanId: "cp2", score: 96, status: "pending" },
  { id: "m2", requestId: "r1", craftsmanId: "cp1", score: 82, status: "pending" },
]

export const estimates: Estimate[] = [
  {
    id: "e1",
    requestId: "r2",
    craftsmanId: "cp1",
    amount: 220000,
    description: "材料費・施工費込みの見積りです。納期は2週間を予定しています。",
    status: "pending",
  },
]

export const messages: Message[] = [
  {
    id: "msg1",
    requestId: "r2",
    senderId: "u-craftsman-1",
    text: "ご依頼ありがとうございます。木材の種類はお任せでよろしいでしょうか？",
    createdAt: "2026-09-21T10:00:00Z",
  },
  {
    id: "msg2",
    requestId: "r2",
    senderId: "u-requester-1",
    text: "予算内であればオーク調でお願いします。",
    createdAt: "2026-09-21T11:00:00Z",
  },
]

export const transactions: Transaction[] = [
  {
    id: "t1",
    requestId: "r2",
    title: "ハイエース 内壁ウッドパネル貼り",
    craftsmanName: "佐藤 匠",
    amount: 220000,
    status: "quoted",
    updatedAt: "2026-09-21T11:00:00Z",
  },
]

export const reviews: Review[] = [
  {
    id: "rev1",
    transactionId: "t-old",
    reviewerId: "u-requester-1",
    revieweeId: "u-craftsman-1",
    rating: 5,
    comment: "丁寧な対応で、仕上がりも満足です。",
  },
]

export const notifications: Notification[] = [
  {
    id: "n1",
    userId: "u-requester-1",
    title: "AI仕様書が完成しました",
    body: "「アルファード 着脱式収納ボックス」の仕様書を確認してください。",
    read: false,
    createdAt: "2026-10-01T10:05:00Z",
  },
  {
    id: "n2",
    userId: "u-requester-1",
    title: "マッチング候補が2件見つかりました",
    body: "対応可能な技能者が見つかりました。プロフィールを確認しましょう。",
    read: false,
    createdAt: "2026-10-02T09:00:00Z",
  },
]

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

export function getCraftsmanById(id: string): CraftsmanProfile | undefined {
  return craftsmanProfiles.find((p) => p.id === id)
}

export function getRequestById(id: string): ProjectRequest | undefined {
  return requests.find((r) => r.id === id)
}

export function getMatchesForRequest(requestId: string): Match[] {
  return matches.filter((m) => m.requestId === requestId)
}

export function getPortfolioForCraftsman(craftsmanId: string): PortfolioItem[] {
  return portfolioItems.filter((p) => p.craftsmanId === craftsmanId)
}

export function getMessagesForRequest(requestId: string): Message[] {
  return messages.filter((m) => m.requestId === requestId)
}
