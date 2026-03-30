"""
テンプレート .xls の構造をダンプするスクリプト。
セルマッピングの座標を正確に決めるために使う。

使い方:
    cd backend
    ~/.local/bin/uv run python -m transcription.dump_template

出力:
    各シートの結合セル情報、ラベルセルの位置と値を表示。
"""

import os
import xlrd


TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "templates", "(者）★原本.xls"
)


def dump_sheet(sheet: xlrd.sheet.Sheet, sheet_index: int) -> None:
    print(f"\n{'='*80}")
    print(f"シート {sheet_index}: {sheet.name}")
    print(f"行数: {sheet.nrows}, 列数: {sheet.ncols}")
    print(f"{'='*80}")

    # 結合セル情報
    merged = sheet.merged_cells  # list of (row_lo, row_hi, col_lo, col_hi)
    if merged:
        print(f"\n--- 結合セル ({len(merged)}件) ---")
        for rlo, rhi, clo, chi in sorted(merged):
            val = sheet.cell_value(rlo, clo)
            if val:
                print(f"  ({rlo},{clo})-({rhi-1},{chi-1}): {repr(val)}")

    # 値が入っているセルをダンプ
    print(f"\n--- 値のあるセル ---")
    for row in range(sheet.nrows):
        for col in range(sheet.ncols):
            val = sheet.cell_value(row, col)
            if val:
                cell_type = sheet.cell_type(row, col)
                type_name = {0: "EMPTY", 1: "TEXT", 2: "NUMBER", 3: "DATE", 4: "BOOL", 5: "ERROR", 6: "BLANK"}.get(cell_type, "?")
                print(f"  ({row:3d},{col:3d}) [{type_name:6s}] {repr(val)[:100]}")


def main() -> None:
    if not os.path.exists(TEMPLATE_PATH):
        print(f"テンプレートが見つかりません: {TEMPLATE_PATH}")
        print("backend/templates/ に (者)★原本.xls を配置してください。")
        return

    wb = xlrd.open_workbook(TEMPLATE_PATH, formatting_info=True)
    print(f"テンプレート: {TEMPLATE_PATH}")
    print(f"シート数: {wb.nsheets}")
    print(f"シート名: {[wb.sheet_names()[i] for i in range(wb.nsheets)]}")

    for i in range(wb.nsheets):
        sheet = wb.sheet_by_index(i)
        dump_sheet(sheet, i)


if __name__ == "__main__":
    main()
