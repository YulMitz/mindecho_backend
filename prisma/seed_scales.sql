-- Seed data for scales and scale_questions

-- Scales
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_cesd', 'CESD20', 'CES-D 憂鬱量表', '20 題，4/8/12/16 為反向題', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_bsrs5', 'BSRS5', 'BSRS-5 簡式健康量表', '5 題心情溫度計', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_sats', 'SATS8', 'SATS 消沉心態量表', '8 題消沉心態量表', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_aq10', 'AQ10', 'AQ-10 自閉特質量表', '10 題自閉特質篩檢', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_pcs12', 'PCS12', 'PCS 心理資本量表', '12 題心理資本量表', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_cdrisc25', 'CDRISC25', 'CD-RISC 復原力量表', '25 題復原力', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_bss', 'BSS21', 'BSS 貝克自殺意念量表', '21 題（第 1–19 題計分）', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_pansi', 'PANSI14', 'PANSI 自殺意念量表', '14 題正向/負向自殺意念', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.scales (id, code, name, description, is_active, created_at, updated_at) VALUES ('scale_rfq8', 'RFQ8', 'RFQ-8 心智化量表', '8 題心智化量表', true, '2025-12-24 09:00:39.945', '2025-12-24 09:00:39.945') ON CONFLICT (code) DO NOTHING;

-- CES-D (20)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_1', 'scale_cesd', 1, '原來不介意的事最近竟然會困擾我', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_2', 'scale_cesd', 2, '我的胃口不好，不想吃東西', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_3', 'scale_cesd', 3, '即使有親人的幫忙，我還是無法拋開煩惱', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_4', 'scale_cesd', 4, '我覺得我和別人一樣好', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_5', 'scale_cesd', 5, '我做事時無法集中精神', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_6', 'scale_cesd', 6, '我覺得悶悶不樂', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_7', 'scale_cesd', 7, '我做任何事都覺得費力', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_8', 'scale_cesd', 8, '我對未來充滿希望', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_9', 'scale_cesd', 9, '我認為我的人生是失敗的', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_10', 'scale_cesd', 10, '我覺得恐懼', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_11', 'scale_cesd', 11, '我睡得不安寧', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_12', 'scale_cesd', 12, '我是快樂的', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_13', 'scale_cesd', 13, '我比平日不愛說話', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_14', 'scale_cesd', 14, '我覺得寂寞', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_15', 'scale_cesd', 15, '人們是不友善的', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_16', 'scale_cesd', 16, '我享受生活的樂趣', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_17', 'scale_cesd', 17, '我曾經痛哭', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_18', 'scale_cesd', 18, '我覺得悲傷', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_19', 'scale_cesd', 19, '我覺得別人不喜歡我', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cesd_20', 'scale_cesd', 20, '我缺乏幹勁', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- BSRS-5 (5)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bsrs_1', 'scale_bsrs5', 1, '感覺緊張不安', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bsrs_2', 'scale_bsrs5', 2, '覺得容易苦惱或動怒', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bsrs_3', 'scale_bsrs5', 3, '感覺憂鬱、心情低落', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bsrs_4', 'scale_bsrs5', 4, '覺得比不上別人', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bsrs_5', 'scale_bsrs5', 5, '睡眠困難', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- SATS (8)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_1', 'scale_sats', 1, '我心裡有空洞的感覺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_2', 'scale_sats', 2, '我無法決定我的未來', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_3', 'scale_sats', 3, '面對生活，我有無力感', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_4', 'scale_sats', 4, '我的生活像掉入漩渦', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_5', 'scale_sats', 5, '我會沉溺某些事情而打亂作息', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_6', 'scale_sats', 6, '最近生活作息混亂', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_7', 'scale_sats', 7, '我常對人感到失望', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('sats_8', 'scale_sats', 8, '和別人親近會不自在', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- AQ-10 (10)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_1', 'scale_aq10', 1, '我時常注意到別人忽略的小聲音', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_2', 'scale_aq10', 2, '閱讀故事時難理解人物動機', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_3', 'scale_aq10', 3, '我能理解別人話語背後含義', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_4', 'scale_aq10', 4, '我注意整體多於細節', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_5', 'scale_aq10', 5, '我能察覺別人是否覺得無聊', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_6', 'scale_aq10', 6, '我覺得同時做多件事很容易', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_7', 'scale_aq10', 7, '我能從表情理解他人情緒', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_8', 'scale_aq10', 8, '被打斷後可以快速回到工作', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_9', 'scale_aq10', 9, '我覺得理解別人情緒很困難', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('aq_10', 'scale_aq10', 10, '我傾向注意細節而不是整體', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- PCS (12)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_1', 'scale_pcs12', 1, '我有信心分析長遠問題並找到解決方法', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_2', 'scale_pcs12', 2, '與主管開會時能表達工作事務', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_3', 'scale_pcs12', 3, '我能設定有幫助的工作目標', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_4', 'scale_pcs12', 4, '我認為自己在工作上相當成功', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_5', 'scale_pcs12', 5, '我能想出許多方法達成目標', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_6', 'scale_pcs12', 6, '我正逐步達成自己的目標', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_7', 'scale_pcs12', 7, '我會嘗試各種方法處理難題', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_8', 'scale_pcs12', 8, '我能獨立完成工作', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_9', 'scale_pcs12', 9, '我能同時處理很多事情', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_10', 'scale_pcs12', 10, '面對不確定性我往好處想', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_11', 'scale_pcs12', 11, '工作時看到事情光明面', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pcs_12', 'scale_pcs12', 12, '對未來工作保持樂觀', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- CD-RISC (25)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_1', 'scale_cdrisc25', 1, '當改變發生時，我能適應。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_2', 'scale_cdrisc25', 2, '面臨壓力時，我至少有一個親近且安全的人際關係可以幫助我。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_3', 'scale_cdrisc25', 3, '當我的問題沒有清楚的答案時，命運或神有時會幫助我。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_4', 'scale_cdrisc25', 4, '不管發生什麼事情，我都能處理。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_5', 'scale_cdrisc25', 5, '過去的成功讓我有信心去處理新的挑戰和困難。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_6', 'scale_cdrisc25', 6, '當我面對問題時，我試著去看事情幽默的一面。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_7', 'scale_cdrisc25', 7, '克服壓力而使我更堅強。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_8', 'scale_cdrisc25', 8, '生病、受傷或苦難之後，我很容易就能恢復過來。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_9', 'scale_cdrisc25', 9, '不管好事或壞事，我相信事出必有因。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_10', 'scale_cdrisc25', 10, '不管結果如何，我都會盡最大的努力。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_11', 'scale_cdrisc25', 11, '即使有阻礙，我相信我能達成我的目標。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_12', 'scale_cdrisc25', 12, '即使看起來沒有希望了，我仍然不放棄。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_13', 'scale_cdrisc25', 13, '壓力或危機來時，我知道去哪裡尋求幫助。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_14', 'scale_cdrisc25', 14, '在壓力之下，我可以專注並且能清楚地思考。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_15', 'scale_cdrisc25', 15, '我寧願自己主導去解決問題，而不是全由別人做決定。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_16', 'scale_cdrisc25', 16, '我不會因失敗而很容易氣餒。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_17', 'scale_cdrisc25', 17, '處理生命中的挑戰和困難時，我認為我是一個堅強的人。我不會因失敗而很容易氣餒。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_18', 'scale_cdrisc25', 18, '如果有必要，我可以做一個不受歡迎或困難的決定而去影響別人。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_19', 'scale_cdrisc25', 19, '我能處理一些不愉快或痛苦的感覺，例如：悲傷、害怕和生氣。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_20', 'scale_cdrisc25', 20, '處理生活問題時，有時候必須憑直覺，而不知道為什麼要這樣做。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_21', 'scale_cdrisc25', 21, '我非常清楚我生命的意義。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_22', 'scale_cdrisc25', 22, '我覺得我可以掌握我的人生。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_23', 'scale_cdrisc25', 23, '我喜歡挑戰。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_24', 'scale_cdrisc25', 24, '不管人生的路途中遇到什麼阻礙，我會努力達成我的目標。', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('cdr_25', 'scale_cdrisc25', 25, '我為我的成就而得意。', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- BSS (19)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_1', 'scale_bss', 1, '求生意願：我頗有強烈的求生意願 / 我有薄弱的求生意願 / 我沒有求生意願', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_2', 'scale_bss', 2, '求死意願：我沒有求死意願 / 我有薄弱的求死意願 / 我頗有強烈的求死意願', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_3', 'scale_bss', 3, '求生與求死理由：我求生的理由勝過求死 / 我求生與求死的理由大致相等 / 我求死的理由強過求生', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_4', 'scale_bss', 4, '自殺慾望：我沒有自殺的慾望 / 我有點想要自殺 / 我頗有強烈的自殺慾望', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_5', 'scale_bss', 5, '面臨生命威脅時的態度：我會試圖求生 / 我會讓生死聽天由命 / 我不會採取避免死亡的必要步驟', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_6', 'scale_bss', 6, '自殺念頭持續時間：短暫很快過去 / 相當持續時間 / 長時間想自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_7', 'scale_bss', 7, '自殺念頭頻率：很少或偶爾 / 時常 / 持續', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_8', 'scale_bss', 8, '對自殺觀念態度：不接受 / 不接受也不拒絕 / 接受', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_9', 'scale_bss', 9, '自殺控制能力：我不會自殺 / 我不確定自己不會自殺 / 我無法不自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_10', 'scale_bss', 10, '自殺顧慮：因家人朋友宗教等而不會自殺 / 會有所顧慮 / 仍不在乎自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_11', 'scale_bss', 11, '自殺動機：主要為影響他人 / 影響他人與解決問題兼具 / 主要為逃避問題', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_12', 'scale_bss', 12, '自殺計畫：沒有特定計畫 / 想過方法但無細節 / 有明確計畫', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_13', 'scale_bss', 13, '自殺方法取得：沒有接觸 / 方法存在但難取得 / 能取得自殺方法', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_14', 'scale_bss', 14, '自殺能力：沒有勇氣或能力 / 不確定是否有能力 / 有能力與勇氣', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_15', 'scale_bss', 15, '自殺嘗試意圖：不想嘗試 / 不確定是否會嘗試 / 確定會嘗試', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_16', 'scale_bss', 16, '自殺準備：沒有準備 / 做了一些準備 / 即將完成準備', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_17', 'scale_bss', 17, '遺書：沒有寫 / 想過或開始寫 / 已完成遺書', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_18', 'scale_bss', 18, '自殺事後安排：沒有安排 / 想過安排 / 已做安排', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_19', 'scale_bss', 19, '隱瞞自殺意圖：沒有隱瞞 / 對他人隱瞞 / 試圖掩飾或撒謊', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_20', 'scale_bss', 20, '過去自殺企圖：從未企圖 / 企圖過一次 / 企圖過兩次或以上', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('bss_21', 'scale_bss', 21, '上次企圖自殺時求死意願：想死意願低 / 想死意願中等 / 想死意願高', false) ON CONFLICT (scale_id, "order") DO NOTHING;

-- PANSI (14)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_1', 'scale_pansi', 1, '因他人期望而想到自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_2', 'scale_pansi', 2, '覺得生活可掌控', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_3', 'scale_pansi', 3, '對未來無望而想到自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_4', 'scale_pansi', 4, '因關係不好希望死', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_5', 'scale_pansi', 5, '因無法完成事情想到自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_6', 'scale_pansi', 6, '因事情順利而有希望', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_7', 'scale_pansi', 7, '無法解決問題而想到自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_8', 'scale_pansi', 8, '因工作或學校表現好而高興', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_9', 'scale_pansi', 9, '覺得自己是失敗者', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_10', 'scale_pansi', 10, '覺得自殺是唯一選擇', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_11', 'scale_pansi', 11, '因孤單或難過想到自殺', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_12', 'scale_pansi', 12, '對自己處理問題能力有信心', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_13', 'scale_pansi', 13, '覺得活著有意義', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('pansi_14', 'scale_pansi', 14, '對未來計畫有信心', true) ON CONFLICT (scale_id, "order") DO NOTHING;

-- RFQ-8 (8)
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_1', 'scale_rfq8', 1, '我不總是知道自己做事原因', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_2', 'scale_rfq8', 2, '生氣時會說出後悔的話', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_3', 'scale_rfq8', 3, '缺乏安全感會做出令人厭煩的行為', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_4', 'scale_rfq8', 4, '有時不知道自己行為原因', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_5', 'scale_rfq8', 5, '他人的想法對我很神秘', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_6', 'scale_rfq8', 6, '生氣時說出欠思考的話', false) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_7', 'scale_rfq8', 7, '我總是知道自己感受', true) ON CONFLICT (scale_id, "order") DO NOTHING;
INSERT INTO public.scale_questions (id, scale_id, "order", text, is_reverse) VALUES ('rfq_8', 'scale_rfq8', 8, '強烈情緒會影響思考', false) ON CONFLICT (scale_id, "order") DO NOTHING;
