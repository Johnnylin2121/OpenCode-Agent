#!/usr/bin/env python
from __future__ import annotations

import argparse
import os
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

import akshare as ak

# 禁止写入的 Vault-like 目录段 / 文件名（判定时统一做 NFKC + casefold，故此处大小写与全角不敏感）
FORBIDDEN_PARTS = {
    '.obsidian', '.trash', '工作',
    '交易体系', '早读复核', '财经早读', '交易记忆', '亚马逊工作管理',
}
FORBIDDEN_NAMES = {'memory.md'}

OUTPUT_SUBDIR = ('trading', 'briefing-fetch')
OPENCODE_CONFIG_ROOT = Path.home() / '.config' / 'opencode'

# 用户授权的唯一 Vault 写入目标（2026-09-30 校正）：无「早报数据/」中间层，
# 自动草稿与复核报告、rss-digest 同放 交易体系/09.新闻资讯/早读复核/ 下。
VAULT_WRITE_SUBDIR = ('交易体系', '09.新闻资讯', '早读复核')
# 授权目录内仍然只读的子目录：rss-digest/ 由 DSH 的 dsh-rss-digest 插件拥有
VAULT_READONLY_SUBDIR = ('交易体系', '09.新闻资讯', '早读复核', 'rss-digest')
CATEGORY_WORDS = {
    '商品': ['原油', '黄金', '铜', '铝', '氧化铝', '煤炭', '烯烃', '商品', '期货'],
    '存储AI': ['存储', 'AI', '芯片', '英伟达', '数据中心'],
    '美股宏观': ['美股', '美联储', '通胀', '就业', 'GDP', '纳斯达克', '标普'],
    '地产银行': ['地产', '银行', '房贷', '房地产', '利率'],
    '地缘': ['战争', '冲突', '制裁', '关税', '地缘'],
    'IPO打新': ['IPO', '上市', '打新', '发行'],
}


def configure_output() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def _fold(value) -> str:
    return unicodedata.normalize('NFKC', str(value)).casefold()


FORBIDDEN_PARTS_FOLDED = frozenset(_fold(part) for part in FORBIDDEN_PARTS)
FORBIDDEN_NAMES_FOLDED = frozenset(_fold(name) for name in FORBIDDEN_NAMES)


def opencode_output_root() -> Path:
    """OpenCode 非 Vault 输出根：优先 OPENCODE_OUTPUT_ROOT。"""
    root = os.environ.get('OPENCODE_OUTPUT_ROOT') or str(OPENCODE_CONFIG_ROOT / 'outputs')
    return Path(root).expanduser().resolve()


def default_output_dir() -> Path:
    return opencode_output_root().joinpath(*OUTPUT_SUBDIR)


def vault_root() -> Path | None:
    """本机 Vault 根：优先环境变量 VAULT_PATH，其次本机标记文件（机器本地状态，不跨端同步）。"""
    raw = os.environ.get('VAULT_PATH')
    if not raw:
        marker = OPENCODE_CONFIG_ROOT / 'VAULT_PATH'
        if marker.is_file():
            raw = marker.read_text(encoding='utf-8', errors='replace').strip()
    if not raw:
        return None
    return Path(raw).expanduser().resolve()


def vault_allowed_dir() -> Path | None:
    """本 skill 唯一获授权的 Vault 目录；Vault 根未知时返回 None（此时拒绝一切 Vault 写入）。"""
    root = vault_root()
    return root.joinpath(*VAULT_WRITE_SUBDIR) if root else None


def is_within(parent: Path, child: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def in_vault_allowed_dir(target: Path) -> bool:
    """目标是否落在授权子目录内——用 relative_to 逐段前缀匹配，避免 `任意/早读复核/x.md` 被误放行。"""
    allowed = vault_allowed_dir()
    if allowed is None:
        return False
    try:
        target.resolve().relative_to(allowed)
        return True
    except ValueError:
        return False


def safe_output_path(raw: str) -> Path:
    """校验输出路径。

    绝对路径视为显式指定；纯文件名（无分隔符）落到本技能 OpenCode 输出目录；
    其他相对路径（CWD 隐式输出）拒绝。
    Vault 内仅放行 VAULT_WRITE_SUBDIR 一个子目录，其余一律拒绝。
    """
    if raw is None or not str(raw).strip():
        raise ValueError('输出路径为空')
    text = str(raw).strip()
    candidate = Path(text).expanduser()
    if '..' in candidate.parts:
        raise ValueError(f'路径穿越被拒绝: {text}')
    if not candidate.is_absolute():
        is_bare_name = len(candidate.parts) == 1 and not text.startswith(('.\\', './'))
        if not is_bare_name:
            raise ValueError(
                f'拒绝 CWD 隐式输出: {text}；请改用绝对非 Vault 路径、'
                f'只给文件名（写入 {default_output_dir()}），或省略 --output'
            )
        candidate = default_output_dir() / candidate.name
    target = candidate.resolve()
    vault = vault_root()
    if vault and is_within(vault, target):
        locked = vault.joinpath(*VAULT_READONLY_SUBDIR)
        if is_within(locked, target):
            raise ValueError(
                f'Vault write denied: {target}\n'
                f'{"/".join(VAULT_READONLY_SUBDIR)}/ 由 DSH 的 dsh-rss-digest 插件拥有（写方在 Vault 之外），本脚本只读不改。'
            )
        if in_vault_allowed_dir(target):
            return target
        raise ValueError(
            f'Vault write denied: {target}\n'
            f'本脚本在 Vault 内只允许写入 {"/".join(VAULT_WRITE_SUBDIR)}/；'
            f'如需其他目录请先取得用户对该次写入的明确授权。'
        )
    hit = {_fold(part) for part in target.parts} & FORBIDDEN_PARTS_FOLDED
    if hit:
        raise ValueError(f'Vault-like write denied: {target}（命中段: {", ".join(sorted(hit))}）')
    if _fold(target.name) in FORBIDDEN_NAMES_FOLDED:
        raise ValueError(f'Vault-like write denied: {target}')
    return target


def call(label, function, *args, **kwargs):
    try:
        return {'label': label, 'data': function(*args, **kwargs), 'error': ''}
    except Exception as exc:
        return {'label': label, 'data': None, 'error': f'{type(exc).__name__}: {exc}'}


def records(frame, limit=20):
    if frame is None or getattr(frame, 'empty', True):
        return []
    return frame.head(limit).astype(str).to_dict(orient='records')


def text(value):
    return str(value).replace('|', '\\|').replace('\n', ' ').strip()


def table(headers, rows):
    lines = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |']
    for row in rows:
        lines.append('| ' + ' | '.join(text(row.get(header, '')) for header in headers) + ' |')
    return '\n'.join(lines) if rows else '[待补]'


def fetch_domestic(symbols):
    results = []
    for symbol in symbols:
        result = call(f'国内期货 {symbol}', ak.futures_zh_realtime, symbol=symbol)
        results.append({
            'symbol': symbol,
            'rows': records(result['data']),
            'error': result['error'],
        })
    return results


def fetch_foreign(symbols):
    results = []
    for symbol in symbols:
        result = call(f'外盘期货 {symbol}', ak.futures_foreign_commodity_realtime, symbol=symbol)
        results.append({
            'symbol': symbol,
            'rows': records(result['data']),
            'error': result['error'],
        })
    return results


def fetch_us_indices(symbols):
    results = []
    for symbol in symbols:
        result = call(f'美股指数 {symbol}', ak.index_us_stock_sina, symbol=symbol)
        results.append({
            'symbol': symbol,
            'rows': records(result['data']),
            'error': result['error'],
        })
    return results


def fetch_news(date):
    stamp = date.replace('-', '')
    sources = [
        call('新闻联播', ak.news_cctv, date=stamp),
        call('有色快讯', ak.futures_news_shmet, symbol='全部'),
    ]
    items = []
    for source in sources:
        for row in records(source['data'], 80):
            title = next((value for key, value in row.items() if any(word in str(key).lower() for word in ['title', '标题', 'news'])), '')
            if title:
                items.append({'source': source['label'], 'title': title, **row})
    return items[:100]


def classify(title):
    labels = [name for name, words in CATEGORY_WORDS.items() if any(word.lower() in title.lower() for word in words)]
    return '、'.join(labels) if labels else '未分类'


def render(date, domestic, foreign, us_indices, news):
    lines = [
        f'# 自动数据层早报草稿 - {date}',
        '> 自动数据层，未经人工审核；仅作「早读复核」输入与人工参考。',
        '',
        '## 商品价格',
    ]
    for item in domestic + foreign:
        lines.extend(['', f"### {item['symbol']}", item['error'] or '[待补]'])
        if item['rows']:
            headers = list(item['rows'][0].keys())
            lines.append(table(headers, item['rows']))
    lines.extend(['', '## 美股指数'])
    for item in us_indices:
        lines.extend(['', f"### {item['symbol']}", item['error'] or '[待补]'])
        if item['rows']:
            headers = list(item['rows'][0].keys())
            lines.append(table(headers, item['rows']))
    lines.extend(['', '## 快讯筛选'])
    for item in news:
        lines.append(f"- [{classify(str(item.get('title', '')))}] {item.get('title', '')}（{item.get('source', '')}）")
    if not news:
        lines.append('[待补]')
    lines.extend([
        '',
        '## 数据说明',
        '- 数据源：akshare 公开接口。',
        '- 失败项目保留 [待补]，不猜测数值。',
        '- 落盘位置仅限 `交易体系/09.新闻资讯/早读复核/`（用户授权的唯一 Vault 目录；无「早报数据/」中间层）。',
    ])
    return '\n'.join(lines) + '\n'


def parse_args():
    parser = argparse.ArgumentParser(description='OpenCode trading briefing data fetch')
    parser.add_argument('--date', default=datetime.now().strftime('%Y-%m-%d'))
    parser.add_argument('--domestic', default='CU,AL,RU')
    parser.add_argument('--foreign', default='hf_GC,hf_CL,hf_CHA50CFD')
    parser.add_argument('--us', default='.INX,.DJI,.IXIC')
    parser.add_argument(
        '--output',
        help='省略时输出到标准输出；只给文件名时写入 OpenCode 输出根；'
             f'Vault 内仅允许 {"".join(VAULT_WRITE_SUBDIR)}/',
    )
    return parser.parse_args()


def main():
    configure_output()
    args = parse_args()
    domestic = fetch_domestic([item.strip() for item in args.domestic.split(',') if item.strip()])
    foreign = fetch_foreign([item.strip() for item in args.foreign.split(',') if item.strip()])
    us_indices = fetch_us_indices([item.strip() for item in args.us.split(',') if item.strip()])
    news = fetch_news(args.date)
    report = render(args.date, domestic, foreign, us_indices, news)
    if args.output:
        try:
            target = safe_output_path(args.output)
        except ValueError as exc:
            print(f'拒绝写入：{exc}', file=sys.stderr)
            raise SystemExit(2)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(report, encoding='utf-8')
        scope = 'Vault 授权目录' if (vault_root() and in_vault_allowed_dir(target)) else 'OpenCode 非 Vault'
        print(f'已写入{scope}文件：{target}')
    else:
        print(report)


if __name__ == '__main__':
    main()
