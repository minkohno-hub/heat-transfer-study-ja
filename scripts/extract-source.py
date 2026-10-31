"""Extract local source text and build a conservative 76-section audit ledger.

The extracted English is never a verified translation or proof of mathematical
fidelity. Pages shared by sections remain explicit review items. Book text stays
under the ignored data/source directory; the public ledger contains metadata only.
"""
import argparse
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def blocks(data):
    return data if isinstance(data, list) else data.get('blocks', [])


def build_ledger(book, manifest):
    source = ROOT / 'data/source'
    sections = [(chapter, section) for chapter in book['chapters'] for section in chapter['sections']]
    content_files = read(ROOT / 'data/content-manifest.json')['files']
    local_manifest = ROOT / 'data/local-content-manifest.json'
    if local_manifest.exists():
        content_files += read(local_manifest).get('files', [])
    loaded = {}
    for name in content_files:
        data = read(ROOT / name.removeprefix('./'))
        if data.get('language') == 'ja':
            loaded[data['sectionId']] = name
    questions = {}
    for path in [ROOT / 'data/questions.json', *sorted((ROOT / 'data/drafts').glob('*questions-ja.json'))]:
        for q in blocks(read(path)):
            if isinstance(q, dict) and len(q.get('choices', [])) == 4:
                questions[q['id']] = q
    result = []
    for index, (chapter, section) in enumerate(sections):
        sid = section['id']
        next_page = sections[index+1][1]['pdfStart'] if index+1 < len(sections) else min(a['pdfStart'] for a in book['appendices'])
        candidate_end = section.get('pdfEnd', next_page if index+1 < len(sections) and sections[index+1][0]['id'] == chapter['id'] else next_page-1)
        base = ROOT / f"data/drafts/{sid.replace('.', '-')}-ja.json"
        en = base.with_name(base.name.replace('-ja.json', '-en.json'))
        row_blocks = blocks(read(base)) if base.exists() else blocks(read(ROOT / loaded[sid].removeprefix('./'))) if sid in loaded else []
        review = section.get('sourceReview', {})
        question_rows = [q for q in questions.values() if q.get('source', {}).get('section') == sid]
        private_section = {'sectionId': sid, 'sourceSha256': manifest['sha256'], 'pdfPages': list(range(section['pdfStart'], candidate_end+1)), 'boundaryStatus': 'needs_review', 'note': '節の開始・終了ページには隣の節や図版が含まれ得る。ページ全体の抽出であり、節境界・数式・全訳の照合完了を意味しない。'}
        write(source / 'sections' / f'{sid}-source.json', private_section)
        remaining = ['逐文の網羅性と訳語の統一を確認する', '節の境界、図・式・表・脚注・ページ参照を確認する']
        if not row_blocks:
            remaining.insert(0, '日本語訳を作成する')
        if not question_rows:
            remaining.append('4択問題と全選択肢の理由を作成・確認する')
        if sid not in loaded:
            remaining.append('確認後にローカル教材パックへ取り込む')
        result.append({'id': sid, 'chapter': chapter['id'], 'title': section['title'], 'pdfStart': section['pdfStart'], 'pdfEndCandidate': candidate_end,
                       'bookStart': section.get('bookStart'), 'bookEndRecorded': section.get('bookEnd'),
                       'extraction': {'status': 'page_text_extracted', 'pages': candidate_end-section['pdfStart']+1, 'sourceSha256': manifest['sha256'], 'sectionBoundary': 'needs_review', 'formulaFidelity': 'not_verified'},
                       'translation': {'status': 'text_available' if sid in loaded else 'draft_exists' if base.exists() else 'not_started', 'japaneseBlocks': len(row_blocks), 'englishDraftExists': en.exists(), 'fullCoverage': 'not_verified'},
                       'sourceReview': {'recordedStatus': review.get('status', 'not_recorded'), 'record': review.get('record'), 'expertReviewed': False},
                       'visualChecks': {'figures': sum(b.get('type') == 'figure' for b in row_blocks), 'equations': sum(b.get('type') == 'formula' for b in row_blocks), 'tables': sum(b.get('type') == 'table' for b in row_blocks), 'completeCheck': 'not_verified'},
                       'questions': {'count': len(question_rows), 'sourceCheckedCount': sum(q.get('reviewStatus') == 'source_checked' for q in question_rows), 'expertReviewed': False},
                       'app': {'localReadable': sid in loaded, 'file': loaded.get(sid), 'publicDistributionPermission': 'not_confirmed'}, 'remaining': remaining})
    assert len(result) == 76, 'The source ledger must cover all 76 sections.'
    metadata = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'sourceExtractedAt': manifest['extractedAt'], 'source': manifest['file'], 'sourceSha256': manifest['sha256'], 'pdfPages': manifest['pages'], 'scopeNote': '原文の抽出、下書きの存在、部分的な照合記録、アプリ収録を分ける。全ページの翻訳・照合完了率ではない。', 'sections': result}
    write(ROOT / 'docs/SECTION_PROGRESS.json', metadata)
    table = ['# 全76節の工程別進捗', '', metadata['scopeNote'], '', '| 節 | 範囲（PDF） | 原文抽出 | 日本語本文・下書き | 原本照合記録 | 図/式/表 | 4択問題 | ローカル閲覧 |', '|---|---:|---|---|---|---:|---:|---|']
    for row in result:
        visuals = row['visualChecks']
        table.append(f"| {row['id']} {row['title']} | {row['pdfStart']}–{row['pdfEndCandidate']} | ページ抽出済・境界未確認 | {'あり・全体網羅性未確認' if row['translation']['japaneseBlocks'] else '未着手'} | {'記録あり・全文性未確認' if row['sourceReview']['recordedStatus'] == 'source_checked' else '工程別照合未記録'} | {visuals['figures']}/{visuals['equations']}/{visuals['tables']} | {row['questions']['count']} | {'可' if row['app']['localReadable'] else '未収録'} |")
    table += ['', 'すべて専門家校閲は未実施。図・式・表の数はデータ構造上の件数であり、原本の総数ではない。逐文の完全な照合を完了した節はまだ認定していない。未処理理由と各工程の状態は SECTION_PROGRESS.json に保持する。', '既存の部分的な原本照合の文章記録は CONTENT_PROGRESS.md と reviews/ を保持し、この台帳で消去・否定しない。']
    (ROOT / 'docs/SECTION_PROGRESS.md').write_text('\n'.join(table) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', required=True, type=Path)
    args = parser.parse_args()
    book = read(ROOT / 'data/book.json')
    digest = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    output = ROOT / 'data/source'
    manifest_path = output / 'source-manifest.json'
    existing = read(manifest_path) if manifest_path.exists() else {}
    if existing.get('sha256') == digest and all((output / 'pages' / f'{p:04}.json').exists() for p in range(1, book['pdfPageCount']+1)):
        manifest = existing
    else:
        reader = PdfReader(args.pdf)
        if len(reader.pages) != book['pdfPageCount']:
            raise ValueError('原本のページ数が教材台帳と一致しません。')
        issues = []
        for index, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ''
            issue = not text.strip() or '\ufffd' in text
            if issue:
                issues.append(index)
            write(output / 'pages' / f'{index:04}.json', {'pdfPage': index, 'bookPageCandidate': index-14 if index>14 else None, 'text': text, 'status': 'needs_visual_review' if issue else 'text_extracted', 'formulaFidelity': 'not_verified', 'layoutVerified': False, 'sourceSha256': digest})
        manifest = {'file': args.pdf.name, 'sha256': digest, 'pages': len(reader.pages), 'extractedAt': datetime.now(timezone.utc).isoformat(), 'needsVisualReviewPages': issues, 'expertReviewed': False}
        write(manifest_path, manifest)
    build_ledger(book, manifest)
    print(json.dumps({'pagesExtracted': manifest['pages'], 'sectionsTracked': 76, 'needsVisualReviewPages': manifest['needsVisualReviewPages'], 'translationComplete': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
