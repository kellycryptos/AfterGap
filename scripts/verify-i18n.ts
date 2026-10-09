import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../apps/web/app/page';
import { resolveInitialLocale, resolveHtmlLang } from '../apps/web/i18n/helpers';
import enMessages from '../apps/web/messages/en.json';
import zhMessages from '../apps/web/messages/zh.json';

function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.keys(obj).flatMap((key) => {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return getAllKeys(val, fullKey);
    }
    return [fullKey];
  });
}

async function verifyI18n() {
  console.log('================================================================');
  console.log('       AFTERGAP BILINGUAL i18n & PRO-MODE ISOLATION TEST        ');
  console.log('================================================================\n');

  // --- TEST 0: Structural Key Parity between en.json and zh.json ---
  console.log('--- TEST 0: Translation Key Parity (en.json vs zh.json) ---');
  const enKeys = new Set(getAllKeys(enMessages));
  const zhKeys = new Set(getAllKeys(zhMessages));

  const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));
  const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));

  console.log(`Total English keys: ${enKeys.size}`);
  console.log(`Total Chinese keys: ${zhKeys.size}`);
  console.log(`Keys missing in Chinese: ${missingInZh.length}`);
  console.log(`Keys missing in English: ${missingInEn.length}`);

  if (missingInZh.length > 0) {
    console.error('❌ FAIL: The following keys exist in en.json but are missing in zh.json:', missingInZh);
    process.exit(1);
  }
  if (missingInEn.length > 0) {
    console.error('❌ FAIL: The following keys exist in zh.json but are missing in en.json:', missingInEn);
    process.exit(1);
  }
  console.log('✅ PASS: 100% key parity between en.json and zh.json.\n');

  // --- TEST 1: Simple Mode English ---
  console.log('--- TEST 1: Simple Mode (English Default) ---');
  (globalThis as any).__AFTERGAP_TEST_MODE__ = 'simple';
  (globalThis as any).__AFTERGAP_TEST_LOCALE__ = 'en';
  const enHtml = renderToString(React.createElement(Home));

  const enHeroOk = enHtml.includes('Buy US Stocks on BNB Chain');
  const enCardOk = enHtml.includes('Buy NVDA') && enHtml.includes('Amount to invest');
  const enSavingsOk = enHtml.includes('Estimated savings:');
  const enDividendOk = enHtml.includes('gets dividends added as extra shares');
  const enAssistantOk = enHtml.includes('AfterGap AI Assistant') && enHtml.includes('(Responses are currently English-only)');
  const enFooterOk = enHtml.includes('Terms of Use') && enHtml.includes('Risk Disclosure');
  const enNoMissingPlaceholders = !enHtml.includes('[MISSING:');

  console.log(`EN Hero Present:             ${enHeroOk}`);
  console.log(`EN Card Present:             ${enCardOk}`);
  console.log(`EN Savings Line:             ${enSavingsOk}`);
  console.log(`EN Dividend Mechanism:       ${enDividendOk}`);
  console.log(`EN Assistant & Notice:       ${enAssistantOk}`);
  console.log(`EN Footer & Legal:           ${enFooterOk}`);
  console.log(`EN No [MISSING:] Flags:      ${enNoMissingPlaceholders}`);

  if (!enHeroOk || !enCardOk || !enSavingsOk || !enDividendOk || !enAssistantOk || !enFooterOk || !enNoMissingPlaceholders) {
    console.error('❌ FAIL: English Simple Mode missing expected strings or has missing key placeholders.');
    process.exit(1);
  }
  console.log('✅ PASS: English Simple Mode renders flawlessly.\n');

  // --- TEST 2: Simple Mode Chinese ---
  console.log('--- TEST 2: Simple Mode (Chinese) ---');
  (globalThis as any).__AFTERGAP_TEST_MODE__ = 'simple';
  (globalThis as any).__AFTERGAP_TEST_LOCALE__ = 'zh';
  const zhHtml = renderToString(React.createElement(Home));

  const zhHeroOk = zhHtml.includes('在 BNB Chain 上交易美股');
  const zhCardOk = zhHtml.includes('买入 NVDA') && zhHtml.includes('投资金额');
  const zhSavingsOk = zhHtml.includes('预计比另一版本节省约');
  const zhDividendOk = zhHtml.includes('的股息将以增发代币形式自动发放。');
  const zhGuardOk = zhHtml.includes('资金保护机制已生效（基准模式）');
  const zhStatusUnavailableOk = zhHtml.includes('状态不可用');
  const zhTranslateNoOk = zhHtml.includes('translate="no"');
  const zhAssistantOk = zhHtml.includes('AfterGap AI 助手') && zhHtml.includes('（AI 回复目前仅支持英文）');
  const zhFooterOk = zhHtml.includes('使用条款') && zhHtml.includes('风险披露');
  const zhNoMissingPlaceholders = !zhHtml.includes('[MISSING:');

  console.log(`ZH Hero Present:             ${zhHeroOk}`);
  console.log(`ZH Card Present:             ${zhCardOk}`);
  console.log(`ZH Savings (Natural Order):  ${zhSavingsOk}`);
  console.log(`ZH Dividend Period (。):     ${zhDividendOk}`);
  console.log(`ZH Status Unavailable Chip:  ${zhStatusUnavailableOk}`);
  console.log(`ZH Tickers translate="no":   ${zhTranslateNoOk}`);
  console.log(`ZH Fund Guard Active:        ${zhGuardOk}`);
  console.log(`ZH Assistant & Notice:       ${zhAssistantOk}`);
  console.log(`ZH Footer & Legal:           ${zhFooterOk}`);
  console.log(`ZH No [MISSING:] Flags:      ${zhNoMissingPlaceholders}`);

  if (!zhHeroOk || !zhCardOk || !zhSavingsOk || !zhDividendOk || !zhStatusUnavailableOk || !zhTranslateNoOk || !zhGuardOk || !zhAssistantOk || !zhFooterOk || !zhNoMissingPlaceholders) {
    console.error('❌ FAIL: Chinese Simple Mode missing expected strings, incorrect punctuation, or missing key placeholders.');
    process.exit(1);
  }
  console.log('✅ PASS: Chinese Simple Mode renders without missing keys and with proper Chinese punctuation.\n');

  // --- TEST 3: Strict Pro Mode Isolation ---
  console.log('--- TEST 3: Pro Mode Isolation (Zero Chinese Leakage) ---');
  (globalThis as any).__AFTERGAP_TEST_MODE__ = 'pro';
  (globalThis as any).__AFTERGAP_TEST_LOCALE__ = 'zh'; // User had previously toggled to ZH
  const proZhHtml = renderToString(React.createElement(Home));

  const proHeroOk = proZhHtml.includes('Same stock. Dual wrappers. Live gap.');
  const proBenchmarkOk = proZhHtml.includes('Benchmark Reference Pricing');
  const proSpotAggregatorOk = proZhHtml.includes('Spot Aggregator');
  const proSimplePillOk = proZhHtml.includes('Simple');
  const proProPillOk = proZhHtml.includes('Pro');
  const proFooterOk = proZhHtml.includes('Terms of Use') && proZhHtml.includes('Risk Disclosure');
  const proNoMissingPlaceholders = !proZhHtml.includes('[MISSING:');

  const zeroChineseLeakage =
    !proZhHtml.includes('在 BNB Chain 上交易美股') &&
    !proZhHtml.includes('买入 NVDA') &&
    !proZhHtml.includes('现货聚合器') &&
    !proZhHtml.includes('简洁') &&
    !proZhHtml.includes('专业') &&
    !proZhHtml.includes('使用条款') &&
    !proZhHtml.includes('风险披露');

  console.log(`Pro Hero Remains English:    ${proHeroOk}`);
  console.log(`Pro Pricing Title English:   ${proBenchmarkOk}`);
  console.log(`Pro Header Chrome English:   ${proSpotAggregatorOk && proSimplePillOk && proProPillOk}`);
  console.log(`Pro Footer Remains English:  ${proFooterOk}`);
  console.log(`Pro No [MISSING:] Flags:     ${proNoMissingPlaceholders}`);
  console.log(`ZERO Chinese Leakage in Pro: ${zeroChineseLeakage}`);

  if (!proHeroOk || !proBenchmarkOk || !proSpotAggregatorOk || !proFooterOk || !proNoMissingPlaceholders || !zeroChineseLeakage) {
    console.error('❌ FAIL: Pro Mode isolation violated; Chinese strings leaked into Pro view.');
    process.exit(1);
  }
  console.log('✅ PASS: Pro Mode is 100% strictly isolated in English with zero leakage.\n');

  // --- TEST 4: Client Lifecycle, Navigator Detection, LocalStorage & Lang Sync ---
  console.log('--- TEST 4: Client Lifecycle, Navigator Detection, LocalStorage & Lang Sync ---');

  // Scenario A: Fresh visitor with zh-CN navigator language and empty localStorage
  const autoDetectZhCN = resolveInitialLocale(null, 'zh-CN');
  const autoDetectZhTW = resolveInitialLocale(null, 'zh-TW');
  const autoDetectZh = resolveInitialLocale(null, 'zh');
  const autoLangZh = resolveHtmlLang('simple', autoDetectZhCN);

  console.log(`Auto-detect 'zh-CN' -> 'zh':   ${autoDetectZhCN === 'zh'}`);
  console.log(`Auto-detect 'zh-TW' -> 'zh':   ${autoDetectZhTW === 'zh'}`);
  console.log(`Auto-detect 'zh' -> 'zh':      ${autoDetectZh === 'zh'}`);
  console.log(`HTML Lang for ZH Simple:       ${autoLangZh === 'zh-CN'}`);

  if (autoDetectZhCN !== 'zh' || autoDetectZhTW !== 'zh' || autoDetectZh !== 'zh' || autoLangZh !== 'zh-CN') {
    console.error('❌ FAIL: Chinese navigator language auto-detection or HTML lang failed.');
    process.exit(1);
  }

  // Scenario B: Fresh visitor with English or other navigator language
  const autoDetectEn = resolveInitialLocale(null, 'en-US');
  const autoDetectJa = resolveInitialLocale(null, 'ja-JP');
  const autoLangEn = resolveHtmlLang('simple', autoDetectEn);

  console.log(`Auto-detect 'en-US' -> 'en':   ${autoDetectEn === 'en'}`);
  console.log(`Auto-detect 'ja-JP' -> 'en':   ${autoDetectJa === 'en'}`);
  console.log(`HTML Lang for EN Simple:       ${autoLangEn === 'en'}`);

  if (autoDetectEn !== 'en' || autoDetectJa !== 'en' || autoLangEn !== 'en') {
    console.error('❌ FAIL: English/other navigator language auto-detection or HTML lang failed.');
    process.exit(1);
  }

  // Scenario C: User overrides in localStorage (header toggle persists and overrides navigator)
  const savedEnOverridesZh = resolveInitialLocale('en', 'zh-CN');
  const savedZhOverridesEn = resolveInitialLocale('zh', 'en-US');

  console.log(`Saved 'en' overrides 'zh-CN':  ${savedEnOverridesZh === 'en'}`);
  console.log(`Saved 'zh' overrides 'en-US':  ${savedZhOverridesEn === 'zh'}`);

  if (savedEnOverridesZh !== 'en' || savedZhOverridesEn !== 'zh') {
    console.error('❌ FAIL: LocalStorage preference did not override navigator.language.');
    process.exit(1);
  }

  // Scenario D: Pro Mode HTML lang isolation (Pro Mode stays English even if locale is zh)
  const proModeHtmlLangWithZh = resolveHtmlLang('pro', 'zh');
  const proModeHtmlLangWithEn = resolveHtmlLang('pro', 'en');
  const simpleModeHtmlLangWithZh = resolveHtmlLang('simple', 'zh');

  console.log(`Pro Mode HTML lang (zh user): ${proModeHtmlLangWithZh === 'en'}`);
  console.log(`Pro Mode HTML lang (en user): ${proModeHtmlLangWithEn === 'en'}`);
  console.log(`Simple Mode Lang reverts zh:  ${simpleModeHtmlLangWithZh === 'zh-CN'}`);

  if (proModeHtmlLangWithZh !== 'en' || proModeHtmlLangWithEn !== 'en' || simpleModeHtmlLangWithZh !== 'zh-CN') {
    console.error('❌ FAIL: Pro Mode HTML lang attribute isolation violated.');
    process.exit(1);
  }

  console.log('✅ PASS: Client-side locale detection, localStorage persistence, and HTML lang sync verified (100%).\n');

  console.log('================================================================');
  console.log('       ALL BILINGUAL & ISOLATION CHECKS PASSED (100%)           ');
  console.log('================================================================');
}

verifyI18n().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
