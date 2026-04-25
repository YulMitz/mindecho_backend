# Prompt Cache: Modular Attention Reuse for Low-Latency Inference

> 論文摘要與 Mind Echo 系統適用性分析

**論文資訊**: In Gim et al., Yale University & Google, MLSys 2024
**原始論文**: arXiv:2311.04934v2

---

## 一、論文核心概念

### 1.1 要解決什麼問題？

LLM 每次收到一個 prompt 時，都需要對整段文字做「注意力計算」（attention computation），這是產生第一個回覆字元之前最耗時的步驟。但實際上，很多 prompt 之間有大量重複的文字——例如每次都一樣的系統指令（system message）、固定的文件內容、相同的 prompt 模板。

**問題**：即便內容完全一樣，每次請求都從頭重新計算這些重複部分的注意力狀態（attention states），造成不必要的延遲。

### 1.2 Prompt Cache 的解法

Prompt Cache 的核心想法：**把重複出現的文字段落的注意力狀態（KV Cache）預先算好、存在記憶體裡，下次遇到相同段落時直接取用，不用重新計算。**

用日常比喻來說：

- **傳統方式**：每次客人點餐，廚師都從頭開始備料、切菜、烹飪。
- **KV Cache**（現有技術）：一道菜做完後，留著已經處理過的食材，做下一步時不用重複處理。
- **Prompt Cache**（本論文）：把常用的配料（高湯、醬汁）預先熬好放冰箱，任何客人點餐只要用到這些配料，直接從冰箱拿出來用。

### 1.3 原理視覺化

#### 三種方式的比較

LLM 在回覆之前，必須先「讀懂」整段 prompt。讀懂的過程就是計算每個字的注意力狀態（KV 值）。以下比較三種方式如何處理一段 prompt：

```
  prompt 內容:  [系統指令] [治療模式] [知識文獻] [歷史對話] [新訊息]

  ═══════════════════════════════════════════════════════════════

  方式一：無快取（每次從頭算）

  第 1 次請求:
    計算 ██████████████████████████████████████████  → 產生回覆
         系統指令   治療模式   知識文獻   歷史     新訊息
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ~~~~~~~~
                    全部重新計算                     全部重新計算

  第 2 次請求（只多了一輪對話）:
    計算 ████████████████████████████████████████████████  → 產生回覆
         系統指令   治療模式   知識文獻   歷史(更長)   新訊息
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ~~~~~~~~
         又全部重新算了一次，即使前面都沒變               唯一的新內容

  ⚠ 每次請求都做完整計算，跟第一次一樣慢

  ═══════════════════════════════════════════════════════════════

  方式二：KV Cache（同一次請求內重用）

  第 1 次請求:
    Step 1  計算 ██████████████████████████████████████  → 第 1 個字
    Step 2  重用 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██ → 第 2 個字
    Step 3  重用 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█ → 第 3 個字
            ...

    ░ = 重用已計算的 KV 狀態（不重新算）
    █ = 新計算

  第 2 次請求:
    Step 1  計算 ████████████████████████████████████████████  → 第 1 個字
                 又從頭算了！跟上次一樣的系統指令、治療模式...

  ✅ 同一次請求內，生成每個字時不用重算前面的
  ⚠ 不同請求之間，還是從頭計算

  ═══════════════════════════════════════════════════════════════

  方式三：Prompt Cache（跨請求重用）

  首次載入（預計算）:
    計算 ██████████  ████████  ████████████
         系統指令     治療模式    知識文獻
         ↓            ↓          ↓
         存入快取      存入快取    存入快取

  第 1 次請求:
    取出 ░░░░░░░░░░  ░░░░░░░░  ░░░░░░░░░░░░  計算 ██████  ████
         系統指令     治療模式    知識文獻           歷史    新訊息
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
         直接從快取取出，不用計算               只算這些新的部分

  第 2 次請求（多了一輪對話）:
    取出 ░░░░░░░░░░  ░░░░░░░░  ░░░░░░░░░░░░  ░░░░░░  計算 ██  ████
         系統指令     治療模式    知識文獻       歷史(快取) 新歷史 新訊息
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
         全部從快取取出                                  只算新增的

  ✅ 重複的部分永遠不重算，只計算新增的內容
  ✅ prompt 越長、重複比例越高 → 省越多
```

#### 套用到 Mind Echo 的實際場景

以一個 CBT 對話進行到第 5 輪為例：

```
  第 5 輪的完整 prompt（~5,000 tokens）
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  ┌──────────────────┐  每次都 100% 相同                         │
  │  │ 基礎人設          │  「你是一位溫暖、有耐心的治療師...」          │
  │  │ ~1,200 tokens    │                                           │
  │  └──────────────────┘                                           │
  │  ┌──────────────────┐  同一個 chatbotType 的對話都相同             │
  │  │ CBT 模式增強      │  「你幫助使用者覺察思考與行為的連結...」       │
  │  │ ~150 tokens      │                                           │
  │  └──────────────────┘                                           │
  │  ┌──────────────────┐  同主題的對話通常會選到相同文件               │
  │  │ RAG 知識文獻      │  (從 40+ 篇中選出的 1~3 篇)                │
  │  │ ~500-2,000 tokens│                                           │
  │  └──────────────────┘                                           │
  │  ┌──────────────────┐  同一個 session 中，前 4 輪都沒變            │
  │  │ 歷史對話 1-4 輪   │  user → model → user → model → ...        │
  │  │ ~1,500 tokens    │                                           │
  │  └──────────────────┘                                           │
  │  ┌──────────────────┐  ← 唯一真正「新」的內容                     │
  │  │ 第 5 輪新訊息     │                                           │
  │  │ ~100 tokens      │                                           │
  │  └──────────────────┘                                           │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘


  沒有 cache:                     有 cache:
  ─────────────────               ─────────────────
  ██████████████████████████      ░░░░░░░░░░░░░░░░░░░░░░████
  ←── 全部 5,000 tokens ──→      ←── 快取 4,900 ──→←100→
      全部重新計算                    直接取用         只算這些

  █ = 需要計算的 token             ░ = 從快取取用的 token

  計算量:  5,000 tokens            計算量:  ~100 tokens
  TTFT:    ~500ms                  TTFT:    ~50ms
  費用:    5,000 × 全價             費用:    4,900 × 10% + 100 × 全價
                                         = 590 等效 tokens（省 88%）
```

#### 快取命中的條件

快取的 key 是「完全相同的 token 前綴」。用一張圖來理解什麼時候會命中：

```
  快取命中 ✅ ── 同一個 session 的下一輪對話
  ────────────────────────────────────────────────────────

  第 5 輪:  [系統指令][CBT][知識][歷史1-4][訊息5]
  第 6 輪:  [系統指令][CBT][知識][歷史1-4][歷史5][訊息6]
            ═══════════════════════════════
            ↑ 前綴完全相同 → 命中！


  快取命中 ✅ ── 不同 user，但相同的系統指令前綴
  ────────────────────────────────────────────────────────

  User A:  [系統指令][CBT][A的歷史...][A的訊息]
  User B:  [系統指令][CBT][B的歷史...][B的訊息]
           ════════════════
           ↑ system prompt + CBT 模式相同 → 這段命中！


  快取未命中 ❌ ── 不同的治療模式
  ────────────────────────────────────────────────────────

  User A:  [系統指令][CBT][A的歷史...][A的訊息]
  User C:  [系統指令][MBT][C的歷史...][C的訊息]
           ════════════
           ↑ 到這裡相同
                      ↑ 這裡不同 → 從此之後都無法命中


  快取未命中 ❌ ── 超過 5 分鐘沒有請求
  ────────────────────────────────────────────────────────

  09:00:00  User A 第 5 輪 → 建立快取
  09:04:59  User A 第 6 輪 → 命中（4 分 59 秒內）✅
  09:12:00  User A 第 7 輪 → 未命中（距上次 >5 分鐘）❌ → 重新建立
```

### 1.4 兩個關鍵技術

#### 技術一：Prompt Markup Language (PML)

用一種標記語言把 prompt 的結構「模組化」，明確定義哪些文字段落可以重複利用：

```xml
<!-- Schema: 定義可重用的模組 -->
<schema name="therapy">
  <module name="system-prompt">
    You are a warm, caring therapist...
  </module>
  <module name="cbt-approach">
    Your approach is Cognitive Behavioral Therapy...
  </module>
  <module name="mbt-approach">
    Your approach is Mentalization-Based Therapy...
  </module>
  <module name="knowledge-doc">
    <param name="content" len=2000/>
  </module>
</schema>

<!-- Prompt: 組合模組成實際 prompt -->
<prompt schema="therapy">
  <system-prompt/>
  <cbt-approach/>
  <knowledge-doc content="..." />
  What are the user's core beliefs?
</prompt>
```

#### 技術二：不連續位置 ID 的實驗發現

Transformer 模型的注意力狀態與「位置」綁定。論文發現，只要每個模組內部的相對位置正確，模組之間的位置 ID 不需要連續，模型仍能正確運作。這讓模組可以自由組合拼接。

### 1.4 效能提升

| 指標 | GPU 推論 | CPU 推論 |
|------|---------|---------|
| TTFT 延遲降低 | 8-10 倍 | 20-60 倍 |
| 輸出品質 | 無顯著下降 | 無顯著下降 |
| 記憶體開銷 | 0.5 MB/token (7B 模型) | 同左 |

- **TTFT**（Time-To-First-Token）：從送出請求到收到第一個字的時間。
- 提升幅度隨 prompt 長度的平方增長——prompt 越長，Prompt Cache 的優勢越大。
- 後續 token 的生成速度不受影響（只優化第一個 token 的延遲）。

### 1.5 適用場景

論文驗證的三個應用場景：

1. **程式碼生成**：原始碼檔案作為模組，按需引入 → GPU 延遲從 924ms 降到 93ms（10 倍）
2. **個人化推薦**：使用者特徵作為模組，用 union 標籤處理互斥選項 → GPU 延遲從 216ms 降到 65ms（3.3 倍）
3. **參數化模板**：旅遊規劃等模板化 prompt，用參數替換動態部分 → GPU 延遲從 75ms 降到 54ms（1.4 倍）

### 1.6 限制

- **需要自建推論服務**：Prompt Cache 修改了模型的推論流程（約 20 行程式碼/模型），需要在自己的伺服器上跑模型。
- **記憶體開銷**：大模型（70B）每個 token 需要 2.5 MB 記憶體來存 KV Cache。
- **模組間遮罩效應**：各模組獨立計算注意力，語意上有依賴關係的模組可能品質下降（可用 scaffolding 機制解決但增加記憶體）。

---

## 二、Mind Echo 系統的「冷啟動」問題分析

### 2.1 我們的系統確實是每次冷啟動嗎？

**是的，本質上每次 API 呼叫都是冷啟動。** 以下是每次使用者發送訊息時，系統完整的 prompt 組裝過程：

```
每次 API 呼叫實際送出的內容
────────────────────────────────────────────
┌──────────────────────────────────────────┐
│ System Prompt（每次都完整重送）             │
│ ├── 基礎人設 (~1,200 tokens)              │
│ │   "You are a warm, genuinely caring     │
│ │    therapist companion..."              │
│ ├── 治療模式增強 (~150 tokens)             │
│ │   CBT / MBT / MBCT / INITIAL 擇一       │
│ └── 知識參考資料 (~500-2,000 tokens)       │
│     RAG 挑選的 1-3 篇治療文獻              │
├──────────────────────────────────────────┤
│ Conversation History（每次都完整重送）      │
│ ├── user: 第 1 則訊息                     │
│ ├── model: 第 1 則回覆                    │
│ ├── user: 第 2 則訊息                     │
│ ├── model: 第 2 則回覆                    │
│ │   ... (最多 50 則)                      │
│ └── user: 最新訊息                        │
├──────────────────────────────────────────┤
│ Token 估算（單次請求）                     │
│ ├── System Prompt:  ~1,500 - 3,500 tokens │
│ ├── History (20則): ~2,000 - 4,000 tokens │
│ ├── 最新訊息:       ~50 - 200 tokens      │
│ └── 總計:           ~3,500 - 7,700 tokens │
└──────────────────────────────────────────┘
```

**重複浪費的部分**：

| 重複內容 | 每次重送的 Token 數 | 跨請求是否相同 |
|---------|-------------------|-------------|
| 基礎人設 system prompt | ~1,200 | 100% 相同（所有用戶、所有對話） |
| 治療模式增強 | ~150 | 同一 chatbotType 的對話 100% 相同 |
| 知識文獻 | ~500-2,000 | 部分重複（同主題的對話會選到相同文件） |
| 對話歷史前段 | ~1,000-3,000 | 同一對話 100% 相同（只是尾巴多一條） |

**每次請求中有 50%-80% 的 token 是在重複處理已經處理過的內容。**

### 2.2 冷啟動的具體代價

以我們的系統為例，每次使用者發送一則訊息，實際觸發的 LLM API 呼叫：

```
使用者送出 1 則訊息
        │
        ▼
┌───────────────────────────────────────────────┐
│ API 呼叫 #1: 對話摘要（知識選取 Step 0）         │
│ 輸入: summary prompt + 最近 6 則對話             │
│ 估計 input tokens: ~800                        │
│ ⚠ 冷啟動: summary prompt 每次都重算              │
├───────────────────────────────────────────────┤
│ API 呼叫 #2: 知識選取（知識選取 Step 1）          │
│ 輸入: selection prompt + 知識索引 + 摘要 + 訊息   │
│ 估計 input tokens: ~1,500                      │
│ ⚠ 冷啟動: selection prompt + 知識索引每次都重算   │
├───────────────────────────────────────────────┤
│ API 呼叫 #3: 治療回覆生成（主要回覆）             │
│ 輸入: system prompt + 知識 + 歷史 + 訊息         │
│ 估計 input tokens: ~3,500 - 7,700              │
│ ⚠ 冷啟動: system prompt + 歷史前段每次都重算      │
└───────────────────────────────────────────────┘

每則使用者訊息 → 3 次 API 呼叫 → ~5,800 - 10,000 input tokens
其中 ~60-80% 是重複內容
```

---

## 三、能否在 Mind Echo 中應用 Prompt Cache？

### 3.1 直接應用論文技術？— 不行

Prompt Cache 論文的技術是在**自建推論伺服器**上修改模型的 KV Cache 機制。我們的系統使用外部 API（Gemini / Anthropic），無法直接修改它們的推論引擎。

### 3.2 但 API 供應商已經提供了等價功能！

好消息是，Gemini 和 Anthropic 都已經將類似 Prompt Cache 的概念實作為 API 功能：

#### Anthropic: Prompt Caching（cache_control）

Anthropic 允許在 `system` 或 `messages` 中標記 `cache_control` 斷點，API 會自動快取該斷點之前的 KV 狀態。

```python
# 改造前（目前的寫法）—— 每次冷啟動
response = await client.messages.create(
    model=model,
    max_tokens=1000,
    system=system_prompt,       # 每次都重新處理
    messages=messages,          # 每次都重新處理
)

# 改造後 —— 使用 prompt caching
response = await client.messages.create(
    model=model,
    max_tokens=1000,
    system=[
        {
            "type": "text",
            "text": base_system_prompt,       # ~1,200 tokens, 幾乎不變
            "cache_control": {"type": "ephemeral"}  # 標記快取斷點
        },
        {
            "type": "text",
            "text": therapy_mode_prompt,      # ~150 tokens
            "cache_control": {"type": "ephemeral"}
        },
        {
            "type": "text",
            "text": knowledge_context,        # ~500-2,000 tokens
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=messages,  # 對話歷史也可以標記快取
)
```

**Anthropic Prompt Caching 的效益**：
- 快取命中時，input token 費用降為原來的 **10%**
- TTFT 延遲降低（API 端跳過已快取部分的 attention 計算）
- 快取有效期：5 分鐘（ephemeral），期間有新請求會自動續期
- 最低快取門檻：1,024 tokens（Haiku）

#### Google Gemini: Context Caching

Gemini 提供 `CachedContent` API，可以將大量上下文預先快取在 Google 伺服器上。

```python
# 改造後 —— 使用 context caching
from google import genai

client = genai.Client(api_key=api_key)

# 預先建立快取（例如系統啟動時，或每種 chatbotType 各建一個）
cache = client.caches.create(
    model=model,
    config=genai.types.CreateCachedContentConfig(
        system_instruction=base_system_prompt,
        contents=[
            genai.types.Content(
                role="user",
                parts=[genai.types.Part(text=therapy_mode_context)]
            )
        ],
        ttl="3600s",  # 快取 1 小時
    )
)

# 後續請求引用快取
response = await client.aio.models.generate_content(
    model=model,
    contents=[...],  # 只送新的訊息
    config=genai.types.GenerateContentConfig(
        cached_content=cache.name,  # 引用快取
        temperature=0.7,
    ),
)
```

**Gemini Context Caching 的效益**：
- 快取的 token 費用降為原來的 **25%**
- 最低快取門檻：較大（需要達到一定 token 數才划算）
- 快取可設定 TTL，適合長時間重複使用的上下文

### 3.3 Mind Echo 可快取的模組對照

將論文的 Prompt Module 概念對應到我們系統中可快取的部分：

```
論文概念                    Mind Echo 對應                    可快取性
─────────────────────────────────────────────────────────────────
Prompt Module (固定)     → 基礎人設 system prompt            ✅ 高度可快取
                           (~1,200 tokens，所有請求相同)

Prompt Module (固定)     → 治療模式增強 (CBT/MBT/MBCT)       ✅ 高度可快取
                           (~150 tokens，同模式請求相同)

Union Module             → 治療模式選擇                      ✅ 適合 union
                           (四種模式互斥，只選一種)

Prompt Module (動態)     → RAG 知識文獻                      ⚠️ 部分可快取
                           (來自固定的 40+ 篇文件池)

Scaffolding              → System Prompt + 知識文獻整體       ⚠️ 需要 scaffolding
                           (語意上有依賴，需共享注意力範圍)

Parameter                → 對話歷史中的最新訊息               ✅ 適合當 parameter
                           (每次不同，但前面的內容固定)

遞增式快取               → 對話歷史                          ✅ 高度可快取
                           (每次只多一則，前面都不變)
```

### 3.4 預估效益

假設實作 API 層級的 prompt caching：

```
改造前（每次冷啟動）
────────────────────────────────────
主回覆 API 呼叫:
  Input tokens:  ~5,000 (平均)
  費用:          5,000 × 正常費率
  TTFT:          完整 prefill 延遲

改造後（啟用 prompt caching）
────────────────────────────────────
主回覆 API 呼叫:
  快取命中 tokens: ~4,000 (system + history 前段)
  新計算 tokens:   ~1,000 (最新訊息 + 新知識)
  費用:           4,000 × 10% + 1,000 × 正常費率
                 = 1,400 等效 tokens（節省 72%）
  TTFT:          大幅降低（只需計算 1,000 tokens 的 attention）

知識選取 API 呼叫（2 次）:
  原本:    ~2,300 tokens × 2
  快取後:  selection prompt + 知識索引可快取
          節省 ~50% tokens

總計每則訊息:
  Token 費用節省:  ~60-70%
  TTFT 改善:       預估 2-4 倍（取決於快取命中率）
```

---

## 四、API Session 與 Per-Session Cache 的可行性

### 4.1 API 供應商有 Server-Side Session 嗎？

**兩家都沒有。** Anthropic 和 Gemini 的 API 都是完全無狀態（stateless）的設計。

| | Anthropic | Gemini |
|---|---|---|
| Server-side session | ❌ 沒有 | ❌ 沒有 |
| 對話狀態管理 | 每次必須自己送完整歷史 | 每次必須自己送完整歷史 |
| client.chats.create() | 不存在 | 有，但只是客戶端封裝，底層仍把完整歷史打包送出 |

這表示我們目前在 PostgreSQL 管理 session、每次從 DB 撈歷史重送的做法，已經是業界標準，不是我們的問題。所有使用外部 LLM API 的系統都必須這樣做。

### 4.2 Cache 能 by Session 嗎？

#### Anthropic：天然支援 per-session（自動 prefix 匹配）

Anthropic 的 `cache_control` 不需要指定 session ID 或 user ID。它的 cache key 是 **「完全相同的 token 前綴」**，scope 是同一個 API key 下所有請求共享。

這意味著：
- **同一個 session 的連續對話天然會命中快取**，因為前綴（system prompt + 歷史前段）完全相同。
- **不同 user 的 system prompt 前綴相同**，也會共享快取（這是好事，省更多）。
- **不同 user 的對話歷史天然隔離**，因為前綴在歷史部分就分叉了。

```
同一 session 的兩次連續請求（第 5 輪和第 6 輪）
───────────────────────────────────────────────────────────────

第 5 輪請求:
  [system prompt] + [歷史 1-4] + [user 第 5 則訊息]
  ─────────────────────────────
  ↑ 這段被快取

第 6 輪請求:
  [system prompt] + [歷史 1-4] + [歷史 5(user+model)] + [user 第 6 則訊息]
  ─────────────────────────────
  ↑ 這段前綴相同 → 快取命中 ✅（只要 5 分鐘內）
     只需計算 [歷史 5] + [第 6 則訊息] 的 attention


不同 user 的請求
───────────────────────────────────────────────────────────────

User A: [system prompt] + [A 的歷史 1-5] + [A 的新訊息]
User B: [system prompt] + [B 的歷史 1-3] + [B 的新訊息]
        ───────────────
        ↑ system prompt 前綴相同 → 共享快取 ✅

        但 [A 的歷史] ≠ [B 的歷史]，歷史部分各自獨立 → 天然隔離 ✅
        不會出現 A 的對話內容洩漏給 B 的問題
```

**Anthropic cache_control 規格**：

| 項目 | 規格 |
|------|------|
| Cache scope | 同一 API key 下所有請求共享 |
| Cache key | 完全相同的 token 前綴（exact prefix match） |
| TTL | 5 分鐘（每次命中自動續期） |
| 最低門檻 | 1,024 tokens（Haiku）/ 2,048 tokens（Sonnet） |
| cache_control 類型 | 目前只有 `{"type": "ephemeral"}` |
| 費用 | 快取命中：input token 費率的 10%；快取建立：input token 費率的 125% |
| User/Session 欄位 | 無，不需要——prefix 匹配天然實現 per-session |

#### Gemini：需手動管理，但門檻太高

Gemini 的 `CachedContent` 是手動建立的具名快取，理論上可以 per-session 建立：

```python
# 理論上可以：為每個 session 建一個 CachedContent
cache = client.caches.create(
    model=model,
    config=genai.types.CreateCachedContentConfig(
        system_instruction=system_prompt,
        contents=[...session_history...],
        ttl="3600s",
    )
)
# 後續請求引用
response = await client.aio.models.generate_content(
    model=model,
    contents=[new_message],
    config=genai.types.GenerateContentConfig(
        cached_content=cache.name,  # 引用這個 session 的快取
    ),
)
```

**但有一個致命限制**：

| 限制 | 數值 |
|------|------|
| **Gemini 最低快取門檻** | **32,768 tokens** |
| 我們的 system prompt | ~1,200 - 3,500 tokens |
| 我們的完整請求（含長歷史） | ~3,500 - 7,700 tokens |

**我們的 prompt 最多不到 8K tokens，遠遠不到 32K 的門檻。Gemini Context Caching 對我們目前不適用。**

### 4.3 結論比較

```
                        Anthropic              Gemini
                        ──────────             ──────────
Server-side session     ❌ 沒有                 ❌ 沒有
Cache 機制              cache_control          CachedContent
                        (自動 prefix 匹配)      (手動建立)
最低門檻                1,024 tokens (Haiku)    32,768 tokens
對我們適用嗎？           ✅ 非常適用              ❌ 門檻太高

Per-session cache       天然支援 ✅              技術上可以但門檻限制 ❌
                        (同 session 前綴相同     (需 ≥32K 才能建快取)
                         → 自動命中)

跨 user 共享            system prompt 部分 ✅    可以但門檻限制 ❌
                        歷史部分天然隔離 ✅

安全性（對話隔離）       天然隔離 ✅              天然隔離 ✅
                        不同歷史 = 不同前綴       不同 cache name
                        不會互相汙染             不會互相汙染
```

---

## 五、實作建議

### 5.1 優先度排序

| 優先 | 改動 | 效益 | 難度 |
|-----|------|------|------|
| 🔴 P0 | Anthropic provider 加入 `cache_control` | 立即省錢 + 降低 TTFT | 低（改幾行程式碼） |
| 🔴 P0 | 對話歷史使用遞增式快取 | 長對話效益最大 | 低 |
| 🟡 P1 | Gemini provider 使用 Context Caching | 省錢 + 降低 TTFT | 中（需管理 cache 生命週期） |
| 🟡 P1 | 知識選取的 system prompt 快取 | 每則訊息省 2 次 API 呼叫的冷啟動 | 低 |
| 🟢 P2 | 知識文獻池預快取 | RAG 注入幾乎零延遲 | 中（需按 chatbotType 預建快取） |

### 5.2 Anthropic 改造範例（P0）

```python
# inference/src/providers/anthropic.py — 改造後

async def generate(
    system_prompt: str,
    conversation_history: list[dict],
    message: str,
    *,
    base_system: str = "",          # 基礎人設（可快取）
    therapy_mode: str = "",         # 治療模式增強（可快取）
    knowledge_context: str = "",    # 知識參考（可快取）
) -> dict:
    # 構建帶 cache_control 的 system blocks
    system_blocks = []

    if base_system:
        system_blocks.append({
            "type": "text",
            "text": base_system,
            "cache_control": {"type": "ephemeral"}
        })

    if therapy_mode:
        system_blocks.append({
            "type": "text",
            "text": therapy_mode,
        })

    if knowledge_context:
        system_blocks.append({
            "type": "text",
            "text": knowledge_context,
            "cache_control": {"type": "ephemeral"}
        })

    # 對話歷史：在最後一條舊訊息上標記快取斷點
    messages = []
    for i, msg in enumerate(conversation_history):
        m = {
            "role": msg["role"] if msg["role"] != "model" else "assistant",
            "content": msg["content"]
        }
        # 在歷史的最後一條標記快取（這樣整段歷史都會被快取）
        if i == len(conversation_history) - 1:
            m["content"] = [
                {"type": "text", "text": msg["content"],
                 "cache_control": {"type": "ephemeral"}}
            ]
        messages.append(m)

    messages.append({"role": "user", "content": message})

    response = await client.messages.create(
        model=model,
        max_tokens=1000,
        system=system_blocks if system_blocks else system_prompt,
        messages=messages,
    )
    # response.usage 會顯示 cache_read_input_tokens 和 cache_creation_input_tokens
    return {
        "text": response.content[0].text,
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cache_read_tokens": getattr(response.usage, 'cache_read_input_tokens', 0),
            "cache_creation_tokens": getattr(response.usage, 'cache_creation_input_tokens', 0),
        },
    }
```

### 5.3 快取失效與生命週期

```
Anthropic ephemeral cache:
─────────────────────────
TTL = 5 分鐘（自動續期：5 分鐘內有新請求即刷新）

適合 Mind Echo 的場景：
├── 活躍對話（10 分鐘視窗）→ 快取幾乎必定命中 ✅
├── 用戶思考時間 > 5 分鐘  → 快取過期，下次重建 ⚠️
└── 不同用戶的 system prompt → 相同 prefix 可共享快取 ✅

Gemini Context Caching:
──────────────────────
TTL = 可設定（1 小時 ~ 數天）
最低門檻 = 較高（需要達到一定 token 數）
費用 = 存儲費 + 降價的使用費

適合 Mind Echo 的場景：
├── 預快取 system prompt + 治療模式 → 長期有效 ✅
├── 預快取知識文獻池 → 所有請求共用 ✅
└── 對話歷史 → 不適合（每次都在變） ❌
```

---

## 六、總結

| 問題 | 答案 |
|------|------|
| 我們的系統是每次冷啟動嗎？ | **是的。** 每次 API 呼叫都完整重送 system prompt + 歷史，API 供應商從頭計算所有 attention。 |
| 能直接實作論文的 Prompt Cache？ | **不能。** 論文需要修改自建模型的推論引擎，我們用的是外部 API。 |
| 能利用論文的思路嗎？ | **可以，而且已有現成方案。** Anthropic 和 Gemini 都提供了 API 級別的 prompt caching，概念與論文一致。 |
| API 有 server-side session 嗎？ | **都沒有。** 兩家 API 都是無狀態設計，我們自己管理 session 是業界標準做法。 |
| Cache 能 by session 嗎？ | **Anthropic 天然支援。** 基於 prefix 匹配，同 session 的連續請求自動命中快取，不同 user 的歷史天然隔離。**Gemini 門檻太高**（需 ≥32K tokens），目前不適用。 |
| 改造難度？ | **低。** Anthropic 版本只需改 `providers/anthropic.py`，加入 `cache_control` 標記。 |
| 預估效益？ | Token 費用節省 60-70%，TTFT 延遲降低 2-4 倍。 |
