#!/usr/bin/env python
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

import akshare as ak

FORBIDDEN_PARTS = {'.obsidian', '交易体系', '早读复核', '财经早读', '交易记忆'}
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


def is_within(parent: Path, child: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def safe_output_path(raw: str) -> Path:
    target = Path(raw).expanduser().resolve()
    vault = os.environ.get('VAULT_PATH')
    if vault and is_within(Path(vault).expanduser().resolve(), target):
        raise ValueError(f'Vault write denied: {target}')
    if any(part in FORBIDDEN_PARTS for part in target.parts) or target.name == 'MEMORY.md':
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
        '> 自动数据层，未经人工审核；未写入 Obsidian。',
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
    lines.extend(['', '## 数据说明', '- 数据源：akshare 公开接口。', '- 失败项目保留 [待补]，不猜测数值。', '- 本文件默认只输出到标准输出；持久化路径必须是非 Vault 路径。'])
    return '\n'.join(lines) + '\n'


def parse_args():
    parser = argparse.ArgumentParser(description='OpenCode trading briefing data fetch')
    parser.add_argument('--date', default=datetime.now().strftime('%Y-%m-%d'))
    parser.add_argument('--domestic', default='CU,AL,RU')
    parser.add_argument('--foreign', default='hf_GC,hf_CL,hf_CHA50CFD')
    parser.add_argument('--us', default='.INX,.DJI,.IXIC')
    parser.add_argument('--output', help='非 Vault 输出路径；省略时输出到标准输出')
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
        target = safe_output_path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(report, encoding='utf-8')
        print(f'已写入非 Vault 文件：{target}')
    else:
        print(report)


if __name__ == '__main__':
    main()
