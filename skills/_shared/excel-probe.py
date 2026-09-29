#!/usr/bin/env python3
"""excel-probe — OpenCode 本地只读表格探查工具.

用法（解释器：python 或 $env:OPENCODE_PYTHON，需 pandas + openpyxl）:
  excel-probe.py describe --input data.xlsx [--sheet NAME] [--n 8]
  excel-probe.py filter   --input data.xlsx --sheet NAME --query "销售额 > 100 and 店铺 == 'A'" [--n 50]
  excel-probe.py pivot    --input data.xlsx --sheet NAME --index 店铺 --values 销售额 --agg sum
  excel-probe.py columns  --input data.xlsx

输入格式与依赖（缺失即报错，不做静默降级）:
  .csv   -> pandas 内置 csv 引擎
  .xlsx  -> openpyxl（pip install openpyxl）
  .xlsm  -> openpyxl（保留宏的 Excel 2007+ 工作簿，同样由 openpyxl 读取）
  .xls   -> xlrd（pip install "xlrd>=2"；仅旧版 BIFF .xls，xlrd 2.x 不读 .xlsx）

输出 UTF-8 JSON 或表格摘要，便于 agent 读列映射后再跑 analysis 脚本。
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

# 后缀 -> 读取该格式必需的第三方包
READ_ENGINES = {
    ".csv": None,
    ".xlsx": "openpyxl",
    ".xlsm": "openpyxl",
    ".xls": "xlrd",
}

ENGINE_HINTS = {
    "openpyxl": 'pip install openpyxl；或把文件另存为 .csv',
    "xlrd": 'pip install "xlrd>=2"（仅支持旧版 .xls）；或把文件另存为 .xlsx',
}


def _require_engine(suffix: str) -> str | None:
    """返回该后缀需要的读取引擎；缺依赖时给出明确提示并退出。"""
    engine = READ_ENGINES.get(suffix, "missing")
    if engine == "missing":
        raise SystemExit(
            f"unsupported type: {suffix} (支持 {', '.join(sorted(READ_ENGINES))})"
        )
    if engine is None:
        return None
    if importlib.util.find_spec(engine) is None:
        raise SystemExit(
            f"读取 {suffix} 需要 {engine}，当前未安装：{ENGINE_HINTS[engine]}"
        )
    return engine


def _load(path: str, sheet: str | None):
    import pandas as pd

    p = Path(path)
    if not p.exists():
        raise SystemExit(f"input not found: {path}")
    suffix = p.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path)
    engine = _require_engine(suffix)
    return pd.read_excel(path, sheet_name=sheet if sheet else 0, engine=engine)


def cmd_describe(args: argparse.Namespace) -> None:
    df = _load(args.input, args.sheet)
    info = {
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "columns": [str(c) for c in df.columns],
        "dtypes": {str(k): str(v) for k, v in df.dtypes.items()},
        "null_rate": {
            str(c): (float(df[c].isna().mean()) if len(df) else 0.0)
            for c in df.columns
        },
        "head": json.loads(df.head(args.n).to_json(orient="records", force_ascii=False)),
    }
    print(json.dumps(info, ensure_ascii=False, indent=2))


def cmd_columns(args: argparse.Namespace) -> None:
    df = _load(args.input, args.sheet)
    print("\n".join(str(c) for c in df.columns))


def cmd_filter(args: argparse.Namespace) -> None:
    df = _load(args.input, args.sheet)
    if args.query:
        df = df.query(args.query, engine="python")
    if args.n is not None:
        df = df.head(args.n)
    print(df.to_json(orient="records", force_ascii=False, indent=2))


def cmd_pivot(args: argparse.Namespace) -> None:
    df = _load(args.input, args.sheet)
    out = df.pivot_table(
        index=args.index,
        values=args.values,
        aggfunc=args.agg,
        fill_value=0,
    ).reset_index()
    print(out.to_json(orient="records", force_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    # Windows GBK 控制台下中文/表格输出会乱码：强制 UTF-8
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    p = argparse.ArgumentParser(description="OpenCode excel probe")
    sub = p.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("describe", help="sheet meta + null rate + head sample")
    d.add_argument("--input", required=True)
    d.add_argument("--sheet", default=None)
    d.add_argument("--n", type=int, default=8)
    d.set_defaults(func=cmd_describe)

    c = sub.add_parser("columns", help="list column names")
    c.add_argument("--input", required=True)
    c.add_argument("--sheet", default=None)
    c.set_defaults(func=cmd_columns)

    f = sub.add_parser("filter", help="pandas query filter sample")
    f.add_argument("--input", required=True)
    f.add_argument("--sheet", default=None)
    f.add_argument("--query", default="")
    f.add_argument("--n", type=int, default=50)
    f.set_defaults(func=cmd_filter)

    v = sub.add_parser("pivot", help="simple pivot_table")
    v.add_argument("--input", required=True)
    v.add_argument("--sheet", default=None)
    v.add_argument("--index", required=True)
    v.add_argument("--values", required=True)
    v.add_argument("--agg", default="sum")
    v.set_defaults(func=cmd_pivot)

    args = p.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
