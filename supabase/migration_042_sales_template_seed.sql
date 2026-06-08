-- Migration 042: Seed sales_templates for all 56 industry×issue combinations (ja + en regions)
-- Replaces JS hardcoded fallback with proper DB templates
-- Generated from industry-profiles.ts + issue-profiles.ts data

DO $$
DECLARE
  v_industry text;
  v_issue text;
  v_industry_label_ja text;
  v_issue_label_ja text;
  v_severity text;
  v_headline_ja text;
  v_headline_en text;
  v_pain_ja text;
  v_pain_en text;
  v_fear_ja text;
  v_fear_en text;
  v_hope_ja text;
  v_hope_en text;
  v_cta_ja text;
  v_cta_en text;
  v_loss_ja text;
  v_loss_en text;
BEGIN
  FOR v_industry IN
    SELECT unnest(ARRAY[
      'beauty_salon','dental','restaurant','construction',
      'accounting','retail','cleaning','consulting'
    ])
  LOOP
    FOR v_issue IN
      SELECT unnest(ARRAY[
        'speed_critical','ssl_expired','wp_outdated',
        'no_ogp','no_sns','copyright_old','ua_残存'
      ])
    LOOP
      -- Resolve labels
      SELECT
        CASE v_industry
          WHEN 'beauty_salon' THEN '美容室'
          WHEN 'dental' THEN '歯科医院'
          WHEN 'restaurant' THEN '飲食店'
          WHEN 'construction' THEN '建設業'
          WHEN 'accounting' THEN '会計事務所'
          WHEN 'retail' THEN '小売店'
          WHEN 'cleaning' THEN '清掃業'
          WHEN 'consulting' THEN 'コンサルティング'
        END INTO v_industry_label_ja;

      SELECT
        CASE v_issue
          WHEN 'speed_critical' THEN 'スマホ表示速度'
          WHEN 'ssl_expired' THEN 'SSL証明書'
          WHEN 'wp_outdated' THEN 'CMS運用基盤'
          WHEN 'no_ogp' THEN 'SNS共有表示'
          WHEN 'no_sns' THEN 'SNS外部接点'
          WHEN 'copyright_old' THEN '更新鮮度'
          WHEN 'ua_残存' THEN 'GA4移行'
        END INTO v_issue_label_ja;

      SELECT
        CASE v_issue
          WHEN 'speed_critical' THEN 'critical'
          WHEN 'ssl_expired' THEN 'warning'
          WHEN 'wp_outdated' THEN 'warning'
          WHEN 'no_ogp' THEN 'warning'
          WHEN 'no_sns' THEN 'warning'
          WHEN 'copyright_old' THEN 'info'
          WHEN 'ua_残存' THEN 'warning'
        END INTO v_severity;

      -- Generate JA templates
      v_headline_ja := v_issue_label_ja || 'の改善が' || v_industry_label_ja || 'の集客を変える';

      v_pain_ja := CASE v_issue
        WHEN 'speed_critical' THEN
          '御社のWebサイト表示速度は業界標準を大きく下回っています。スマートフォンからのアクセスで表示に時間がかかると、53%以上のユーザーがページを離脱します。これは' || v_industry_label_ja || 'のビジネスにおいて、直接的な機会損失を意味します。' ||
          '特に初回来訪者の約7割が表示速度でサイトの信頼性を判断するため、遅延は「専門性が低い」という誤った印象を与えかねません。' ||
          '1秒の改善で問い合わせ率が最大20%向上するというデータもあり、優先度の高い改善項目です。'
        WHEN 'ssl_expired' THEN
          '御社サイトのSSL証明書に問題が検出されました。最新ブラウザでは「保護されていない通信」と赤字警告が表示され、訪問者の84%が即座に離脱します。' ||
          v_industry_label_ja || 'において、特に個人情報を扱うフォームや予約ページでSSLが未対応であることは、信用を完全に失う致命的な問題です。' ||
          '競合サイトのほぼ全てがSSL対応済みである中、未対応のまま放置すると検索順位にも悪影響が出ます。'
        WHEN 'wp_outdated' THEN
          '御社のCMS（コンテンツ管理システム）が最新バージョンから2世代以上遅れています。これにより既知の脆弱性が放置され、サイト改ざんや情報漏洩のリスクが高まっています。' ||
          'また、古いバージョンのプラグインが表示速度を低下させ、管理画面の操作も遅くなるため、サイト更新が滞る悪循環に陥ります。' ||
          v_industry_label_ja || 'の信頼が何より大切な業種だからこそ、基盤の安全性は最優先で確保すべきです。'
        WHEN 'no_ogp' THEN
          '御社サイトにはOGP（Open Graph Protocol）設定が不足しています。これにより、SNSでURLを共有した際にサムネイル画像やタイトルが正しく表示されず、クリック率が40%以上低下します。' ||
          v_industry_label_ja || 'ではSNS経由の集客が重要なチャネルであり、この設定不足は毎日の積み重ねで大きな機会損失となります。' ||
          '特にInstagramやLINEでの共有時に、プロフェッショナルな第一印象を形成できないことは、ブランド価値を損ねます。'
        WHEN 'no_sns' THEN
          '御社サイトから公式SNSアカウントへの導線が不足しています。現代の消費者はサイトだけでなく、SNSでの活動実績や口コミをクロスチェックしてから問い合わせを決定します。' ||
          v_industry_label_ja || 'において、SNS不在は「現在も活動しているのか」という不信感を生み、問い合わせ前の離脱を招きます。' ||
          '適切なSNS導線の設置は、信頼形成と集客の両面で即効性のある改善です。'
        WHEN 'copyright_old' THEN
          '御社サイトのコピーライト（著作権表示）が過去の年号のまま更新されていません。これは一見小さな点ですが、訪問者に「情報更新が止まっている」「事業が継続しているか不安」という印象を与えます。' ||
          v_industry_label_ja || 'の新規顧客は無意識のうちに鮮度をチェックしており、古いコピーライトは「信頼できる事業者か」という判断に悪影響を及ぼします。' ||
          'また、Googleも更新頻度の低いサイトをSEO上低く評価するため、検索順位にも波及します。'
        WHEN 'ua_残存' THEN
          '御社サイトではGoogleユニバーサルアナリティクス（UA）からGA4への移行が未完了です。UAは2023年7月に完全停止しており、現在のアクセス解析が機能していません。' ||
          v_industry_label_ja || 'のマーケティング投資判断には正確なデータが不可欠です。どのページが何件見られ、どの導線から問い合わせがあるか把握できなければ、改善の優先順位が付けられません。' ||
          '競合がGA4のデータに基づいて毎月PDCAを回す中、データなしでの手探り経営は致命的な差となります。'
      END;

      v_fear_ja := CASE v_issue
        WHEN 'speed_critical' THEN
          'このまま対策を取らない場合、3ヶ月後には検索順位が3〜5位低下し、月間アクセスが15〜20%減少します。6ヶ月後には競合がSEOで大きく先行し、新規流入が半減。' ||
          '12ヶ月後にはWeb経由の売上が50%以上減少し、モバイル検索からの集客が壊滅的になる可能性があります。'
        WHEN 'ssl_expired' THEN
          '3ヶ月後にはブラウザ警告による直帰率が80%を超え、検索順位も5〜10位低下します。6ヶ月後には問い合わせ数が激減し、SSL未対応が常態化。' ||
          '12ヶ月後にはWeb経由の新規顧客獲得が実質不可能になります。'
        WHEN 'wp_outdated' THEN
          '3ヶ月後には未パッチの脆弱性が攻撃者に発見される確率が上昇。6ヶ月後には改ざん被害の確率が40%超に。' ||
          '12ヶ月後にはサイト乗っ取りや顧客情報流出のリスクが極めて高い状態になり、復旧不能になる可能性があります。'
        WHEN 'no_ogp' THEN
          '3ヶ月後にはSNS経由のアクセスが30%減少。6ヶ月後にはSNS集客チャネルが実質機能停止。' ||
          '12ヶ月後にはSNSマーケティング全体のROIが激減し、ブランド露出の機会を恒常的に失います。'
        WHEN 'no_sns' THEN
          '3ヶ月後には信頼形成の補完情報がないため競合にSNS経由で顧客を奪われます。6ヶ月後には直帰率が上昇。' ||
          '12ヶ月後にはオンラインプレゼンスが競合に完全に劣後し、新規顧客の信頼獲得が極めて困難になります。'
        WHEN 'copyright_old' THEN
          '3ヶ月後には新規顧客の約30%がサイト鮮度の低さで離脱。6ヶ月後にはGoogleがサイトを低評価しSEO順位が更に低下。' ||
          '12ヶ月後にはサイト全体が「廃業済み」と誤解され、新規顧客獲得が不可能になります。'
        WHEN 'ua_残存' THEN
          '3ヶ月後にはアクセス解析データの空白期間が拡大し、前年比較が不可能に。6ヶ月後には半年分のデータが完全消失し、マーケティング投資判断の根拠がなくなります。' ||
          '12ヶ月後には競合が1年分のGA4データで改善サイクルを先行させ、差が埋められなくなります。'
      END;

      v_hope_ja := 'ParadigmのWeb総合診断では、' || v_issue_label_ja || 'の改善を含む包括的な診断と改善ロードマップを提供します。' ||
        'まずは現状の詳細分析から着手し、優先度の高い項目から小さく改善を始めることで、早期の成果を実感いただけます。';

      v_cta_ja := 'まずは無料のWeb診断レポートで現状を可視化し、優先して着手すべき改善項目を明確にしませんか。' ||
        'Paradigmでは' || v_industry_label_ja || 'のWeb集客改善を月額¥15万円〜支援しています。';

      v_loss_ja := CASE v_issue
        WHEN 'speed_critical' THEN '表示速度1秒遅延あたりCVR約7%低下 × 月間Web経由機会損失'
        WHEN 'ssl_expired' THEN 'SSL未対応による信用毀損 × 問い合わせ率84%低下'
        WHEN 'wp_outdated' THEN '改ざん復旧費用¥50-100万円 + SEOペナルティ長期化'
        WHEN 'no_ogp' THEN 'SNSクリック率40%低下 × 月間SNS流入数'
        WHEN 'no_sns' THEN 'SNSクロスチェック不可 × 信頼形成不完全による離脱'
        WHEN 'copyright_old' THEN 'サイト鮮度低下 × 新規顧客30%離脱 × SEO低評価'
        WHEN 'ua_残存' THEN 'データ空白によるマーケティング判断不能 × 投資対効果未測定'
      END;

      -- JA region insert
      INSERT INTO sales_templates (
        region, template_variant, target_country, report_locale,
        industry, issue_code, severity, is_active,
        headline, pain, fear, hope, cta_text, loss_calculation
      ) VALUES (
        'jp', 'website_diagnostic', 'JP', 'ja',
        v_industry, v_issue, v_severity, true,
        v_headline_ja, v_pain_ja, v_fear_ja, v_hope_ja, v_cta_ja, v_loss_ja
      ) ON CONFLICT (region, template_variant, target_country, report_locale, industry, issue_code)
      DO UPDATE SET
        severity = EXCLUDED.severity,
        headline = EXCLUDED.headline,
        pain = EXCLUDED.pain,
        fear = EXCLUDED.fear,
        hope = EXCLUDED.hope,
        cta_text = EXCLUDED.cta_text,
        loss_calculation = EXCLUDED.loss_calculation,
        is_active = true,
        updated_at = now();

      -- EN region insert (English versions)
      v_headline_en := CASE v_issue
        WHEN 'speed_critical' THEN 'Mobile Speed Optimization for ' || CASE v_industry WHEN 'beauty_salon' THEN 'Salon' WHEN 'dental' THEN 'Dental' WHEN 'restaurant' THEN 'Restaurant' WHEN 'construction' THEN 'Construction' WHEN 'accounting' THEN 'Accounting' WHEN 'retail' THEN 'Retail' WHEN 'cleaning' THEN 'Cleaning' WHEN 'consulting' THEN 'Consulting' END || ' Growth'
        WHEN 'ssl_expired' THEN 'SSL Security Compliance for ' || CASE v_industry WHEN 'beauty_salon' THEN 'Salon' WHEN 'dental' THEN 'Dental' WHEN 'restaurant' THEN 'Restaurant' WHEN 'construction' THEN 'Construction' WHEN 'accounting' THEN 'Accounting' WHEN 'retail' THEN 'Retail' WHEN 'cleaning' THEN 'Cleaning' WHEN 'consulting' THEN 'Consulting' END || ' Trust'
        WHEN 'wp_outdated' THEN 'CMS Platform Modernization'
        WHEN 'no_ogp' THEN 'Social Media Preview Optimization'
        WHEN 'no_sns' THEN 'Social Channel Integration'
        WHEN 'copyright_old' THEN 'Content Freshness & Trust Signals'
        WHEN 'ua_残存' THEN 'Google Analytics 4 Migration'
      END;

      v_pain_en := 'Your website has an identified issue with ' || v_issue || ' that is directly impacting your business performance. ' ||
        'Industry benchmarks show that addressing this issue leads to measurable improvements in conversion rates and customer trust. ' ||
        'The current state puts you at a competitive disadvantage, as prospects increasingly expect seamless digital experiences before making contact.';

      v_fear_en := 'Without intervention, this issue will compound over time: 3 months of lost opportunities, 6 months of competitive disadvantage, ' ||
        'and within 12 months a significant gap that becomes increasingly difficult to close against competitors who are actively optimizing their web presence.';

      v_hope_en := 'Paradigm provides a comprehensive diagnostic and improvement roadmap that addresses this issue alongside your overall web presence. ' ||
        'Starting with a detailed analysis, we prioritize quick wins that deliver early results while building toward sustained improvement.';

      v_cta_en := 'Start with a free web diagnostic report to visualize your current state and identify the highest-impact improvements. ' ||
        'Paradigm offers ongoing web optimization support starting from ¥150,000/month.';

      v_loss_en := CASE v_issue
        WHEN 'speed_critical' THEN '~7% CVR drop per 1s delay × monthly web-driven opportunity'
        WHEN 'ssl_expired' THEN '84% visitor drop due to browser security warnings'
        WHEN 'wp_outdated' THEN '¥500K-1M recovery cost + prolonged SEO penalty'
        WHEN 'no_ogp' THEN '40% social CTR reduction × monthly social traffic'
        WHEN 'no_sns' THEN 'Trust formation failure due to missing social proof'
        WHEN 'copyright_old' THEN '30% new prospect exit × SEO freshness penalty'
        WHEN 'ua_残存' THEN 'Data blind spot × unmeasured marketing ROI'
      END;

      -- EN region insert
      INSERT INTO sales_templates (
        region, template_variant, target_country, report_locale,
        industry, issue_code, severity, is_active,
        headline, pain, fear, hope, cta_text, loss_calculation
      ) VALUES (
        'global', 'website_diagnostic', 'US', 'en',
        v_industry, v_issue, v_severity, true,
        v_headline_en, v_pain_en, v_fear_en, v_hope_en, v_cta_en, v_loss_en
      ) ON CONFLICT (region, template_variant, target_country, report_locale, industry, issue_code)
      DO UPDATE SET
        severity = EXCLUDED.severity,
        headline = EXCLUDED.headline,
        pain = EXCLUDED.pain,
        fear = EXCLUDED.fear,
        hope = EXCLUDED.hope,
        cta_text = EXCLUDED.cta_text,
        loss_calculation = EXCLUDED.loss_calculation,
        is_active = true,
        updated_at = now();

    END LOOP;
  END LOOP;
END $$;
