const DATA_FILES = ['./data/book.json', './data/questions.json', './data/glossary.json', './data/english-1-1.json'];
const STORAGE_KEY = 'heat-study-ja:v1';
const root = document.querySelector('#app');
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)');
const emptyState = () => ({
  schemaVersion: 1,
  settings: { theme: 'system', contentLanguage: 'ja', fontScale: 1, lineHeight: 1.8, width: 'reading' },
  lastSection: '1.1', readerPositions: {}, readSections: {}, bookmarks: [], questionBookmarks: [],
  attempts: [], mistakeNotes: {}, questionReports: {}, notes: [], reviews: {}, completedReviews: {},
  sessions: [], plan: { active: false, goal: '', targetDate: '', minutesPerDay: 15 },
  simComparisons: {}
});
let state = loadState();
let book;
let questionBank;
let glossary;
let englishSection;
let ui = {
  route: location.hash.slice(1) || 'home',
  readerSection: state.lastSection,
  search: { query: '', kind: 'all', chapter: 'all' },
  quiz: null,
  quizResult: null,
  reportId: null,
  reportMessage: '',
  searchResults: null,
  calendarDate: todayISO(),
  importDraft: null,
  simMode: 'conduction',
  simValues: {
    conduction: { k: 15, area: 0.5, thickness: 0.08, hot: 80, cold: 20 },
    convection: { h: 25, area: 1, surface: 80, fluid: 20 },
    radiation: { emissivity: 0.85, area: 1, surface: 150, surrounding: 25 }
  }
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || parsed.schemaVersion !== 1) return emptyState();
    return { ...emptyState(), ...parsed, settings: { ...emptyState().settings, ...parsed.settings }, plan: { ...emptyState().plan, ...parsed.plan } };
  } catch { return emptyState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayISO(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function formatDate(value) { if (!value) return '未設定'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(+date) ? '未設定' : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(date); }
function formatTime(value) { return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function allSections() { return book.chapters.flatMap(chapter => chapter.sections.map(section => ({ ...section, chapterId: chapter.id, chapterTitle: chapter.title, part: chapter.part }))); }
function getSection(id) { return allSections().find(section => section.id === id); }
function getQuestion(id) { return questionBank.find(question => question.id === id); }
function sectionIsTranslated(section) { return Array.isArray(section?.blocks); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function highlight(value, query) {
  const text = String(value || '');
  if (!query) return escapeHTML(text);
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
  return parts.map(part => part.toLowerCase() === query.toLowerCase() ? `<mark>${escapeHTML(part)}</mark>` : escapeHTML(part)).join('');
}
function sourceLabel(source = {}) {
  if (source.type === 'supplement') return `補足説明・${escapeHTML(source.reference || '出典を確認中')}`;
  const section = source.section ? `第${escapeHTML(source.section)}節` : '';
  return `本書 ${section}／書籍 p.${escapeHTML(source.bookPages || '未記録')}・PDF p.${escapeHTML(source.pdfPages || '未記録')}`;
}
function setRoute(route) {
  ui.route = route;
  if (location.hash !== `#${route}`) location.hash = route;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateState(change) { state = typeof change === 'function' ? change(state) : { ...state, ...change }; saveState(); render(); }

const NAV_ITEMS = [
  ['home', 'ホーム', '⌂'], ['reader', '読む', '▤'], ['quiz', '問題', '◉'], ['review', '復習', '↻'],
  ['search', '検索', '⌕'], ['glossary', '用語集', 'あ'], ['map', '分野マップ', '◫'],
  ['simulator', 'シミュレーター', '≈'], ['plan', '学習計画', '▦'], ['calendar', 'カレンダー', '▣'], ['settings', '設定', '⚙']
];

async function startApp() {
  try {
    [book, questionBank, glossary, englishSection] = await Promise.all(DATA_FILES.map(path => fetch(path).then(response => {
      if (!response.ok) throw new Error(`教材データを読み込めません（${path}）`);
      return response.json();
    })));
    const firstSection = book.chapters.flatMap(chapter => chapter.sections).find(section => section.id === englishSection.sectionId);
    if (firstSection) firstSection.blocksEn = englishSection.blocks;
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => showStatus('オフライン保存の準備に失敗しました。ネット接続中にページを再読み込みしてください。'));
    window.addEventListener('hashchange', () => { ui.route = location.hash.slice(1) || 'home'; render(); });
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    window.addEventListener('scroll', saveReaderPosition, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    systemDark?.addEventListener?.('change', () => { if (state.settings.theme === 'system') render(); });
    render();
  } catch (error) {
    root.innerHTML = `<main class="load-error"><div class="error-icon">!</div><h1>教材を読み込めませんでした</h1><p>${escapeHTML(error.message || '教材データを確認してください。')}</p><p>ローカルサーバーから開いているか、<code>data</code> フォルダーがそろっているか確認してください。</p></main>`;
  }
}

function render() {
  if (!book) return;
  const theme = state.settings.theme === 'system' ? (systemDark?.matches ? 'dark' : 'light') : state.settings.theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--reader-scale', String(state.settings.fontScale || 1));
  document.documentElement.style.setProperty('--reader-line-height', String(state.settings.lineHeight || 1.8));
  document.documentElement.dataset.readerWidth = state.settings.width || 'reading';
  const routeView = routeContent();
  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a href="#home" class="brand" aria-label="ホームへ">
          <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
          <span><strong>熱移動を学ぶ</strong><small>読む・解く・ふり返る</small></span>
        </a>
        <div class="topbar-status">
          <span class="source-pill">第6版の学習補助</span>
          <span class="connection ${navigator.onLine ? '' : 'is-offline'}"><i></i>${navigator.onLine ? 'オンライン' : 'オフライン'}</span>
          <button class="icon-button" type="button" data-action="toggle-theme" aria-label="表示モードを切り替え" title="表示モードを切り替え">${theme === 'dark' ? '☼' : '☾'}</button>
        </div>
      </header>
      <div class="app-layout">
        <nav class="main-nav" aria-label="メインメニュー">
          ${NAV_ITEMS.map(([id, label, icon]) => `<a class="nav-link ${ui.route === id ? 'active' : ''}" href="#${id}" ${ui.route === id ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>${id === 'review' && dueReviewCount() ? `<b class="nav-badge">${dueReviewCount()}</b>` : ''}</a>`).join('')}
        </nav>
        <main class="main-content" id="main-content" tabindex="-1">${routeView}</main>
      </div>
      <footer class="app-footer"><span>学習データはこのブラウザー内に保存されます。</span><span>教材進捗：第1章1.1節のみ翻訳済み</span></footer>
    </div>`;
}

function routeContent() {
  const routes = { home: renderHome, reader: renderReader, search: renderSearch, glossary: renderGlossary, quiz: renderQuiz, review: renderReview, plan: renderPlan, calendar: renderCalendar, map: renderMap, simulator: renderSimulator, settings: renderSettings };
  return (routes[ui.route] || renderHome)();
}
function pageHeading(eyebrow, title, description = '', actions = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${description ? `<p class="page-description">${description}</p>` : ''}</div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}
function statusPill(text, tone = 'neutral') { return `<span class="status-pill tone-${tone}">${text}</span>`; }
function translatedSectionCount() { return allSections().filter(sectionIsTranslated).length; }
function countReadSections() { return Object.values(state.readSections).filter(Boolean).length; }
function lastSectionLabel() { const section = getSection(state.lastSection); return section ? `第${section.id}節「${escapeHTML(section.title)}」` : '第1章1.1節「熱移動」'; }
function getAttemptStats(id) { const attempts = state.attempts.filter(attempt => attempt.questionId === id); const correct = attempts.filter(attempt => attempt.correct).length; return { attempts, correct, accuracy: attempts.length ? correct / attempts.length : null }; }
function questionsByField() { const fields = new Map(); for (const q of questionBank) { const field = q.field || 'その他'; fields.set(field, (fields.get(field) || 0) + 1); } return fields; }
function dueReviewCount() { return reviewCandidates().filter(item => item.due <= todayISO()).length; }
function reviewCandidates() {
  const items = [];
  for (const q of questionBank) {
    const { attempts, accuracy } = getAttemptStats(q.id);
    const wrong = attempts.filter(a => !a.correct);
    const recent = attempts.at(-1);
    const review = state.reviews[q.id];
    const due = review?.dueDate || (recent ? todayISO(new Date(Date.parse(recent.at) + (recent.correct ? 3 : 1) * 86400000)) : '9999-12-31');
    const reasons = [];
    const reviewedAfterLastAttempt = Boolean(review?.lastReviewedAt && recent && review.lastReviewedAt >= recent.at);
    if (!reviewedAfterLastAttempt && recent && !recent.correct) reasons.push('直近の誤答');
    if (!reviewedAfterLastAttempt && wrong.length >= 2) reasons.push(`誤答${wrong.length}回`);
    if (!reviewedAfterLastAttempt && attempts.length >= 3 && accuracy !== null && accuracy < 0.6) reasons.push(`正答率${Math.round(accuracy * 100)}%（3回以上）`);
    if (!reviewedAfterLastAttempt && recent && (recent.confidence === 'low' || recent.confidence === 'unsure')) reasons.push(recent.correct ? '正解したが自信が低い' : '自信が低い・迷った');
    if (due <= todayISO() && attempts.length) reasons.push('復習予定日を過ぎている');
    if (!reasons.length) continue;
    items.push({ question: q, reasons: [...new Set(reasons)], due, attempts: attempts.length, accuracy });
  }
  return items.sort((a, b) => a.due.localeCompare(b.due) || b.reasons.length - a.reasons.length);
}
function renderHome() {
  const recentSession = state.sessions.at(-1);
  const plan = state.plan;
  const readPercent = translatedSectionCount() ? Math.round(countReadSections() / translatedSectionCount() * 100) : 0;
  const todayAttempts = state.attempts.filter(attempt => attempt.at.slice(0, 10) === todayISO()).length;
  const translated = getSection('1.1');
  return `${pageHeading('学習ホーム', '次に進むことが、ひと目でわかる。', '読んで、問題を解いて、あとで振り返る。今日のペースで始めましょう。')}
    <section class="hero-card">
      <div class="hero-copy"><p class="eyebrow">学習の続き</p><h2>${lastSectionLabel()}</h2><p>本文の翻訳はこの節まで用意しています。先へ進むときは、目次で翻訳の進み具合も確認できます。</p>
        <div class="hero-actions"><a class="button primary" href="#reader" data-open-section="${escapeHTML(state.lastSection)}">読む続きを開く <span aria-hidden="true">→</span></a><a class="button secondary" href="#quiz">問題を解く</a></div>
      </div><div class="hero-side"><div class="ring-progress" style="--progress:${readPercent}%"><div><strong>${readPercent}%</strong><span>翻訳済み節の読了</span></div></div><small>${countReadSections()} / ${translatedSectionCount()} 節を読了</small></div>
    </section>
    <div class="home-grid">
      <section class="surface-card today-card"><div class="card-heading"><div><p class="eyebrow">今日の学習</p><h2>無理のない一歩から</h2></div>${statusPill(`${todayAttempts}問回答`, 'blue')}</div>
        <div class="today-action-list"><a href="#review" class="today-action"><span class="action-icon amber">↻</span><span><strong>復習する</strong><small>${dueReviewCount() ? `${dueReviewCount()}問が復習時期です` : '復習候補を確認できます'}</small></span><b>→</b></a><a href="#quiz" data-quick-minutes="5" class="today-action"><span class="action-icon green">5</span><span><strong>5分だけ演習</strong><small>短い問題セットを始める</small></span><b>→</b></a><a href="#reader" class="today-action"><span class="action-icon violet">▤</span><span><strong>本文を読む</strong><small>前回の場所から再開</small></span><b>→</b></a></div>
      </section>
      <section class="surface-card plan-card"><div class="card-heading"><div><p class="eyebrow">あなたの学習計画</p><h2>${plan.active && plan.goal ? escapeHTML(plan.goal) : '目標を決めてみる'}</h2></div>${statusPill(plan.active ? '計画中' : '未設定', plan.active ? 'green' : 'neutral')}</div>
        ${plan.active && plan.goal ? `<p class="plan-summary">目標日：${formatDate(plan.targetDate)}　·　1日 ${Number(plan.minutesPerDay) || 15} 分</p><p class="muted">今日の学習内容は、学習記録と復習予定をもとに提案します。</p>` : '<p class="muted">目標と1日の時間を決めると、読書・演習・復習の進め方を提案できます。</p>'}<a class="text-link" href="#plan">計画を${plan.active ? '見直す' : '設定する'} <span aria-hidden="true">→</span></a>
      </section>
      <section class="surface-card recent-card"><div class="card-heading"><div><p class="eyebrow">最近の学習</p><h2>${recentSession ? '前回のふり返り' : '記録がここに並びます'}</h2></div><a href="#calendar" class="text-link">すべて見る →</a></div>
        ${recentSession ? `<p class="recent-date">${formatDate(recentSession.date)}</p><div class="recent-stats"><div><strong>${recentSession.total}</strong><span>問</span></div><div><strong>${recentSession.correct}</strong><span>正解</span></div><div><strong>${recentSession.total ? Math.round(recentSession.correct / recentSession.total * 100) : 0}%</strong><span>正答率</span></div></div><a class="text-link" href="#quiz">間違えた問題にもう一度挑戦 →</a>` : '<div class="empty-state compact"><span class="empty-mark">✦</span><p>学習を始めると、取り組んだ分野や復習予定をここで振り返れます。</p></div>'}
      </section>
      <section class="surface-card focus-card"><div class="card-heading"><div><p class="eyebrow">教材の進み具合</p><h2>全訳までの道のり</h2></div><a href="#reader" class="text-link">目次を見る →</a></div><div class="progress-line"><span style="width:${Math.max(readPercent, translated ? 1 : 0)}%"></span></div><p class="progress-caption"><strong>1節 / ${allSections().length}節</strong>の本文を収録。未翻訳の本文は表示していません。</p><p class="small-note">第1章1.1節：翻訳済み・専門家校閲待ち</p></section>
    </div>`;
}

function renderReader() {
  const section = getSection(ui.readerSection) || getSection('1.1');
  ui.readerSection = section.id;
  state.lastSection = section.id; saveState();
  const chapter = book.chapters.find(item => item.id === section.chapterId);
  const available = sectionIsTranslated(section);
  const hasEnglish = Array.isArray(section.blocksEn);
  const contentLanguage = hasEnglish && state.settings.contentLanguage === 'en' ? 'en' : 'ja';
  const displayTitle = contentLanguage === 'en' ? (section.sourceTitle || section.title) : section.title;
  const blocks = available ? section[contentLanguage === 'en' ? 'blocksEn' : 'blocks'].map(block => renderBookBlock(block, contentLanguage)).join('') : `<div class="not-translated"><span class="large-status">未着手</span><h2>この節の日本語訳は、まだ用意されていません</h2><p>内容を推測して表示することはしていません。原本の対応ページと翻訳進捗を確認してください。</p><div class="source-reference">原本：${escapeHTML(section.sourceTitle || section.title)}<br>書籍 p.${section.bookStart ?? '台帳未記録'}以降 · PDF p.${section.pdfStart ?? '台帳未記録'}以降</div><a class="button secondary" href="#settings">教材の進捗を見る</a></div>`;
  const sectionBookmarks = state.bookmarks.filter(bookmark => bookmark.sectionId === section.id);
  const prevNext = allSections(); const index = prevNext.findIndex(item => item.id === section.id);
  const prev = prevNext.slice(0, index).reverse().find(sectionIsTranslated);
  const next = prevNext.slice(index + 1).find(sectionIsTranslated);
  return `${pageHeading('読書モード', '章・節をたどって読む', '本文の段落、数式、図、表を分けて表示します。読んだ場所と読了状態はこの端末に保存されます。', '<a class="button secondary" href="#search">本文を検索</a>')}
    <div class="reader-layout">
      <aside class="reader-toc surface-card"><div class="toc-heading"><span class="eyebrow">目次</span><strong>A Heat Transfer Textbook</strong></div>
        ${book.chapters.map(item => `<details ${item.id === section.chapterId ? 'open' : ''}><summary><span>${escapeHTML(item.title)}</span><small>第${item.id.slice(2)}章</small></summary><div class="toc-items">${item.sections.map(sec => `<button class="toc-item ${sec.id === section.id ? 'selected' : ''} ${sectionIsTranslated(sec) ? '' : 'not-ready'}" type="button" data-section="${sec.id}"><span class="toc-number">${sec.id}</span><span>${escapeHTML(sec.title)}</span><i>${sectionIsTranslated(sec) ? '読める' : '未着手'}</i></button>`).join('')}</div></details>`).join('')}
        <div class="appendix-list"><span class="eyebrow">付録・索引</span>${book.appendices.map(item => `<div class="appendix-row"><span>${escapeHTML(item.title)}</span>${statusPill('未着手')}</div>`).join('')}</div>
      </aside>
      <article class="reader-panel surface-card" id="reader-article">
        <div class="reader-toolbar"><div class="language-toggle" role="group" aria-label="本文の表示言語"><button type="button" class="${contentLanguage === 'ja' ? 'selected' : ''}" data-language="ja" aria-pressed="${contentLanguage === 'ja'}">日本語</button><button type="button" class="${contentLanguage === 'en' ? 'selected' : ''}" data-language="en" ${hasEnglish ? '' : 'disabled'} aria-pressed="${contentLanguage === 'en'}">English</button></div><span class="language-note">${hasEnglish ? (contentLanguage === 'ja' ? '日本語訳' : '原文') : '英語原文はこの節に未収録'}</span><button class="icon-button" type="button" data-action="reader-width" title="本文の幅を切り替え" aria-label="本文の幅を切り替え">↔</button><button class="icon-button" type="button" data-action="reader-font-down" aria-label="文字を小さくする">A−</button><button class="icon-button" type="button" data-action="reader-font-up" aria-label="文字を大きくする">A＋</button><button class="icon-button" type="button" data-action="reader-line" aria-label="行間を調整">↕</button><button class="icon-button" type="button" data-action="speak" ${available ? '' : 'disabled'} aria-label="本文を読み上げる">▶ 読み上げ</button><button class="icon-button" type="button" data-action="stop-speech" aria-label="読み上げを停止">■ 停止</button></div>
        <div class="reader-meta"><span>${escapeHTML(chapter.part)} · 第${section.chapterId.slice(2)}章</span><span>書籍 p.${section.bookStart}–${section.bookEnd ?? '未確認'} · PDF p.${section.pdfStart}–${section.pdfEnd ?? '未確認'}</span></div>
        <h2 class="reader-title">${escapeHTML(section.id)}　${escapeHTML(displayTitle)}</h2>
        <div class="reader-status-row">${statusPill(available ? '翻訳済み' : '未着手', available ? 'green' : 'neutral')}${statusPill(available ? '専門家校閲待ち' : '内容未収録', 'amber')}</div>
        ${available ? `<div class="book-content" lang="${contentLanguage}">${blocks}</div>
          <div class="reader-actions"><button type="button" class="button ${state.readSections[section.id] ? 'secondary' : 'primary'}" data-action="toggle-read">${state.readSections[section.id] ? '✓ 読了に記録済み' : 'この節を読了にする'}</button><form class="bookmark-form" id="bookmark-form"><label for="bookmark-note">しおりのメモ（任意）</label><div class="inline-form"><input id="bookmark-note" name="note" type="text" maxlength="180" placeholder="あとで見返したい点"/><button class="button secondary" type="submit">しおりを付ける</button></div></form></div>
          <form class="reader-personal-note" id="reader-note-form"><p class="eyebrow">自分の学習メモ</p><div class="form-two"><label>見出し<input name="title" type="text" maxlength="100" placeholder="例：大事な考え方"/></label><label>メモ<textarea name="text" rows="2" maxlength="1000" placeholder="自分の言葉で整理しておく"></textarea></label></div><button class="button ghost" type="submit">この節にメモを保存</button></form>
          ${state.notes.filter(note => note.sectionId === section.id).map(note => `<div class="reader-note-entry"><strong>${escapeHTML(note.title || '学習メモ')}</strong><p>${escapeHTML(note.text)}</p><small>${formatDate(note.createdAt.slice(0,10))}</small><button type="button" class="text-button" data-delete-note="${escapeHTML(note.id)}">削除</button></div>`).join('')}
          ${sectionBookmarks.length ? `<div class="bookmark-list"><h3>この節のしおり</h3>${sectionBookmarks.map(bookmark => `<div class="bookmark-row"><span>⚑ ${escapeHTML(bookmark.note || 'メモなし')} <small>${formatDate(bookmark.createdAt.slice(0, 10))}</small></span><button type="button" class="text-button" data-delete-bookmark="${escapeHTML(bookmark.id)}">削除</button></div>`).join('')}</div>` : ''}` : blocks}
        <div class="reader-pager"><button class="button ghost" type="button" ${prev ? `data-section="${prev.id}"` : 'disabled'}>← 前の翻訳済み節${prev ? ` · ${escapeHTML(prev.title)}` : ''}</button><button class="button ghost" type="button" ${next ? `data-section="${next.id}"` : 'disabled'}>次の翻訳済み節${next ? ` · ${escapeHTML(next.title)}` : ''} →</button></div>
      </article>
    </div>`;
}

function renderBookBlock(block, language = 'ja') {
  const text = escapeHTML(block.text || '').replaceAll('\n', '<br>');
  if (block.type === 'heading') return `<h3 class="book-subheading">${text}</h3>`;
  if (block.type === 'quote') return `<blockquote class="book-quote"><p>${text}</p><cite>${escapeHTML(block.attribution || '')}</cite></blockquote>`;
  if (block.type === 'experiment') return `<section class="experiment"><div class="experiment-label">${language === 'en' ? 'Experiment' : '実験'}</div><h3>${escapeHTML(block.title)}</h3><p>${text}</p></section>`;
  if (block.type === 'footnote') return `<aside class="footnote"><sup>${escapeHTML(block.marker)}</sup><p>${text}</p></aside>`;
  if (block.type === 'formula') return `<div class="formula-block" aria-label="${escapeHTML(block.alt || block.expression)}"><div class="formula">${escapeHTML(block.expression)}</div><p>${escapeHTML(block.explanation || '')}</p></div>`;
  if (block.type === 'figure') return `<figure class="book-figure"><div class="figure-placeholder">${escapeHTML(block.alt || '図の代替説明')}</div><figcaption>${escapeHTML(block.caption || '')}</figcaption></figure>`;
  if (block.type === 'table') return `<div class="table-wrap"><table><caption>${escapeHTML(block.caption || '')}</caption><thead><tr>${block.headers.map(item => `<th scope="col">${escapeHTML(item)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(item => `<td>${escapeHTML(item)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (block.type === 'list') return `<ul class="book-list">${block.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
  if (block.type === 'paragraph') return `<p class="book-paragraph">${text}</p>`;
  return '';
}

function saveReaderPosition() {
  if (ui.route !== 'reader' || !ui.readerSection) return;
  clearTimeout(saveReaderPosition.timer);
  saveReaderPosition.timer = setTimeout(() => {
    state.readerPositions[ui.readerSection] = window.scrollY;
    state.lastSection = ui.readerSection;
    saveState();
  }, 500);
}

function buildSearchIndex() {
  const entries = [];
  for (const section of allSections()) if (section.blocks) {
    const chapter = book.chapters.find(item => item.id === section.chapterId);
    const languageSets = [['ja', section.blocks], ['en', section.blocksEn]].filter(([, blocks]) => Array.isArray(blocks));
    for (const [language, blocks] of languageSets) for (const block of blocks) if (block.text || block.items || block.title) {
      const text = [block.title, block.text, ...(block.items || [])].filter(Boolean).join(' ');
      if (text) entries.push({ kind: 'book', kindLabel: language === 'en' ? '本文 · English' : '本文 · 日本語', chapter: section.chapterId, title: `${section.id} ${language === 'en' ? section.sourceTitle || section.title : section.title}`, text, target: { route: 'reader', section: section.id, language }, source: `書籍 p.${section.bookStart}–${section.bookEnd} · PDF p.${section.pdfStart}–${section.pdfEnd}`, chapterTitle: chapter.title });
    }
  }
  for (const term of glossary) entries.push({ kind: 'glossary', kindLabel: '用語集', chapter: term.source.section?.split('.')[0] || 'supplement', title: `${term.ja}${term.en ? `（${term.en}）` : ''}`, text: term.meaning, target: { route: 'glossary', term: term.id }, source: sourceLabel(term.source) });
  for (const q of questionBank) {
    entries.push({ kind: 'question', kindLabel: '問題', chapter: q.source.section?.split('.')[0] || 'supplement', title: q.prompt, text: `${q.explanation} ${q.choices.join(' ')}`, target: { route: 'quiz', question: q.id }, source: sourceLabel(q.source) });
    const note = state.mistakeNotes[q.id];
    if (note) entries.push({ kind: 'memo', kindLabel: '間違いノート', chapter: q.source.section?.split('.')[0] || 'supplement', title: `問題メモ：${q.prompt}`, text: `${note.reason || ''} ${note.memory || ''} ${note.nextTime || ''}`, target: { route: 'quiz', question: q.id }, source: sourceLabel(q.source) });
  }
  for (const note of state.notes) entries.push({ kind: 'memo', kindLabel: 'メモ', chapter: note.chapter || 'all', title: note.title || '学習メモ', text: note.text, target: { route: 'reader', section: note.sectionId || '1.1' }, source: note.sectionId ? `第${note.sectionId}節` : '利用者のメモ' });
  for (const bookmark of state.bookmarks) entries.push({ kind: 'memo', kindLabel: 'しおり', chapter: bookmark.sectionId.split('.')[0], title: `しおり：第${bookmark.sectionId}節`, text: bookmark.note, target: { route: 'reader', section: bookmark.sectionId }, source: '本文のしおり' });
  for (const id of state.questionBookmarks) { const q = getQuestion(id); if (q) entries.push({ kind: 'memo', kindLabel: '問題ブックマーク', chapter: q.source.section?.split('.')[0] || 'supplement', title: `あとで解く：${q.prompt}`, text: q.explanation, target: { route: 'quiz', question: id }, source: sourceLabel(q.source) }); }
  return entries;
}
function renderSearch() {
  const results = ui.searchResults || [];
  return `${pageHeading('横断検索', '探したい言葉から、学びへ。', '翻訳済み本文、見出し、用語、問題、解説、あなたのメモをまとめて検索します。')}
    <form id="search-form" class="search-form surface-card"><label for="search-query">検索語</label><div class="search-input-row"><div class="search-input-wrap"><span aria-hidden="true">⌕</span><input id="search-query" name="query" type="search" value="${escapeHTML(ui.search.query)}" placeholder="例：温度勾配、対流、熱抵抗" autocomplete="off"/><button type="button" class="clear-search" data-action="clear-search" aria-label="検索語を消去">×</button></div><button class="button primary" type="submit">検索</button></div>
      <div class="filter-row"><label>対象<select name="kind"><option value="all" ${ui.search.kind === 'all' ? 'selected' : ''}>すべて</option><option value="book" ${ui.search.kind === 'book' ? 'selected' : ''}>本文・見出し</option><option value="glossary" ${ui.search.kind === 'glossary' ? 'selected' : ''}>用語集</option><option value="question" ${ui.search.kind === 'question' ? 'selected' : ''}>問題・解説</option><option value="memo" ${ui.search.kind === 'memo' ? 'selected' : ''}>メモ・しおり</option></select></label><label>章<select name="chapter"><option value="all">すべての章</option>${book.chapters.map(ch => `<option value="${ch.id}" ${ui.search.chapter === ch.id ? 'selected' : ''}>第${ch.id.slice(2)}章 ${escapeHTML(ch.title)}</option>`).join('')}<option value="supplement" ${ui.search.chapter === 'supplement' ? 'selected' : ''}>補足説明</option></select></label><span class="search-hint">日本語の一部だけでも検索できます</span></div>
    </form>
    <section class="search-results"><div class="results-heading"><h2>${ui.search.query ? `「${escapeHTML(ui.search.query)}」の検索結果` : '検索結果'}</h2>${ui.search.query ? `<span>${results.length}件</span>` : ''}</div>
      ${!ui.search.query ? `<div class="empty-state"><span class="empty-mark">⌕</span><h3>見つけたい言葉を入力してください</h3><p>翻訳済み本文と用語集、問題、あなたが保存したメモを検索できます。</p></div>` : !results.length ? `<div class="empty-state"><span class="empty-mark">…</span><h3>一致する内容がありません</h3><p>別の言葉や短い表現で検索してみてください。未翻訳本文は検索対象に含まれません。</p></div>` : `<div class="result-list">${results.map(entry => `<article class="result-card"><div class="result-meta">${statusPill(entry.kindLabel, entry.kind === 'book' ? 'blue' : entry.kind === 'memo' ? 'amber' : 'green')}<span>${escapeHTML(entry.chapterTitle || '')}</span></div><h3><button type="button" class="result-link" data-search-target='${escapeHTML(JSON.stringify(entry.target))}'>${highlight(entry.title, ui.search.query)}</button></h3><p>${highlight(entry.text.slice(0, 360), ui.search.query)}${entry.text.length > 360 ? '…' : ''}</p><small>${escapeHTML(entry.source)}</small></article>`).join('')}</div>`}
    </section>`;
}

function renderGlossary() {
  const query = ui.glossaryQuery || '';
  const filtered = glossary.filter(item => !query || `${item.ja} ${item.en} ${item.meaning}`.toLowerCase().includes(query.toLowerCase()));
  return `${pageHeading('用語集', '専門用語を、自分の言葉に。', '日本語の意味と英語の原語を確認できます。補足説明と本書に由来する内容を分けて表示します。')}
    <div class="glossary-search surface-card"><label for="glossary-query">用語を探す</label><input id="glossary-query" type="search" value="${escapeHTML(query)}" placeholder="用語や英語名を入力"/></div>
    <div class="glossary-grid">${filtered.map(term => `<article class="term-card surface-card" id="term-${escapeHTML(term.id)}"><div class="term-heading"><h2>${escapeHTML(term.ja)}</h2>${term.en ? `<span>${escapeHTML(term.en)}</span>` : ''}</div><p>${escapeHTML(term.meaning)}</p><div class="term-source">${sourceLabel(term.source)}</div>${term.source.type === 'supplement' ? statusPill('補足説明', 'violet') : `<button type="button" class="text-link" data-section="${escapeHTML(term.source.section || '1.1')}">本文を開く →</button>`}</article>`).join('') || '<div class="empty-state"><p>一致する用語がありません。</p></div>'}</div>
    <div class="notice-card"><span class="notice-icon">i</span><p>用語集は収録済みの教材範囲をもとに作成しています。全文翻訳に合わせて追加・校閲します。</p></div>`;
}

function searchNow(form) {
  const data = new FormData(form);
  ui.search = { query: String(data.get('query') || '').trim(), kind: String(data.get('kind') || 'all'), chapter: String(data.get('chapter') || 'all') };
  const normalized = ui.search.query.normalize('NFKC').toLowerCase();
  ui.searchResults = normalized ? buildSearchIndex().filter(entry => (ui.search.kind === 'all' || entry.kind === ui.search.kind) && (ui.search.chapter === 'all' || entry.chapter === ui.search.chapter) && entry.text.normalize('NFKC').toLowerCase().includes(normalized)) : [];
  render();
}

function renderSettings() {
  const percent = questionBank.length ? Math.round(translatedSectionCount() / allSections().length * 100) : 0;
  return `${pageHeading('設定とデータ', '学び方を、自分に合わせる。', '表示の調整、端末への保存、学習データの入出力を行います。')}
    <div class="settings-grid">
      <section class="surface-card settings-card"><p class="eyebrow">表示</p><h2>画面の見やすさ</h2><fieldset class="choice-field"><legend>表示モード</legend><div class="segmented-control"><label><input type="radio" name="theme" value="system" ${state.settings.theme === 'system' ? 'checked' : ''}/><span>端末に合わせる</span></label><label><input type="radio" name="theme" value="light" ${state.settings.theme === 'light' ? 'checked' : ''}/><span>ライト</span></label><label><input type="radio" name="theme" value="dark" ${state.settings.theme === 'dark' ? 'checked' : ''}/><span>ダーク</span></label></div></fieldset>
        <label class="range-setting">本文の文字サイズ <strong>${Math.round(state.settings.fontScale * 100)}%</strong><input type="range" min="0.9" max="1.4" step="0.05" name="fontScale" value="${state.settings.fontScale}"/><span class="range-ends"><small>小さめ</small><small>大きめ</small></span></label>
        <label class="range-setting">本文の行間 <strong>${Number(state.settings.lineHeight).toFixed(1)}</strong><input type="range" min="1.5" max="2.2" step="0.1" name="lineHeight" value="${state.settings.lineHeight}"/><span class="range-ends"><small>標準</small><small>広め</small></span></label><div class="preview-text">熱は高温側から低温側へ移ります。読みやすい大きさと行間に調整してください。</div>
      </section>
      <section class="surface-card settings-card"><p class="eyebrow">学習データ</p><h2>保存と持ち運び</h2><p>学習履歴、回答、自信度、メモ、しおり、計画、設定をJSONで書き出します。書籍本文や問題本文は含まれません。</p><div class="button-stack"><button class="button primary" type="button" data-action="export-data">JSONを書き出す</button><label class="button secondary file-button">JSONを取り込む<input type="file" id="import-file" accept="application/json,.json"/></label></div><div id="import-feedback" class="import-feedback">${renderImportDraft()}</div><div class="notice-card compact-notice"><span class="notice-icon">i</span><p>ファイル形式が正しい場合も、取り込み前に内容を確認できます。壊れたファイルでは現在の記録を変更しません。</p></div></section>
      <section class="surface-card settings-card"><p class="eyebrow">教材</p><h2>翻訳と確認の状況</h2><div class="content-progress"><div><strong>第1章1.1節</strong><span>${statusPill('翻訳済み', 'green')} ${statusPill('専門家校閲待ち', 'amber')}</span></div><small>書籍 p.3–6 · PDF p.17–20</small><div class="progress-line"><span style="width:${percent}%"></span></div><p>${translatedSectionCount()}節 / ${allSections().length}節を収録。残りの本文・図表・脚注・付録・索引は未着手です。</p></div><a class="text-link" href="#reader">翻訳進捗を目次で見る →</a><p class="small-note">PDFはこのアプリに同梱していません。出典と著作権情報はリポジトリの LICENSE-BOOK.md に記録しています。</p></section>
      <section class="surface-card settings-card"><p class="eyebrow">対応状況</p><h2>オフライン・読み上げ・操作</h2><ul class="capability-list"><li><span>${navigator.onLine ? '●' : '○'}</span> ${navigator.onLine ? 'オンライン接続中' : 'オフライン中'}。初回の教材読み込み後は、アプリと収録済み教材を利用できます。</li><li><span>▶</span> 読み上げは端末の音声合成機能を使用します。未対応のブラウザーでは利用できません。</li><li><span>⌨</span> 問題演習中は数字キー1〜4で選択、Enterで回答できます。入力欄にフォーカスがある間は操作を奪いません。</li><li><span>▣</span> 読書位置、読了、問題回答、復習予定はこのブラウザーに保存します。</li></ul></section>
    </div>`;
}
function renderImportDraft() {
  if (!ui.importDraft) return '';
  if (ui.importDraft.error) return `<div class="inline-error" role="alert">${escapeHTML(ui.importDraft.error)}</div>`;
  const parsed = ui.importDraft.data;
  return `<div class="import-preview"><strong>取り込み可能なデータです</strong><p>${parsed.attempts.length}件の回答 · ${parsed.bookmarks.length}件のしおり · ${Object.keys(parsed.mistakeNotes).length}件の間違いノート</p><div class="button-row"><button type="button" class="button primary" data-action="import-merge">今の記録に追加・更新</button><button type="button" class="text-button danger-text" data-action="import-replace">すべて置き換える</button></div></div>`;
}

function showStatus(message) {
  const existing = document.querySelector('.toast');
  existing?.remove();
  const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.textContent = message;
  document.body.append(toast); setTimeout(() => toast.remove(), 4200);
}

function renderPlan() {
  const plan = state.plan;
  const remaining = plan.targetDate ? Math.max(0, Math.ceil((new Date(`${plan.targetDate}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)) / 86400000)) : null;
  const todayDue = dueReviewCount();
  return `${pageHeading('学習計画', '続けられる予定をつくる。', '目標日と1日の時間から、読書・演習・復習を組み合わせて提案します。内容はいつでも変えたり、停止したりできます。')}
    <div class="plan-layout">
      <section class="surface-card plan-form-card"><p class="eyebrow">あなたの目標</p><h2>何をいつまでに学びたい？</h2><form id="plan-form" class="stack-form">
        <label>学習目標<input name="goal" type="text" maxlength="120" value="${escapeHTML(plan.goal)}" placeholder="例：熱移動の基礎を説明できるようになる"/></label>
        <div class="form-two"><label>目標日<input name="targetDate" type="date" min="${todayISO()}" value="${escapeHTML(plan.targetDate)}"/></label><label>1日に使える時間<select name="minutesPerDay">${[5,10,15,20,30,45,60].map(value => `<option value="${value}" ${Number(plan.minutesPerDay) === value ? 'selected' : ''}>${value}分</option>`).join('')}</select></label></div>
        <div class="button-row"><button class="button primary" type="submit">計画を保存</button>${plan.active ? '<button class="button secondary" type="button" data-action="stop-plan">計画を停止</button>' : ''}</div>
      </form></section>
      <section class="surface-card suggestion-card"><p class="eyebrow">今日の提案</p><h2>${plan.active ? 'この順番で進めましょう' : 'まずは学習を始めましょう'}</h2>
        <ol class="suggested-steps"><li><span>1</span><div><strong>${state.readSections['1.1'] ? '熱移動の節を読み返す' : '第1章1.1節を読む'}</strong><small>目安 ${Math.max(5, Math.round((Number(plan.minutesPerDay) || 15) * 0.4))} 分 · 翻訳済みの本文</small></div><a href="#reader">開く</a></li><li><span>2</span><div><strong>関連する問題に挑戦する</strong><small>目安 ${Math.max(3, Math.round((Number(plan.minutesPerDay) || 15) * 0.35))} 分 · 回答履歴を記録</small></div><a href="#quiz">始める</a></li><li><span>3</span><div><strong>${todayDue ? `${todayDue}問の復習候補を確認する` : '復習の準備をする'}</strong><small>目安 ${Math.max(2, Math.round((Number(plan.minutesPerDay) || 15) * 0.25))} 分 · 自信度も考慮</small></div><a href="#review">確認</a></li></ol>
        <p class="small-note">提案は収録済み教材と回答履歴に基づきます。全文の学習所要時間や、未翻訳範囲の完了日は推定していません。</p>
      </section>
      <section class="surface-card plan-summary-card"><p class="eyebrow">計画の見通し</p>${plan.active ? `<div class="summary-highlight"><strong>${remaining === null ? '—' : remaining}</strong><span>${remaining === 1 ? '日後まで' : '日間の予定'}</span></div><p>目標日：${formatDate(plan.targetDate)}　·　1日 ${Number(plan.minutesPerDay) || 15} 分</p><p class="muted">目標：${escapeHTML(plan.goal || '未入力')}</p>` : '<div class="empty-state compact"><span class="empty-mark">▦</span><p>計画を保存すると、目標と1日の学習時間がここに表示されます。</p></div>'}</section>
    </div>`;
}

function renderCalendar() {
  const anchor = new Date(`${ui.calendarDate}T00:00:00`);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstCell = new Date(anchor.getFullYear(), anchor.getMonth(), 1 - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index));
  const monthName = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' }).format(anchor);
  const selected = ui.calendarDate;
  const activityDates = new Set([...state.attempts.map(item => item.at.slice(0, 10)), ...state.sessions.map(item => item.date)]);
  const dueDates = new Set(Object.values(state.reviews).map(item => item.dueDate).filter(Boolean));
  const selectedAttempts = state.attempts.filter(item => item.at.slice(0, 10) === selected);
  const selectedSessions = state.sessions.filter(item => item.date === selected);
  const fields = new Map();
  for (const attempt of selectedAttempts) { const q = getQuestion(attempt.questionId); if (q) fields.set(q.field, (fields.get(q.field) || 0) + 1); }
  return `${pageHeading('学習カレンダー', '続けた日も、復習する日も。', '学習日、回答数、分野、復習予定を日付ごとに振り返れます。')}
    <div class="calendar-layout"><section class="surface-card calendar-card"><div class="calendar-toolbar"><button class="icon-button" type="button" data-action="calendar-prev" aria-label="前の月">←</button><h2>${monthName}</h2><button class="icon-button" type="button" data-action="calendar-next" aria-label="次の月">→</button></div>
      <div class="calendar-grid calendar-weekdays">${['日','月','火','水','木','金','土'].map(day => `<span>${day}</span>`).join('')}</div>
      <div class="calendar-grid">${days.map(date => { const iso = todayISO(date); const inMonth = date.getMonth() === anchor.getMonth(); return `<button type="button" class="calendar-day ${inMonth ? '' : 'outside'} ${iso === todayISO() ? 'today' : ''} ${iso === selected ? 'selected' : ''}" data-date="${iso}" aria-label="${formatDate(iso)}${activityDates.has(iso) ? ' 学習記録あり' : ''}${dueDates.has(iso) ? ' 復習予定あり' : ''}"><span>${date.getDate()}</span><i class="day-markers">${activityDates.has(iso) ? '<b class="activity-dot" title="学習記録"></b>' : ''}${dueDates.has(iso) ? '<b class="due-dot" title="復習予定"></b>' : ''}</i></button>`; }).join('')}</div>
      <div class="calendar-legend"><span><i class="activity-dot"></i>学習記録</span><span><i class="due-dot"></i>復習予定</span></div></section>
      <aside class="surface-card day-detail"><p class="eyebrow">選択した日</p><h2>${formatDate(selected)}</h2>${selectedAttempts.length || selectedSessions.length ? `<div class="day-stats"><div><strong>${selectedAttempts.length}</strong><span>回答数</span></div><div><strong>${selectedAttempts.filter(a => a.correct).length}</strong><span>正解</span></div></div><h3>取り組んだ分野</h3><ul class="field-breakdown">${[...fields.entries()].map(([field, count]) => `<li><span>${escapeHTML(field)}</span><strong>${count}問</strong></li>`).join('') || '<li><span>この日の演習記録はありません</span></li>'}</ul>${selectedSessions.map(session => `<div class="session-entry"><strong>${formatTime(session.startedAt)}　学習セッション</strong><span>${session.total}問 · 正解 ${session.correct}問</span></div>`).join('')}` : `<div class="empty-state compact"><span class="empty-mark">▣</span><p>この日の学習記録はありません。復習予定は日付の印で確認できます。</p></div>`}<a class="text-link" href="#quiz">短い問題セットを始める →</a></aside></div>`;
}

function renderMap() {
  const fields = [...questionsByField().entries()];
  return `${pageHeading('分野マップ', 'わかるところと、次の一歩。', '理解度は問題への回答から算出します。回答数が少ない分野は、理解度を決めつけず「記録不足」と表示します。')}
    <div class="map-grid">${fields.map(([field, total]) => { const qs = questionBank.filter(q => q.field === field); const attempts = state.attempts.filter(a => qs.some(q => q.id === a.questionId)); const correct = attempts.filter(a => a.correct).length; const enough = attempts.length >= 3; const ratio = attempts.length ? correct / attempts.length : 0; const label = enough ? `${Math.round(ratio * 100)}%` : '記録不足'; const tone = enough ? ratio >= 0.75 ? 'strong' : ratio >= 0.5 ? 'middle' : 'needs-work' : 'not-enough'; return `<article class="map-card surface-card"><div class="map-card-heading"><span class="map-symbol ${tone}" aria-hidden="true">${enough ? ratio >= 0.75 ? '●' : ratio >= 0.5 ? '◐' : '○' : '—'}</span><div><h2>${escapeHTML(field)}</h2><small>${attempts.length}回答 / 収録${total}問</small></div></div><div class="map-meter"><span class="${tone}" style="width:${enough ? Math.max(3, ratio * 100) : 0}%"></span></div><div class="map-card-foot"><strong>${label}</strong><span>${enough ? `${correct}問正解` : '判定には3回答以上が目安'}</span></div><a class="text-link" href="#quiz" data-map-field="${escapeHTML(field)}">${enough && ratio < 0.6 ? 'この分野を復習する' : 'この分野の問題を解く'} →</a></article>`; }).join('')}</div>
    <section class="notice-card map-method"><span class="notice-icon">i</span><div><strong>理解度の計算方法</strong><p>直近の回答だけに限定せず、この分野の正解数 ÷ 回答数で表示します。3回答未満は割合を出さず「記録不足」とします。自信度と復習日の提案は別に管理します。</p></div></section>`;
}

const SIM_META = {
  conduction: { title: '熱伝導', description: '固体の内部などで、温度差により熱が移動するモデルです。', formula: 'Q̇ = k A (Tₕ − T𝑐) / L', note: '均質な平板、一次元、定常状態、熱伝導率一定、側面からの熱漏れなし。接触熱抵抗や端部効果は含みません。' },
  convection: { title: '対流', description: '固体表面と、その近くを動く流体との間の熱移動を扱います。', formula: 'Q̇ = h A (Tₛ − T∞)', note: 'ニュートンの冷却法則を使う集中モデルです。h は流れや形状に依存する入力値で、ここでは一定とします。流れ場や温度依存性は解いていません。' },
  radiation: { title: '熱放射', description: '表面間で電磁波として移る熱を、単純化した灰色面モデルで見ます。', formula: 'Q̇ = ε σ A (Tₛ,K⁴ − Tsur,K⁴)', note: '大きな黒い周囲を見込む不透明な灰色面、形態係数1、周囲からの一様な照射を仮定。対流・反射・波長依存性は含みません。温度は必ずKへ換算します。' }
};
const STEFAN_BOLTZMANN = 5.670374419e-8;
function simRead(mode) { return ui.simValues[mode]; }
function calculateSimulation(mode, values) {
  const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]));
  for (const [key, value] of Object.entries(numeric)) if (!Number.isFinite(value)) return { error: '数値を入力してください。空欄や文字は計算できません。' };
  if (mode === 'conduction') {
    if (numeric.k <= 0 || numeric.area <= 0 || numeric.thickness <= 0) return { error: '熱伝導率 k、面積 A、厚さ L は0より大きい値にしてください。' };
    const watts = numeric.k * numeric.area * (numeric.hot - numeric.cold) / numeric.thickness;
    return { watts, delta: numeric.hot - numeric.cold, values: numeric };
  }
  if (mode === 'convection') {
    if (numeric.h <= 0 || numeric.area <= 0) return { error: '対流熱伝達率 h と面積 A は0より大きい値にしてください。' };
    const watts = numeric.h * numeric.area * (numeric.surface - numeric.fluid);
    return { watts, delta: numeric.surface - numeric.fluid, values: numeric };
  }
  if (numeric.emissivity < 0 || numeric.emissivity > 1) return { error: '放射率 ε は0〜1の範囲で入力してください。' };
  if (numeric.area <= 0) return { error: '面積 A は0より大きい値にしてください。' };
  if (numeric.surface <= -273.15 || numeric.surrounding <= -273.15) return { error: '温度は絶対零度（−273.15 ℃）より高い値にしてください。' };
  const surfaceK = numeric.surface + 273.15;
  const surroundingK = numeric.surrounding + 273.15;
  const watts = numeric.emissivity * STEFAN_BOLTZMANN * numeric.area * (surfaceK ** 4 - surroundingK ** 4);
  return { watts, delta: numeric.surface - numeric.surrounding, surfaceK, surroundingK, values: numeric };
}
function renderSimInputs(mode, values) {
  const field = (name, label, unit, min = '', step = 'any', help = '') => `<label class="sim-field">${label}<span class="input-unit"><input type="number" name="${name}" value="${escapeHTML(values[name])}" min="${min}" step="${step}" inputmode="decimal" required/><i>${unit}</i></span>${help ? `<small>${help}</small>` : ''}</label>`;
  if (mode === 'conduction') return `${field('k','熱伝導率 k','W/(m·K)','0.000001','any','材料の熱の伝わりやすさ')}${field('area','面積 A','m²','0.000001','any')}${field('thickness','厚さ L','m','0.000001','any','熱が通る距離')}${field('hot','高温側 Tₕ','℃','','any')}${field('cold','低温側 T𝑐','℃','','any')}`;
  if (mode === 'convection') return `${field('h','対流熱伝達率 h','W/(m²·K)','0.000001','any','流れの影響をまとめた係数')}${field('area','面積 A','m²','0.000001','any')}${field('surface','表面温度 Tₛ','℃','','any')}${field('fluid','流体温度 T∞','℃','','any')}`;
  return `${field('emissivity','放射率 ε','無次元','0','0.01','0〜1の範囲')}${field('area','面積 A','m²','0.000001','any')}${field('surface','表面温度 Tₛ','℃','','any')}${field('surrounding','周囲温度 Tsur','℃','','any','内部で絶対温度に変換します')}`;
}
function simValueAt(mode, values, delta) {
  if (mode === 'conduction') return values.k * values.area * delta / values.thickness;
  if (mode === 'convection') return values.h * values.area * delta;
  const surroundings = values.surrounding + 273.15;
  return values.emissivity * STEFAN_BOLTZMANN * values.area * ((surroundings + delta) ** 4 - surroundings ** 4);
}
function simGraph(mode, current, baseline) {
  const maxDelta = Math.max(10, Math.abs(current.delta || 0) * 2, baseline ? Math.abs(calculateSimulation(mode, baseline)?.delta || 0) * 2 : 0);
  const width = 560, height = 235, left = 54, right = 18, top = 18, bottom = 38;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  let maxQ = 1;
  const points = Array.from({ length: 31 }, (_, i) => { const delta = maxDelta * i / 30; const q = simValueAt(mode, current.values, delta); maxQ = Math.max(maxQ, Math.abs(q)); return [delta, q]; });
  const basePoints = baseline ? Array.from({ length: 31 }, (_, i) => { const delta = maxDelta * i / 30; return [delta, simValueAt(mode, baseline, delta)]; }) : [];
  if (baseline) maxQ = Math.max(maxQ, ...basePoints.map(point => Math.abs(point[1])));
  const pathFor = values => values.map(([x, y], i) => `${i ? 'L' : 'M'}${left + x / maxDelta * plotWidth},${top + plotHeight - y / maxQ * plotHeight}`).join(' ');
  const yTicks = [0, 0.5, 1].map(fraction => { const y = top + plotHeight * (1 - fraction); return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="chart-grid"/><text x="${left-8}" y="${y+4}" text-anchor="end" class="chart-label">${(maxQ*fraction).toPrecision(2)}</text>`; }).join('');
  return `<svg class="sim-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="温度差と熱移動率の関係を示すグラフ。実線は現在の条件${baseline ? '、破線は保存した比較条件' : ''}。"><title>温度差と熱移動率の関係</title>${yTicks}<line x1="${left}" y1="${top+plotHeight}" x2="${width-right}" y2="${top+plotHeight}" class="chart-axis"/><line x1="${left}" y1="${top}" x2="${left}" y2="${top+plotHeight}" class="chart-axis"/><path d="${pathFor(points)}" class="chart-current"/>${baseline ? `<path d="${pathFor(basePoints)}" class="chart-baseline"/>` : ''}<text x="${left+plotWidth/2}" y="${height-7}" text-anchor="middle" class="chart-label">温度差 ΔT（K または ℃差）</text><text x="14" y="${top+plotHeight/2}" transform="rotate(-90 14 ${top+plotHeight/2})" text-anchor="middle" class="chart-label">熱移動率 Q̇（W）</text><text x="${left}" y="${height-21}" class="chart-label">0</text><text x="${width-right}" y="${height-21}" text-anchor="end" class="chart-label">${maxDelta.toFixed(0)}</text></svg>`;
}
function renderSimulator() {
  const mode = ui.simMode; const values = simRead(mode); const result = calculateSimulation(mode, values); const baseline = state.simComparisons[mode]; const meta = SIM_META[mode];
  const resultView = result.error ? `<div class="sim-error" role="alert"><strong>計算できませんでした</strong><p>${escapeHTML(result.error)}</p></div>` : `<div class="result-number"><span>計算結果（理想化モデル）</span><strong>${result.watts.toLocaleString('ja-JP', { maximumFractionDigits: 3, minimumFractionDigits: 0 })}<i>W</i></strong><small>${Math.abs(result.delta) < 1e-12 ? '温度差がないため、このモデルでは熱移動率は0 Wです。' : result.watts > 0 ? '高温側・表面から低温側・周囲へ熱が移動します。' : '入力した温度関係に従い、逆向きに熱が移動します。'}${mode === 'radiation' && !result.error ? ` 温度換算：${result.surfaceK.toFixed(2)} K と ${result.surroundingK.toFixed(2)} K` : ''}</small></div>`;
  const comparison = baseline && !result.error ? calculateSimulation(mode, baseline) : null;
  return `${pageHeading('簡易シミュレーター', '条件を変えて、熱の動きを見る。', '入力値を変えると計算結果とグラフが更新されます。設計値を決めるためのものではなく、基本式の動きを試す学習用モデルです。')}
    <div class="sim-tabs" role="tablist" aria-label="熱移動の種類">${Object.entries(SIM_META).map(([key,item]) => `<button type="button" role="tab" aria-selected="${mode === key}" class="sim-tab ${mode === key ? 'selected' : ''}" data-sim-mode="${key}"><span>${key === 'conduction' ? '▥' : key === 'convection' ? '↝' : '☼'}</span>${item.title}</button>`).join('')}</div>
    <div class="sim-layout"><section class="surface-card sim-input-card"><div class="sim-intro"><p class="eyebrow">${meta.title}</p><h2>${meta.description}</h2></div><form id="sim-form" class="sim-form"><div class="sim-fields">${renderSimInputs(mode, values)}</div></form><div class="formula-card"><span>使用する式</span><strong>${meta.formula}</strong><p>正の値は、入力欄の「高温側」または「表面」から反対側へ移る向きを表します。負の値なら向きが逆です。</p></div><div class="assumption-card"><strong>前提と適用範囲</strong><p>${meta.note}</p></div></section>
      <section class="surface-card sim-output-card"><div class="card-heading"><div><p class="eyebrow">現在の条件</p><h2>熱移動率</h2></div>${statusPill(mode === 'radiation' ? '℃からKへ換算' : '定常モデル', 'blue')}</div>${resultView}
        ${!result.error ? `<div class="chart-heading"><h3>温度差を変えたとき</h3><span>比較範囲は現在の温度差の約2倍</span></div>${simGraph(mode, result, baseline)}<div class="chart-legend"><span><i class="legend-current"></i>現在の条件</span>${baseline ? '<span><i class="legend-baseline"></i>保存した比較条件</span>' : ''}</div>` : ''}
        <div class="comparison-controls"><button type="button" class="button secondary" data-action="save-comparison">この条件を比較用に保存</button>${baseline ? '<button type="button" class="text-button" data-action="clear-comparison">比較条件を削除</button>' : ''}${comparison && !comparison.error ? `<small>保存条件の結果：${comparison.watts.toLocaleString('ja-JP', { maximumFractionDigits: 3 })} W</small>` : ''}</div>
        <div class="related-reading"><strong>関連する本書の範囲</strong><a href="#reader" data-section="${mode === 'conduction' ? '2.2' : mode === 'convection' ? '6.1' : '10.1'}">${mode === 'conduction' ? '第2章2.2節：平板の定常熱伝導' : mode === 'convection' ? '第6章：境界層と対流' : '第10章：放射熱移動'} <span>${statusPill('未翻訳', 'amber')}</span></a><small>対応する本文は現在未翻訳です。原本ページのみ目次台帳に記録しています。</small></div>
      </section></div>`;
}

function renderQuiz() {
  if (ui.quizResult) return renderQuizResult();
  if (!ui.quiz) return renderQuizSetup();
  const session = ui.quiz; const question = getQuestion(session.ids[session.index]);
  if (!question) { ui.quiz = null; return renderQuizSetup(); }
  const answer = session.answers[session.index];
  const note = state.mistakeNotes[question.id] || {};
  const hints = question.solutionSteps || question.hints || [];
  const progress = Math.round((session.index + (answer ? 1 : 0)) / session.ids.length * 100);
  const figure = question.figure ? renderQuestionFigure(question.figure) : '';
  return `${pageHeading('問題演習', `${session.index + 1} / ${session.ids.length} 問`, 'まず自分で考え、必要ならヒントを少しずつ見てから回答しましょう。', '<button type="button" class="text-button" data-action="exit-quiz">演習を中断</button>')}
    <div class="quiz-progress"><div class="progress-line"><span style="width:${progress}%"></span></div><div class="quiz-progress-label"><span>${escapeHTML(question.field)} · ${escapeHTML(question.difficulty)}</span><span>${session.mode === 'quick' ? `${session.quickMinutes}分セット` : modeLabel(session.mode)}</span></div></div>
    <article class="question-card surface-card"><div class="question-meta"><div>${statusPill(`問題 ${session.index + 1}`, 'blue')} ${statusPill(question.reviewStatus, 'amber')}</div><div class="question-actions"><button type="button" class="icon-button ${state.questionBookmarks.includes(question.id) ? 'is-bookmarked' : ''}" data-question-bookmark="${escapeHTML(question.id)}" aria-label="問題をブックマーク">${state.questionBookmarks.includes(question.id) ? '★' : '☆'}</button><button type="button" class="text-button" data-action="open-report" data-report-id="${escapeHTML(question.id)}">問題を報告</button></div></div>
      <h2>${escapeHTML(question.prompt)}</h2>
      ${figure}
      <p class="think-prompt"><span aria-hidden="true">✦</span> まずは自分で考えてみましょう。迷ったら、ヒントを一つずつ開けます。</p>
      ${session.hintCount ? `<div class="hint-box"><strong>${question.solutionSteps ? '考え方のステップ' : 'ヒント'}</strong><ol>${hints.slice(0, session.hintCount).map(hint => `<li>${escapeHTML(hint)}</li>`).join('')}</ol></div>` : ''}
      ${!answer ? `<button type="button" class="text-button hint-trigger" data-action="reveal-hint" ${session.hintCount >= hints.length ? 'disabled' : ''}>${session.hintCount < hints.length ? `ヒントを${session.hintCount ? 'もう一つ' : '見る'}（${session.hintCount + 1}/${hints.length}）` : 'すべてのヒントを表示しました'}</button>` : ''}
      <form id="quiz-answer-form"><fieldset class="answer-options" ${answer ? 'disabled' : ''}><legend>最も適切な答えを一つ選んでください</legend>${question.choices.map((choice,index) => `<label class="answer-choice ${session.selected === index ? 'selected' : ''} ${answer && index === question.answer ? 'correct-choice' : ''} ${answer && session.selected === index && !answer.correct ? 'wrong-choice' : ''}"><input type="radio" name="choice" value="${index}" ${session.selected === index ? 'checked' : ''} ${answer ? 'disabled' : ''}/><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHTML(choice)}</span>${answer && index === question.answer ? '<b class="choice-mark">正解</b>' : answer && session.selected === index ? '<b class="choice-mark">選択</b>' : ''}</label>`).join('')}</fieldset>
      <fieldset class="confidence-field" ${answer ? 'disabled' : ''}><legend>今の自信は？</legend><div class="confidence-options">${[['high','自信あり'],['medium','少し迷う'],['low','自信が低い'],['unsure','迷った']].map(([value,label]) => `<label><input type="radio" name="confidence" value="${value}" ${session.confidence === value ? 'checked' : ''} ${answer ? 'disabled' : ''}/><span>${label}</span></label>`).join('')}</div></fieldset>
      ${!answer ? `<button class="button primary answer-submit" type="submit" ${session.selected === null ? 'disabled' : ''}>回答する <span aria-hidden="true">↵</span></button>` : '<button type="button" class="button primary answer-submit" data-action="next-question">次の問題へ →</button>'}</form>
      ${answer ? renderAnswerFeedback(question, answer, note) : ''}
    </article>
    ${ui.reportId === question.id ? renderReportForm(question) : ''}`;
}

function modeLabel(mode) { return ({ all: 'すべて', unanswered: '未回答', wrong: '誤答', bookmarked: 'ブックマーク', due: '復習候補', weak: '苦手候補', single: '選択した問題', quick: '短時間学習' })[mode] || '問題演習'; }
function renderQuizSetup() {
  const due = reviewCandidates();
  return `${pageHeading('問題演習', '一問ずつ、考え方を確かめる。', '回答、自信度、正誤を記録し、間違えた理由や次の復習につなげます。')}
    <div class="quiz-setup-layout"><section class="surface-card quiz-setup-card"><p class="eyebrow">出題内容を選ぶ</p><h2>今日の練習を決めましょう</h2><form id="quiz-start-form" class="stack-form">
      <label>出題対象<select name="mode"><option value="all">すべての問題</option><option value="unanswered">未回答</option><option value="wrong">一度でも間違えた問題</option><option value="bookmarked">ブックマークした問題</option><option value="due">復習候補</option><option value="weak">苦手候補</option></select></label>
      <div class="form-two"><label>分野<select name="field"><option value="all">すべて</option>${[...questionsByField().keys()].map(field => `<option>${escapeHTML(field)}</option>`).join('')}</select></label><label>難易度<select name="difficulty"><option value="all">すべて</option>${[...new Set(questionBank.map(q => q.difficulty))].map(value => `<option>${escapeHTML(value)}</option>`).join('')}</select></label></div>
      <label>問題数<select name="count"><option value="3">3問</option><option value="5" selected>5問</option><option value="8">すべて（最大8問）</option></select></label>
      <button class="button primary" type="submit">この条件で始める →</button>
      <p class="small-note">候補が少ないときは、条件を広げて問題を選びます。回答数の少なさだけで苦手と判定しません。</p>
    </form></section>
    <aside class="surface-card quick-session-card"><p class="eyebrow">短時間学習</p><h2>5分・10分だけ取り組む</h2><p>未回答や復習候補から、短い問題セットを作ります。回答のたびに履歴が保存されます。</p><div class="quick-buttons"><button type="button" class="button secondary" data-short-session="5">5分 · 3問まで</button><button type="button" class="button secondary" data-short-session="10">10分 · 6問まで</button></div><div class="quick-divider"></div><p class="eyebrow">今の復習候補</p><div class="quick-stat"><strong>${due.length}</strong><span>問</span><small>${due.length ? '直近の誤答・自信度・予定日をもとに抽出' : '回答後に候補が表示されます'}</small></div><a class="text-link" href="#review">抽出理由を見る →</a></aside></div>
    <section class="surface-card question-bank-card"><div class="card-heading"><div><p class="eyebrow">収録中の問題</p><h2>${questionBank.length}問</h2></div>${statusPill('専門家校閲なし', 'amber')}</div><div class="question-bank-list">${questionBank.map(q => `<button type="button" class="bank-item" data-start-question="${escapeHTML(q.id)}"><span class="bank-item-index">${escapeHTML(q.id.replace('q-',''))}</span><span><strong>${escapeHTML(q.prompt)}</strong><small>${escapeHTML(q.field)} · ${escapeHTML(q.difficulty)} · ${sourceLabel(q.source)}</small></span><b>→</b></button>`).join('')}</div><p class="small-note">本書に直接基づく問題と、出典を明示した補足問題を分けています。</p></section>`;
}

function renderQuestionFigure(figure) {
  if (figure.kind === 'app-created') return `<figure class="question-figure"><div class="wall-diagram" role="img" aria-label="${escapeHTML(figure.alt)}"><div class="wall-temp hot"><span>Tₕ</span><small>高温</small></div><div class="wall-body"><span class="heat-arrow">Q̇　→</span><span class="wall-label">平板</span><span class="wall-thickness">L</span><span class="wall-gradient">Tₕ　····→　T𝑐</span></div><div class="wall-temp cold"><span>T𝑐</span><small>低温</small></div><div class="wall-delta">ΔT = Tₕ − T𝑐</div></div><figcaption>${escapeHTML(figure.caption)}<span>${escapeHTML(figure.alt)}</span></figcaption></figure>`;
  return `<figure class="question-figure"><div class="figure-placeholder" role="img" aria-label="${escapeHTML(figure.alt)}">図の説明を表示しています</div><figcaption>${escapeHTML(figure.caption)}<span>${escapeHTML(figure.alt)}</span></figcaption></figure>`;
}

function renderAnswerFeedback(question, answer, existingNote) {
  const correct = answer.correct;
  const sourceAction = question.source.type === 'book' ? `<button type="button" class="text-link" data-section="${escapeHTML(question.source.section)}">第${escapeHTML(question.source.section)}節の本文へ（書籍 p.${escapeHTML(question.source.bookPages)} / PDF p.${escapeHTML(question.source.pdfPages)}）→</button>` : `<div class="source-ref">${sourceLabel(question.source)}<br>該当箇所のページと式番号は原本照合待ちです。書籍の記述としては扱っていません。</div>`;
  const reasons = question.distractors.map((text,index) => `<li class="${index === question.answer ? 'is-correct' : ''}"><strong>${String.fromCharCode(65 + index)} ${index === question.answer ? '正解' : '誤答'}</strong><p>${escapeHTML(text)}</p></li>`).join('');
  return `<section class="answer-feedback ${correct ? 'feedback-correct' : 'feedback-wrong'}" aria-live="polite"><div class="feedback-title"><span class="feedback-symbol">${correct ? '✓' : '!'}</span><div><strong>${correct ? '正解です' : '今回は不正解です'}</strong><small>自信度：${confidenceLabel(answer.confidence)} · ${formatTime(answer.at)}</small></div></div>
    <div class="explanation-block"><h3>何を問う問題だった？</h3><p>${escapeHTML(question.prompt)}</p><h3>正解へ至る考え方</h3><p>${escapeHTML(question.explanation)}</p></div>
    <details class="distractor-details" open><summary>4つの選択肢を確認する</summary><ol>${reasons}</ol></details><div class="answer-source"><strong>関連する出典</strong>${sourceAction}</div>
    <form class="mistake-note-form" id="mistake-note-form"><p class="eyebrow">間違いノート</p><h3>次に同じ問題を解くときのために</h3><div class="form-two"><label>間違えた理由（任意）<textarea name="reason" rows="2" maxlength="500" placeholder="例：分母にある量を見落とした">${escapeHTML(existingNote.reason || '')}</textarea></label><label>自分向けの覚え方（任意）<textarea name="memory" rows="2" maxlength="500" placeholder="例：厚さが増えると熱の通り道が長くなる">${escapeHTML(existingNote.memory || '')}</textarea></label></div><label>次に注意すること（任意）<textarea name="nextTime" rows="2" maxlength="500" placeholder="例：式を書いてから選択肢を見る">${escapeHTML(existingNote.nextTime || '')}</textarea></label><button type="submit" class="button secondary">間違いノートを保存</button>${existingNote.updatedAt ? `<small>保存済み · ${formatDate(existingNote.updatedAt.slice(0,10))}</small>` : ''}</form></section>`;
}
function confidenceLabel(value) { return ({ high: '自信あり', medium: '少し迷う', low: '自信が低い', unsure: '迷った' })[value] || '未記録'; }
function renderReportForm(question) {
  const history = state.questionReports[question.id] || [];
  return `<div class="modal-backdrop" role="presentation"><section class="report-modal surface-card" role="dialog" aria-modal="true" aria-labelledby="report-title"><button class="modal-close" type="button" data-action="close-report" aria-label="閉じる">×</button><p class="eyebrow">問題の品質報告</p><h2 id="report-title">気になるところを教えてください</h2><p class="report-question-preview">${escapeHTML(question.prompt)}</p><form id="report-form"><label>報告内容<select name="category"><option value="ambiguous">条件が不足・曖昧</option><option value="answer">正解や解説に誤りがある</option><option value="source">出典やページが違う</option><option value="figure">図・代替説明に問題がある</option><option value="other">その他</option></select></label><label>具体的な内容<textarea name="message" rows="4" maxlength="1000" placeholder="どの箇所が、なぜ問題かを書いてください" required></textarea></label><button class="button primary" type="submit">この端末に報告を保存</button></form>${history.length ? `<div class="report-history"><strong>この端末での報告履歴：${history.length}件</strong>${history.slice(-3).reverse().map(item => `<small>${formatDate(item.at.slice(0,10))} · ${escapeHTML(item.category)} · ${escapeHTML(item.message)}</small>`).join('')}</div>` : '<p class="small-note">報告はこの端末にだけ保存され、外部へ送信されません。</p>'}</section></div>`;
}

function renderQuizResult() {
  const result = ui.quizResult;
  const percent = result.total ? Math.round(result.correct / result.total * 100) : 0;
  const wrong = result.answers.filter(answer => !answer.correct);
  const fields = new Map();
  for (const answer of result.answers) { const q = getQuestion(answer.questionId); if (!q) continue; const current = fields.get(q.field) || { total: 0, correct: 0 }; current.total++; current.correct += answer.correct ? 1 : 0; fields.set(q.field, current); }
  return `${pageHeading('学習のふり返り', '一回分の記録を確認する。', `${formatDate(result.date)}　·　${Math.round((result.finishedAt - result.startedAt) / 60000)}分`) }
    <section class="surface-card session-result"><div class="result-score"><div class="score-circle" style="--score:${percent}%"><strong>${percent}%</strong><span>正答率</span></div><div><p class="eyebrow">今回の演習</p><h2>${result.total}問に回答しました</h2><p>${result.correct}問正解 · ${result.total - result.correct}問不正解 · 自信が低い回答 ${result.answers.filter(item => ['low','unsure'].includes(item.confidence)).length}問</p></div></div>
      <div class="session-field-list"><h3>分野別の結果</h3>${[...fields.entries()].map(([field,value]) => `<div class="field-result-row"><span>${escapeHTML(field)}</span><div class="mini-bar"><i style="width:${Math.round(value.correct/value.total*100)}%"></i></div><strong>${value.correct}/${value.total}</strong></div>`).join('')}</div>
      <div class="next-review-callout"><span class="action-icon amber">↻</span><div><strong>次の復習予定</strong><p>正誤と自信度に応じて、問題ごとに復習日を提案しています。予定は復習画面で変更できます。</p></div><a class="button secondary" href="#review">復習を確認</a></div>
      ${wrong.length ? `<div class="wrong-retry-list"><h3>間違えた問題</h3>${wrong.map(item => { const q=getQuestion(item.questionId); return `<button type="button" data-start-question="${escapeHTML(q.id)}"><span>${escapeHTML(q.prompt)}</span><b>再挑戦 →</b></button>`; }).join('')}<button type="button" class="button primary" data-start-ids='${escapeHTML(JSON.stringify(wrong.map(item=>item.questionId)))}'>間違い問題にまとめて再挑戦</button></div>` : '<div class="success-callout"><strong>今回の問題はすべて正解です。</strong><span>自信が低い問題は復習候補に入る場合があります。</span></div>'}
      <div class="button-row result-actions"><button class="button primary" type="button" data-action="again-quiz">別の問題を解く</button><a class="button secondary" href="#home">学習ホームへ</a></div></section>`;
}

function renderReview() {
  const items = reviewCandidates(); const due = items.filter(item => item.due <= todayISO()).length;
  return `${pageHeading('復習と間違いノート', '覚え直すタイミングを逃さない。', '直近の誤答、繰り返しの誤答、低い正答率、自信度、復習予定から候補を抽出します。', items.length ? '<button type="button" class="button primary" data-action="start-review">復習セットを始める →</button>' : '')}
    <div class="review-summary-grid"><div class="surface-card review-stat"><span>復習予定日を過ぎた問題</span><strong>${due}</strong><small>今日 ${todayISO()}</small></div><div class="surface-card review-stat"><span>復習候補</span><strong>${items.length}</strong><small>抽出理由を各問題に表示</small></div><div class="surface-card review-stat"><span>間違いノート</span><strong>${Object.keys(state.mistakeNotes).length}</strong><small>自分向けの覚え方も記録</small></div></div>
    <section class="surface-card review-method"><p><strong>候補の目安：</strong>直近の誤答、2回以上の誤答、3回以上の回答で正答率60%未満、または直近の自信が低い・迷った回答を候補にします。復習日を過ぎた問題も表示します。回答数が少ないことだけを理由に苦手とは判定しません。</p></section>
    ${items.length ? `<div class="review-list">${items.map(item => `<article class="review-item surface-card"><div class="review-item-heading"><div><p class="eyebrow">${escapeHTML(item.question.field)} · ${escapeHTML(item.question.difficulty)}</p><h2>${escapeHTML(item.question.prompt)}</h2></div>${statusPill(item.due <= todayISO() ? '復習時期' : `予定 ${formatDate(item.due)}`, item.due <= todayISO() ? 'amber' : 'blue')}</div><div class="reason-tags">${item.reasons.map(reason => statusPill(escapeHTML(reason), 'neutral')).join('')}</div><div class="review-data"><span>${item.attempts}回回答</span><span>${item.accuracy === null ? '正答率 —' : `正答率 ${Math.round(item.accuracy * 100)}%`}</span><span>出典：${sourceLabel(item.question.source)}</span></div>${state.mistakeNotes[item.question.id] ? `<div class="saved-mistake"><strong>自分のメモ</strong><p>${escapeHTML(state.mistakeNotes[item.question.id].reason || '理由の記録なし')}</p>${state.mistakeNotes[item.question.id].memory ? `<p>覚え方：${escapeHTML(state.mistakeNotes[item.question.id].memory)}</p>` : ''}</div>` : '<p class="small-note">間違いノートは問題に回答した後に記録できます。</p>'}<div class="review-item-actions"><button type="button" class="button primary" data-start-question="${escapeHTML(item.question.id)}">この問題を解き直す</button><label class="reschedule-label">復習日を変更<input type="date" data-review-date="${escapeHTML(item.question.id)}" value="${escapeHTML(item.due === '9999-12-31' ? todayISO() : item.due)}" min="${todayISO()}"/></label><button type="button" class="text-button" data-complete-review="${escapeHTML(item.question.id)}">復習を完了</button></div></article>`).join('')}</div>` : `<div class="empty-state surface-card"><span class="empty-mark">↻</span><h2>復習候補はまだありません</h2><p>問題を解くと、誤答や自信度をもとに復習候補ができます。正解しても自信が低いときは、復習候補になります。</p><a class="button primary" href="#quiz">問題演習を始める</a></div>`}
    <section class="surface-card session-history"><div class="card-heading"><div><p class="eyebrow">間違いノート</p><h2>記録した理由と覚え方</h2></div></div>${Object.keys(state.mistakeNotes).length ? Object.entries(state.mistakeNotes).map(([id,note]) => { const q=getQuestion(id); return q ? `<div class="mistake-summary"><strong>${escapeHTML(q.prompt)}</strong><p>${escapeHTML(note.reason || '理由は未記入')} ${note.memory ? ` · 覚え方：${escapeHTML(note.memory)}` : ''}</p><button type="button" class="text-link" data-start-question="${escapeHTML(id)}">再挑戦 →</button></div>` : ''; }).join('') : '<p class="muted">回答後に、間違えた理由や次に注意することをここで確認できます。</p>'}</section>`;
}

function startQuiz(options = {}) {
  const mode = options.mode || 'all';
  let candidates = [...questionBank];
  if (options.questionIds) candidates = candidates.filter(q => options.questionIds.includes(q.id));
  else if (mode === 'unanswered') candidates = candidates.filter(q => getAttemptStats(q.id).attempts.length === 0);
  else if (mode === 'wrong') candidates = candidates.filter(q => getAttemptStats(q.id).attempts.some(attempt => !attempt.correct));
  else if (mode === 'bookmarked') candidates = candidates.filter(q => state.questionBookmarks.includes(q.id));
  else if (mode === 'due' || mode === 'weak' || mode === 'review') {
    const ids = new Set(reviewCandidates().filter(item => mode !== 'due' || item.due <= todayISO()).map(item => item.question.id));
    candidates = candidates.filter(q => ids.has(q.id));
  }
  if (options.field && options.field !== 'all') candidates = candidates.filter(q => q.field === options.field);
  if (options.difficulty && options.difficulty !== 'all') candidates = candidates.filter(q => q.difficulty === options.difficulty);
  if (options.questionId) candidates = candidates.filter(q => q.id === options.questionId);
  if (mode === 'due' || mode === 'weak' || mode === 'review') {
    const rank = new Map(reviewCandidates().map((item,index) => [item.question.id,index]));
    candidates.sort((a,b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  } else candidates = shuffle(candidates);
  const count = Math.max(1, Math.min(Number(options.count || candidates.length || 1), candidates.length));
  const selected = candidates.slice(0, count).map(q => q.id);
  if (!selected.length) { showStatus('この条件に合う問題はありません。対象や分野を広げてください。'); return; }
  ui.quizResult = null;
  ui.quiz = { ids: selected, index: 0, mode, field: options.field || 'all', difficulty: options.difficulty || 'all', startedAt: Date.now(), answers: [], selected: null, confidence: 'medium', hintCount: 0, quickMinutes: options.quickMinutes || null };
  setRoute('quiz');
}
function shuffle(values) { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function startQuickSession(minutes) {
  const limit = minutes === 5 ? 3 : 6;
  let ids = reviewCandidates().filter(item => item.due <= todayISO()).map(item => item.question.id);
  const unseen = questionBank.filter(q => getAttemptStats(q.id).attempts.length === 0).map(q => q.id);
  ids = [...new Set([...ids, ...unseen])];
  if (ids.length < limit) ids = [...new Set([...ids, ...shuffle(questionBank.map(q => q.id))])];
  startQuiz({ mode: 'quick', questionIds: shuffle(ids).slice(0, limit), count: limit, quickMinutes: minutes });
}
function submitQuizAnswer(form) {
  if (!ui.quiz) return;
  const session = ui.quiz;
  if (session.answers[session.index]) return;
  const question = getQuestion(session.ids[session.index]);
  if (!question || session.selected === null) { showStatus('選択肢を一つ選んでから回答してください。'); return; }
  const answer = { questionId: question.id, selected: session.selected, correct: session.selected === question.answer, confidence: session.confidence || 'medium', at: new Date().toISOString(), mode: session.mode };
  session.answers[session.index] = answer;
  state.attempts.push({ ...answer, id: makeId() });
  const interval = !answer.correct ? 1 : answer.confidence === 'high' ? 7 : answer.confidence === 'medium' ? 4 : 1;
  state.reviews[question.id] = { ...(state.reviews[question.id] || {}), dueDate: addDaysISO(todayISO(), interval), suggestedDays: interval, lastAnsweredAt: answer.at };
  saveState(); ui.reportMessage = ''; render();
}
function moveToNextQuestion() {
  if (!ui.quiz || !ui.quiz.answers[ui.quiz.index]) return;
  if (ui.quiz.index < ui.quiz.ids.length - 1) {
    ui.quiz.index++;
    ui.quiz.selected = null; ui.quiz.confidence = 'medium'; ui.quiz.hintCount = 0;
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const session = ui.quiz;
  const answers = session.answers.filter(Boolean);
  const result = { date: todayISO(), startedAt: session.startedAt, finishedAt: Date.now(), total: answers.length, correct: answers.filter(item => item.correct).length, answers };
  state.sessions.push({ ...result, id: makeId() }); saveState();
  ui.quiz = null; ui.quizResult = result; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function makeId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
function addDaysISO(day, count) { const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() + count); return todayISO(date); }

function onClick(event) {
  const languageButton = event.target.closest('[data-language]');
  if (languageButton) {
    if (languageButton.disabled || !['ja', 'en'].includes(languageButton.dataset.language)) return;
    state.settings.contentLanguage = languageButton.dataset.language;
    saveState();
    const scrollY = window.scrollY;
    render();
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    document.querySelector(`[data-language="${languageButton.dataset.language}"]`)?.focus();
    return;
  }
  const sectionTrigger = event.target.closest('[data-section]');
  if (sectionTrigger) {
    event.preventDefault();
    ui.readerSection = sectionTrigger.dataset.section; state.lastSection = sectionTrigger.dataset.section; saveState(); ui.quiz = null; ui.quizResult = null; setRoute('reader');
    const y = state.readerPositions[ui.readerSection]; if (y) setTimeout(() => window.scrollTo({ top: y, behavior: 'smooth' }), 70);
    return;
  }
  const mapTrigger = event.target.closest('[data-map-field]');
  if (mapTrigger) { event.preventDefault(); startQuiz({ mode: 'all', field: mapTrigger.dataset.mapField, count: 8 }); return; }
  const openSection = event.target.closest('[data-open-section]');
  if (openSection) { event.preventDefault(); ui.readerSection = openSection.dataset.openSection; setRoute('reader'); return; }
  const short = event.target.closest('[data-short-session]'); if (short) { event.preventDefault(); startQuickSession(Number(short.dataset.shortSession)); return; }
  const startQuestion = event.target.closest('[data-start-question]'); if (startQuestion) { event.preventDefault(); startQuiz({ mode: 'single', questionId: startQuestion.dataset.startQuestion, count: 1 }); return; }
  const startIds = event.target.closest('[data-start-ids]'); if (startIds) { event.preventDefault(); try { startQuiz({ mode: 'wrong', questionIds: JSON.parse(startIds.dataset.startIds), count: 8 }); } catch { showStatus('問題セットを読み込めませんでした。'); } return; }
  const target = event.target.closest('[data-search-target]'); if (target) { event.preventDefault(); try { const item=JSON.parse(target.dataset.searchTarget); if (item.section) ui.readerSection=item.section; if (item.language && ['ja','en'].includes(item.language)) { state.settings.contentLanguage=item.language; saveState(); } if (item.question) { startQuiz({ mode:'single', questionId:item.question, count:1 }); return; } if (item.term) { ui.glossaryQuery=''; setRoute('glossary'); setTimeout(()=>document.getElementById(`term-${item.term}`)?.scrollIntoView({behavior:'smooth',block:'center'}),80); return; } if (item.route) setRoute(item.route); } catch { showStatus('検索先を開けませんでした。'); } return; }
  const bookmarkToggle = event.target.closest('[data-question-bookmark]'); if (bookmarkToggle) { const id=bookmarkToggle.dataset.questionBookmark; state.questionBookmarks = state.questionBookmarks.includes(id) ? state.questionBookmarks.filter(item=>item!==id) : [...state.questionBookmarks,id]; saveState(); render(); showStatus(state.questionBookmarks.includes(id) ? '問題をブックマークしました。' : '問題ブックマークを外しました。'); return; }
  const deleteBookmark = event.target.closest('[data-delete-bookmark]'); if (deleteBookmark) { state.bookmarks=state.bookmarks.filter(item=>item.id!==deleteBookmark.dataset.deleteBookmark); saveState(); render(); return; }
  const deleteNote = event.target.closest('[data-delete-note]'); if (deleteNote) { state.notes=state.notes.filter(item=>item.id!==deleteNote.dataset.deleteNote); saveState(); render(); showStatus('学習メモを削除しました。'); return; }
  const calendarDay = event.target.closest('[data-date]'); if (calendarDay) { ui.calendarDate=calendarDay.dataset.date; render(); return; }
  const completeReview = event.target.closest('[data-complete-review]'); if (completeReview) { const id=completeReview.dataset.completeReview; state.completedReviews[id]=new Date().toISOString(); state.reviews[id]={...(state.reviews[id]||{}), lastReviewedAt:state.completedReviews[id], dueDate:addDaysISO(todayISO(),3), suggestedDays:3}; saveState(); render(); showStatus('復習を記録しました。次の予定は3日後です。'); return; }
  const simMode = event.target.closest('[data-sim-mode]'); if (simMode) { ui.simMode=simMode.dataset.simMode; render(); return; }
  const actionButton = event.target.closest('[data-action]'); if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === 'toggle-theme') { const effective = state.settings.theme === 'system' ? (systemDark?.matches?'dark':'light') : state.settings.theme; state.settings.theme=effective==='dark'?'light':'dark'; saveState(); render(); }
  else if (action === 'reader-font-up') { state.settings.fontScale=Math.min(1.4,Number((state.settings.fontScale+0.05).toFixed(2))); saveState(); render(); }
  else if (action === 'reader-font-down') { state.settings.fontScale=Math.max(0.9,Number((state.settings.fontScale-0.05).toFixed(2))); saveState(); render(); }
  else if (action === 'reader-width') { state.settings.width=state.settings.width==='reading'?'wide':'reading'; saveState(); render(); }
  else if (action === 'reader-line') { const values=[1.6,1.8,2,2.2]; const index=values.findIndex(value=>Math.abs(value-state.settings.lineHeight)<0.06); state.settings.lineHeight=values[(index+1)%values.length]; saveState(); render(); }
  else if (action === 'toggle-read') { state.readSections[ui.readerSection]=!state.readSections[ui.readerSection]; saveState(); render(); }
  else if (action === 'speak') speakSection();
  else if (action === 'stop-speech') { window.speechSynthesis?.cancel(); showStatus('読み上げを停止しました。'); }
  else if (action === 'clear-search') { ui.search.query=''; ui.searchResults=[]; render(); document.querySelector('#search-query')?.focus(); }
  else if (action === 'reveal-hint') { if (ui.quiz) { const q=getQuestion(ui.quiz.ids[ui.quiz.index]); const max=(q.solutionSteps||q.hints||[]).length; ui.quiz.hintCount=Math.min(max,ui.quiz.hintCount+1); render(); } }
  else if (action === 'next-question') moveToNextQuestion();
  else if (action === 'open-report') { ui.reportId=actionButton.dataset.reportId || getQuestion(ui.quiz?.ids[ui.quiz.index])?.id; render(); }
  else if (action === 'close-report') { ui.reportId=null; render(); }
  else if (action === 'exit-quiz') { ui.quiz=null; ui.quizResult=null; setRoute('quiz'); }
  else if (action === 'start-review') startQuiz({ mode:'review', count:8 });
  else if (action === 'again-quiz') { ui.quizResult=null; setRoute('quiz'); }
  else if (action === 'stop-plan') { state.plan.active=false; saveState(); render(); showStatus('学習計画を停止しました。'); }
  else if (action === 'calendar-prev' || action === 'calendar-next') { const date=new Date(`${ui.calendarDate}T12:00:00`); date.setMonth(date.getMonth()+(action==='calendar-prev'?-1:1)); ui.calendarDate=todayISO(date); render(); }
  else if (action === 'save-comparison') { const result=calculateSimulation(ui.simMode,simRead(ui.simMode)); if(result.error){showStatus(result.error);return;} state.simComparisons[ui.simMode]={...simRead(ui.simMode)}; saveState(); render(); showStatus('比較用の条件を保存しました。'); }
  else if (action === 'clear-comparison') { delete state.simComparisons[ui.simMode]; saveState(); render(); }
  else if (action === 'export-data') exportData();
  else if (action === 'import-merge') importData(false);
  else if (action === 'import-replace') importData(true);
}

function onSubmit(event) {
  const form=event.target;
  if (!form.id) return;
  if (form.id === 'search-form') { event.preventDefault(); searchNow(form); }
  else if (form.id === 'quiz-start-form') { event.preventDefault(); const data=new FormData(form); startQuiz({mode:String(data.get('mode')),field:String(data.get('field')),difficulty:String(data.get('difficulty')),count:Number(data.get('count'))}); }
  else if (form.id === 'quiz-answer-form') { event.preventDefault(); submitQuizAnswer(form); }
  else if (form.id === 'mistake-note-form') { event.preventDefault(); saveMistakeNote(form); }
  else if (form.id === 'report-form') { event.preventDefault(); saveQuestionReport(form); }
  else if (form.id === 'bookmark-form') { event.preventDefault(); saveBookmark(form); }
  else if (form.id === 'reader-note-form') { event.preventDefault(); saveReaderNote(form); }
  else if (form.id === 'plan-form') { event.preventDefault(); savePlan(form); }
  else if (form.id === 'sim-form') { event.preventDefault(); }
}

function onChange(event) {
  const target=event.target;
  if (target.name === 'choice' && ui.quiz) { ui.quiz.selected=Number(target.value); render(); }
  else if (target.name === 'confidence' && ui.quiz) { ui.quiz.confidence=target.value; render(); }
  else if (target.name === 'theme') { state.settings.theme=target.value; saveState(); render(); }
  else if (target.name === 'fontScale') { state.settings.fontScale=Number(target.value); saveState(); document.documentElement.style.setProperty('--reader-scale',String(state.settings.fontScale)); const label=target.parentElement.querySelector('strong'); if(label)label.textContent=`${Math.round(state.settings.fontScale*100)}%`; }
  else if (target.name === 'lineHeight') { state.settings.lineHeight=Number(target.value); saveState(); document.documentElement.style.setProperty('--reader-line-height',String(state.settings.lineHeight)); const label=target.parentElement.querySelector('strong'); if(label)label.textContent=Number(state.settings.lineHeight).toFixed(1); }
  else if (target.dataset.reviewDate) { const id=target.dataset.reviewDate; state.reviews[id]={...(state.reviews[id]||{}),dueDate:target.value,suggestedDays:null}; saveState(); render(); showStatus(`復習日を${formatDate(target.value)}に変更しました。`); }
  else if (target.dataset.date) { ui.calendarDate=target.dataset.date; render(); }
  else if (target.id === 'import-file' && target.files?.[0]) readImportFile(target.files[0]);
  else if (target.name && ['k','area','thickness','hot','cold','h','surface','fluid','emissivity','surrounding'].includes(target.name)) { ui.simValues[ui.simMode][target.name]=target.value; renderSimulatorOutputsOnly(); }
}
function onInput(event) {
  const target=event.target;
  if (target.id === 'glossary-query') { ui.glossaryQuery=target.value; const at=target.selectionStart; render(); const field=document.getElementById('glossary-query'); field?.focus(); field?.setSelectionRange(at,at); }
  else if (target.name && ['k','area','thickness','hot','cold','h','surface','fluid','emissivity','surrounding'].includes(target.name)) { ui.simValues[ui.simMode][target.name]=target.value; renderSimulatorOutputsOnly(); }
}
function renderSimulatorOutputsOnly() {
  if (ui.route !== 'simulator') return;
  const temporary=document.createElement('div'); temporary.innerHTML=renderSimulator();
  const output=temporary.querySelector('.sim-output-card'); const current=document.querySelector('.sim-output-card');
  if(output&&current) current.replaceWith(output);
}

function speakSection() {
  const section=getSection(ui.readerSection);
  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) { showStatus('このブラウザーは読み上げに対応していません。文字サイズと行間を設定から調整できます。'); return; }
  const language = state.settings.contentLanguage === 'en' && Array.isArray(section?.blocksEn) ? 'en' : 'ja';
  const blocks = language === 'en' ? section.blocksEn : section?.blocks;
  if (!blocks) { showStatus('この節にはまだ読み上げ可能な本文がありません。'); return; }
  const text=blocks.map(block=>[block.text,block.title,...(block.items||[])].filter(Boolean).join(' ')).join(' ');
  if (!text.trim()) { showStatus('読み上げる本文がありません。'); return; }
  window.speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(text); utterance.lang=language === 'en' ? 'en-US' : 'ja-JP'; utterance.rate=0.92;
  utterance.onerror=()=>showStatus('読み上げを開始できませんでした。端末の音声機能を確認してください。');
  try { window.speechSynthesis.speak(utterance); showStatus('読み上げを開始しました。'); } catch { showStatus('このブラウザーは読み上げに対応していません。'); }
}

function saveBookmark(form) {
  const note=String(new FormData(form).get('note')||'').trim();
  state.bookmarks.push({id:makeId(),sectionId:ui.readerSection,note,createdAt:new Date().toISOString(),position:state.readerPositions[ui.readerSection]||window.scrollY});
  saveState(); render(); showStatus('本文のしおりを保存しました。');
}
function saveReaderNote(form) {
  const data=new FormData(form); const text=String(data.get('text')||'').trim();
  if(!text){showStatus('メモの本文を入力してください。');return;}
  state.notes.push({id:makeId(),title:String(data.get('title')||'').trim(),text,sectionId:ui.readerSection,chapter:ui.readerSection.split('.')[0],createdAt:new Date().toISOString()});
  saveState(); render(); showStatus('学習メモを保存しました。');
}
function saveMistakeNote(form) {
  const questionId=ui.quiz?.ids[ui.quiz.index]; if(!questionId)return;
  const data=new FormData(form);
  state.mistakeNotes[questionId]={reason:String(data.get('reason')||'').trim(),memory:String(data.get('memory')||'').trim(),nextTime:String(data.get('nextTime')||'').trim(),updatedAt:new Date().toISOString()};
  saveState(); render(); showStatus('間違いノートを保存しました。');
}
function saveQuestionReport(form) {
  const id=ui.reportId; if(!id)return;
  const data=new FormData(form); const report={category:String(data.get('category')),message:String(data.get('message')||'').trim(),at:new Date().toISOString()};
  if(!report.message){showStatus('具体的な内容を入力してください。');return;}
  state.questionReports[id]=[...(state.questionReports[id]||[]),report]; saveState(); ui.reportId=null; render(); showStatus('報告をこの端末に保存しました。外部へは送信していません。');
}
function savePlan(form) {
  const data=new FormData(form); const goal=String(data.get('goal')||'').trim(); const targetDate=String(data.get('targetDate')||''); const minutesPerDay=Number(data.get('minutesPerDay'));
  if(!goal){showStatus('学習目標を入力してください。');return;}
  if(targetDate && targetDate<todayISO()){showStatus('目標日は今日以降の日付を選んでください。');return;}
  state.plan={goal,targetDate,minutesPerDay:Math.max(5,Math.min(60,minutesPerDay||15)),active:true,updatedAt:new Date().toISOString()}; saveState(); render(); showStatus('学習計画を保存しました。');
}

function exportData() {
  const payload={...state,schemaVersion:1,exportedAt:new Date().toISOString(),format:'heat-study-ja-learning-data'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`heat-study-ja-${todayISO()}.json`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); showStatus('学習データを書き出しました。');
}
function readImportFile(file) {
  const reader=new FileReader();
  reader.onload=()=>{
    try { const data=JSON.parse(String(reader.result)); const problem=validateImport(data); ui.importDraft=problem?{error:problem}:{data}; }
    catch { ui.importDraft={error:'JSONを読み取れませんでした。UTF-8形式の学習データを選んでください。'}; }
    render();
  };
  reader.onerror=()=>{ui.importDraft={error:'選択したファイルを読み込めませんでした。'};render();};
  reader.readAsText(file,'UTF-8');
}
function validateImport(data) {
  if (!data || typeof data !== 'object' || data.format !== 'heat-study-ja-learning-data' || data.schemaVersion !== 1) return 'このファイルは対応する学習データ形式ではありません。現在の記録は変更していません。';
  if (!Array.isArray(data.attempts) || !Array.isArray(data.bookmarks) || !Array.isArray(data.questionBookmarks) || !Array.isArray(data.sessions) || typeof data.mistakeNotes !== 'object' || typeof data.settings !== 'object' || typeof data.plan !== 'object') return '必要な項目が不足しているか、形式が異なります。現在の記録は変更していません。';
  if (data.attempts.length > 100000 || data.bookmarks.length > 20000 || data.sessions.length > 20000) return 'データ件数が上限を超えています。現在の記録は変更していません。';
  for (const attempt of data.attempts) if (!attempt || typeof attempt.questionId!=='string' || typeof attempt.correct!=='boolean' || typeof attempt.at!=='string') return '回答履歴の形式が正しくありません。現在の記録は変更していません。';
  for (const bookmark of data.bookmarks) if (!bookmark || typeof bookmark.sectionId!=='string' || typeof bookmark.note!=='string') return 'しおりの形式が正しくありません。現在の記録は変更していません。';
  return '';
}
function importData(replace) {
  if (!ui.importDraft?.data) return;
  const data=ui.importDraft.data;
  if (replace) {
    if (!window.confirm('この端末にある学習記録を、選択したファイルの内容に置き換えます。続けますか？')) return;
    const clean=emptyState(); state={...clean,...data,format:undefined,exportedAt:undefined,schemaVersion:1};
  } else {
    const importedAttempts=data.attempts.map(item=>({...item,id:item.id||makeId()}));
    state={...state,...data,attempts:mergeById(state.attempts,importedAttempts),sessions:mergeById(state.sessions,data.sessions||[]),bookmarks:mergeById(state.bookmarks,data.bookmarks),questionBookmarks:[...new Set([...state.questionBookmarks,...data.questionBookmarks])],mistakeNotes:{...state.mistakeNotes,...data.mistakeNotes},questionReports:{...state.questionReports,...(data.questionReports||{})},reviews:{...state.reviews,...(data.reviews||{})},completedReviews:{...state.completedReviews,...(data.completedReviews||{})},notes:mergeById(state.notes,data.notes||[]),settings:{...state.settings,...data.settings},plan:{...state.plan,...data.plan}};
  }
  saveState(); ui.importDraft=null; render(); showStatus(replace?'学習データを置き換えました。':'学習データを追加・更新しました。');
}
function mergeById(existing,incoming) { const map=new Map(); for(const item of [...existing,...incoming]) map.set(item.id||JSON.stringify(item),item); return [...map.values()]; }

function onKeyDown(event) {
  if (ui.route !== 'quiz' || !ui.quiz || event.altKey || event.ctrlKey || event.metaKey) return;
  const target=event.target; if(target && (target.matches('input,textarea,select,[contenteditable="true"]') || target.isContentEditable)) return;
  const session=ui.quiz; const answered=Boolean(session.answers[session.index]);
  if(!answered && /^[1-4]$/.test(event.key)){event.preventDefault();session.selected=Number(event.key)-1;render();document.querySelectorAll('.answer-choice input')[session.selected]?.focus();}
  else if(event.key==='Enter' && !answered && session.selected!==null){event.preventDefault();document.querySelector('#quiz-answer-form')?.requestSubmit();}
}

startApp();
