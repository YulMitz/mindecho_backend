# Android 支援 Migration 評估報告

> **Scope**: Manager 要求 mind echo 同時支援 Android。本報告評估 (1) 平台選擇 (2) pros/cons (3) 時程。
> **Author**: Hermes (planner) — 2026-05-07，2026-05-08 修訂 v2
> **Status**: Draft v2，等 Mulkooo review
> **v2 變更**: 前端離職時間更新為 **2026/07 底**（原誤為 06 底），時程與招募策略對應修訂

---

## 0. 前提條件 (Inputs)

- **現有 iOS app**: SwiftUI，Repo: `Vincent23412/Mindecho_frontend`
- **規模**: 74 Swift files, ~21k LOC, ~30 screens
- **Native 依賴**: HealthKit (1 檔), UserNotifications (1), AVFoundation (Relax 計時器音樂), PhotosUI (1)，**整體輕**
- **後端整合**: 純 REST + JWT (Keychain)，無 WebSocket / SSE
- **人力**: 後端 1 人 + 前端 1 人，**前端 2026/07 底離職**（v2 更新），之後**找新人專職**接 Android
- **Deadline**: **Android 必須 2026/10 底前上線**
- **iOS 後續**: 是否繼續演進 = 開放討論（影響推薦）

⚠️ **關鍵限制**:
- 純 solo 新人開發窗口：**2026/08/01 ～ 2026/10/31 = 約 13 週**
- 若 7 月找到新人並 overlap：**等同有 17 週有效工時**（含 4 週雙人並行的 P0/onboarding）
- 若 8 月才入職（無 overlap）：剩 13 週 solo + 沒有交接 = 高風險

---

## 1. 平台選擇：Kotlin (Native) vs React Native

### 1.1 推薦：**React Native (with Expo)**

**理由（按權重排序）**:

1. **時程仍是最大風險，不是技術風格**
   即便多了 1 個月（7 月離職），從 11 月回推也只剩 4 個月窗口，新人 onboarding、單兵作戰 → 必須選**單一 codebase 雙平台**的方案。
   Kotlin = 完全從零寫一份 Android，**iOS 還是要繼續維護現有 SwiftUI codebase**，等於兩份代碼兩個技能要求。
   RN = 一份 codebase，未來 iOS 出新功能也只寫一次。

2. **iOS app 的 native 依賴極輕，沒有 RN 跨不過去的能力**
   - HealthKit → `react-native-health` (Expo 也有 plugin)
   - UserNotifications → `expo-notifications`
   - AVFoundation 音樂播放 → `expo-av` / `react-native-track-player`
   - PhotosUI → `expo-image-picker`
   - JWT + Keychain → `expo-secure-store`
   - 純 REST → `fetch` / `axios`，零摩擦
   **沒有任何一項需要 RN 寫 native module。** 這是 RN 最容易踩雷的地方，這個專案幸運地完全避開。

3. **新人市場供給**: RN/TypeScript 工程師在台灣的供給量明顯大於 Kotlin + 同時懂 SwiftUI 的工程師。Kotlin 路線若要兼維護 iOS，幾乎只能找 Flutter 或 RN 經驗者跨過去 → 不如直接走 RN。

4. **AI agent 輔助效率**: 你們重度使用 AI agent 開發。TS/RN 的 LLM 訓練語料量遠大於 Kotlin/Compose，coder agent 產出品質 & debug 速度都會比較好。

5. **既有 codebase 可機械式移植**: Mindecho_frontend 的架構是 `pages/components/models/API/hooks` — 這跟 RN 的目錄慣例幾乎 1:1，連檔名都不太需要改。SwiftUI 的 `@StateObject` / `ObservableObject` → React `useState` / Context / Zustand，mapping 很直接。

### 1.2 何時應該選 Kotlin（反向情境）

只有以下任一條件成立才考慮 Kotlin：
- iOS app 之後**會 freeze**，未來 1–2 年只在 Android 加新功能 → 那 Kotlin native 體驗較佳
- Manager 明確要求**最佳的 Android 原生體驗 / Material You 深度整合**，且願意接受時程延後
- 未來會有大量需要 native 整合的功能（背景 service、BLE、深度感測器等）— **但這專案目前看不到**

### 1.3 Kotlin Multiplatform (KMP) / Flutter？

- **KMP**: 可以 share business logic 但 UI 還是要寫兩份（SwiftUI + Compose），對「節省人力」這個核心目標幫助有限，且生態還在成熟中、AI 輔助較弱。**不建議**。
- **Flutter**: 技術上可行，但要把現有 SwiftUI **完全丟掉重寫一份 Dart**，比 RN 走 Expo 重寫成本更高（RN 至少語法 paradigm 跟 SwiftUI 的 declarative 一致），且 Flutter 工程師供給也比 RN 少。**不建議**。

---

## 2. 切換開發平台的 Pros / Cons

### 2.1 走 React Native (推薦) 的 Pros / Cons

**Pros**
- ✅ **一份 codebase 同時養 iOS + Android**，長期維護成本砍半
- ✅ 既有 SwiftUI 架構 1:1 對應 RN 目錄結構，移植阻力低
- ✅ 用 Expo managed workflow → 不需要碰 Xcode build / Gradle 細節，新人上手快
- ✅ OTA update（EAS Update）→ 不用每次小 bug 都送審
- ✅ 後端 REST + JWT 完全無痛接
- ✅ AI agent 對 TS/RN 支援最強
- ✅ 招人池最大

**Cons**
- ❌ **現有 iOS SwiftUI 等於要砍掉重寫一份 RN**（可漸進，見 §3 策略 B）
- ❌ HealthKit 透過第三方套件，未來若 Apple API 大改可能要等 lib 更新
- ❌ 動畫 / 觸感 / 滾動細節仍可能輸 native（mind echo 不是高互動 app，影響小）
- ❌ App size 比 native 大（RN runtime ~10MB）
- ❌ 兩位老闆（Apple + Google）的審核都要顧
- ❌ 上架時前端工程師已離職，新人要同時學 RN + 雙平台 release 流程

### 2.2 走 Kotlin (Native Android Only) 的 Pros / Cons

**Pros**
- ✅ 不動現有 iOS codebase，零風險
- ✅ Android native 體驗、效能、未來性最好
- ✅ Compose 跟 SwiftUI 概念非常像，UI 移植直觀

**Cons**
- ❌ **未來每個新功能都要寫兩次**（Swift + Kotlin），長期人力成本最高
- ❌ 招人困難：要嘛找 Kotlin 工程師（iOS 沒人維護），要嘛找雙修（很貴/很少）
- ❌ AI agent 輔助效率較低
- ❌ 兩個 codebase 容易功能不一致 / 出 bug 不對稱

---

## 3. 預估時程

### 3.1 工作分解（以 React Native + Expo 為基準）

- **P0 Setup (2 週)**: Expo 專案初始化、CI（EAS Build）、設計系統 token 從 SwiftUI styles/ 轉 RN theme、API client + JWT 流程
- **P1 Auth + 框架 (2 週)**: Welcome / Login / Register、Tab navigation、AuthService 移植
- **P2 Home + Tests (4 週)**: HomeView、DailyCheckIn、Biorhythm、四個量表（PHQ9/GAD7/BSRS5/RFQ8）含結果頁
- **P3 Chat (2 週)**: chatlistpage / chatdetailpage、ChatAPI、訊息 UI
- **P4 Diary + Relax (2 週)**: MoodDiary、ScaleTracking、Relax 計時器（含音訊）
- **P5 Info + HealthKit/Health Connect (2 週)**: Profile、設定卡片、**Android Health Connect** 對接（取代 HealthKit）、Notifications
- **P6 QA + 雙平台 polish (3 週)**: iOS RN build 驗證對齊、Android device 測試、Play Store 上架審核
- **Buffer (2 週)**: Onboarding + 不可預期 issue + Apple/Google 審核回合
- **合計**: **~19 週 ≈ 4.4 個月**

### 3.2 對齊 Deadline 的 Reality Check（v2 修訂）

- 招募順利 + overlap 場景：**7 月雙人並行（P0 + 部分 P1）+ 8/1～10/31 新人 solo 13 週**
  → 等同 **~17 有效工時週** + 知識交接已完成 → **與 19 週估計仍差 ~2 週**，但 buffer 與招募彈性都顯著改善
- 招募延遲（8 月才入職、無 overlap）：**只剩 13 週 solo，無交接** → **不可行，必砍範圍**

🟡 **結論：時程仍緊但比 v1 大幅改善**：

**選項 A — Android-only 先上（仍建議當主路線）**
- 新人只做 Android 版（RN 但只 build Android target），iOS 暫時不動
- 砍掉 P6 的 iOS RN 對齊（省 1.5 週）
- v1 trim 可比 v1 報告寬鬆：**Relax 音訊可保留**，僅延後「iOS 端 RN 對齊」即可
- → **~17.5 週 Android v1 上線**，10 月底達標，buffer 約 0.5–1 週
- iOS 移植到 RN 列為 **2026 Q4 末 / 2027 Q1 second phase**，由新人接手

**選項 B — 雙平台同步（high risk，但比 v1 可行）**
- 嚴格按 19 週估計執行，需要 7 月 overlap 完成 P0 + 啟動 P1
- 10 月底達標機率提升至約 50–60%（v1 約 30–40%），仍可能延 1–2 週
- **若 manager 接受 11 月初少量延遲**，這個選項變得合理

**選項 C — 提早招人 + 4 週 overlap（最穩，**v2 強烈建議當 baseline**）**
- **6 月底前**完成新人招募（v1 是 6 月底，v2 多 1 個月緩衝 → 招募可達性大幅提升）
- 7 月與離職前端 overlap 4 週：完成 knowledge transfer + Expo setup + P0
- 8/1 開工時新人已熟專案，直接進 P1
- **這已是當前條件下最自然的 baseline，不再是「最理想場景」**

### 3.3 後端工程師的負擔

Android 上線預期會多出的後端工作（**需排進後端 sprint，不是 0 成本**）：
- Android FCM 推播 token 註冊 endpoint（如果還沒有）
- Health Connect 資料格式可能跟 HealthKit 不完全一致 → schema 校正
- Play Console / 隱私政策 / 資料安全表單填寫
- 預估 **2–3 週後端工時**散落在 Q3

---

## 4. 開放問題 (待 Mulkooo 決策)

1. **iOS 是否會 freeze？** 會 freeze 1 年 → Kotlin 反而合理；會繼續演進 → RN 鎖定
2. **新人招募目標日**：v2 建議 **6 月底完成 offer、7 月入職與離職前端 overlap 4 週**。若拖到 8 月才入職，必須走選項 A 並再砍範圍
3. **Android v1 功能完整度**：v2 條件下 v1 trim 壓力降低，是否要**保留全部功能**（Relax 音樂 + 全部量表）換取多 1 週緩衝？
4. **Manager 對「iOS 也改寫成 RN」的政治接受度**：仍是 RN 路線的最大組織風險

---

## 5. 最終建議 (TL;DR, v2)

> **走 React Native + Expo，6 月底完成新人招募，7 月與離職前端 overlap 4 週做 P0 + 交接，8/1 新人 solo 開工只先 build Android v1，10 月底上 Play Store。iOS 移植到 RN 列為 2027 Q1 phase 2。**

理由濃縮成一句：**「人力是瓶頸，不是技術。」** v2 多出來的 1 個月，把「最理想場景」變成「合理 baseline」，風險顯著下降，但仍不能掉以輕心 — 招募若延遲到 8 月就會回到 v1 的緊張狀態。
