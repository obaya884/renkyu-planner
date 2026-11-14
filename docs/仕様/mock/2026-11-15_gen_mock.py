import calendar
import datetime as dt
import sys

# 連休プランナー 画面のモック（2026-11-15 のブレストで決めた配置）を 1 枚の HTML に書き出す。
# 使い方: python3 2026-11-15_gen_mock.py 出力先.html

out = sys.argv[1]
D = dt.date
holidays = {D(2027, 1, 1), D(2027, 1, 11), D(2027, 2, 11), D(2027, 2, 23), D(2027, 3, 22), D(2026, 10, 12), D(2026, 11, 3), D(2026, 11, 23), D(2027, 4, 29), D(2027, 5, 3), D(2027, 5, 4), D(2027, 5, 5)}
company = {D(2026, 12, 30), D(2026, 12, 31), D(2027, 1, 2), D(2027, 1, 3)}
done = {D(2026, 10, 7), D(2026, 11, 2)}
EMPTY = False
planned = {D(2026, 12, 28), D(2026, 12, 29)}
cand = {D(2026, 11, 20), D(2027, 2, 12), D(2027, 2, 22), D(2027, 3, 19), D(2027, 4, 30), D(2027, 5, 6)}
grant = {D(2027, 5, 1)}


def cls(d):
    if EMPTY:
        if d in {D(2026, 11, 20), D(2026, 12, 31)}:
            return 'cd'
        return 'off' if (d in holidays or d.weekday() >= 5) else ''
    if d in done:
        return "dn"
    if d in planned:
        return "pl"
    if d in cand:
        return "cd"
    if d in company:
        return "co"
    if d in holidays or d.weekday() >= 5:
        return "off"
    return ""


def month(y, m, showyear=False):
    cal = calendar.Calendar(firstweekday=6)
    rows = []
    for week in cal.monthdatescalendar(y, m):
        tds = []
        for d in week:
            if d.month != m:
                tds.append("<td></td>")
            else:
                g = ' gr' if d in grant else ''
                tds.append(f'<td class="{cls(d)}{g}">{d.day}</td>')
        rows.append("<tr>" + "".join(tds) + "</tr>")
    head = "".join(f"<th>{w}</th>" for w in "日月火水木金土")
    return f'<table class="c"><caption>{m}月</caption><tr>{head}</tr>{"".join(rows)}</table>'


CSS = """
<style>
.ph-wrap{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start;margin:14px 0 20px}
.ph-col{width:320px}
.ph-col h3{margin:0 0 2px;font-size:15px}
.ph-col .why{font-size:12px;color:#6b7280;min-height:54px;margin:0 0 8px}
.ph{width:320px;height:640px;border:8px solid #1f2937;border-radius:26px;background:#fff;color:#1f2937;font-size:12px;line-height:1.45;overflow:hidden;position:relative;box-sizing:border-box}
.ph .bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:13px}
.ph .bar span{font-weight:400;color:#6b7280}
.ph .bal{margin:8px 10px;padding:8px 10px;background:#f3f4f6;border-radius:8px}
.ph .bal b{font-size:17px}
.ph .s{color:#6b7280;font-size:10.5px}
.ph .tabs{display:flex;border-bottom:1px solid #e5e7eb;font-size:11px}
.ph .tabs div{flex:1;text-align:center;padding:6px 0;font-size:12px;color:#6b7280;position:relative}
.ph .tabs .past{flex:0 0 34px;font-size:10px;padding-top:12px}
.ph .tabs .on{color:#0d9488;font-weight:600;border-bottom:2px solid #0d9488}
.ph .tabs small{display:block;font-size:9px;font-weight:400;color:#6b7280}
.ph .tabs em{display:block;font-style:normal;font-size:8.5px;border-radius:7px;margin:2px 4px 0;padding:0 2px}
.ph .tabs .has{background:#d1fae5;color:#065f46}.ph .tabs .none{background:#fef3c7;color:#92400e}
.ph .gr{outline:2px solid #7c3aed;outline-offset:-1px;font-weight:700}
.ph .lb{margin:0 10px 8px;font-size:10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.ph .lb .t{color:#6b7280;flex:0 0 100%}
.ph .lb .chip{border-radius:9px;padding:1px 6px;font-size:9.5px}
.ph .lb .has{background:#d1fae5;color:#065f46}.ph .lb .none{background:#fef3c7;color:#92400e}
.ph .dim{position:absolute;inset:0;background:rgba(17,24,39,.45)}
.ph .sheet{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;padding:12px 14px 16px;font-size:12px}
.ph .sheet h5{margin:0 0 6px;font-size:14px}
.ph .sheet .kv{display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid #e5e7eb}
.ph .sheet .kv span:first-child{color:#6b7280}
.ph .sheet .in{border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;color:#9ca3af;width:150px}
.ph .sheet .go{margin-top:10px;background:#0d9488;color:#fff;text-align:center;border-radius:8px;padding:10px;font-weight:600;font-size:13px}
.ph .sheet .no{text-align:center;color:#6b7280;padding-top:8px}
.ph .toast{position:absolute;left:10px;right:10px;bottom:12px;background:#1f2937;color:#fff;border-radius:8px;padding:9px 12px;display:flex;justify-content:space-between;font-size:11.5px}
.ph .toast b{color:#5eead4}
.ph .new{background:#f0fdfa}
.ph .seg{display:flex;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;font-size:11px}
.ph .seg span{padding:4px 9px;color:#6b7280}.ph .seg .on{background:#0d9488;color:#fff}
.ph .lnk{color:#0d9488}.ph .del{color:#b91c1c;text-align:center;padding-top:8px}
.ph .grp{font-size:10.5px;color:#5b21b6;margin-top:6px}
.ph .warn{color:#b45309}
.ph .set{padding:0 12px;font-size:12px}
.ph .set h6{margin:12px 0 2px;font-size:11px;color:#6b7280;font-weight:600}
.ph .set .kv{display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid #e5e7eb}
.ph .set .kv span:last-child{color:#374151}
.ph .set .n{font-size:10px;color:#6b7280}
.pc{width:880px;border:2px solid #1f2937;border-radius:10px;background:#fff;color:#1f2937;font-size:12px;line-height:1.45;overflow:hidden;margin:6px 0 22px}
.pc .bar{display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:13px}
.pc .bar span{font-weight:400;color:#6b7280}
.pc .head{display:flex;gap:16px;align-items:center;padding:10px 16px}
.pc .bal{padding:8px 12px;background:#f3f4f6;border-radius:8px}
.pc .bal b{font-size:17px}
.pc .s{color:#6b7280;font-size:10.5px}
.pc .lb{font-size:10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pc .lb .t{color:#6b7280;flex:0 0 100%}
.pc .chip{border-radius:9px;padding:1px 6px;font-size:10px}
.pc .has{background:#d1fae5;color:#065f46}.pc .none{background:#fef3c7;color:#92400e}
.pc .tabs{display:flex;border-bottom:1px solid #e5e7eb;padding:0 16px}
.pc .tabs div{padding:6px 18px;color:#6b7280;text-align:center}
.pc .tabs .on{color:#0d9488;font-weight:600;border-bottom:2px solid #0d9488}
.pc .tabs small{display:block;font-size:9px;font-weight:400;color:#6b7280}
.pc .sec{display:flex;gap:22px;padding:12px 16px;border-top:1px solid #e5e7eb}
.pc .sec .l{flex:0 0 auto}
.pc .sec .r{flex:1}
.pc h4{margin:0 0 2px;font-size:13px}
.pc .st{font-size:11px;margin-bottom:6px}
.pc .tag{display:inline-block;font-size:10px;padding:0 6px;border-radius:9px;margin-left:4px}
.pc .ok{background:#d1fae5;color:#065f46}.pc .long{background:#ede9fe;color:#5b21b6}
.pc .lab{font-size:10px;color:#6b7280;margin-top:6px;display:flex;justify-content:space-between}
.pc .add{color:#0d9488}
.pc .row{display:flex;gap:6px;align-items:center;padding:5px 0;border-top:1px dashed #e5e7eb}
.pc .row .g{flex:1}
.pc .btn{font-size:11px;border:1px solid #0d9488;color:#0d9488;border-radius:6px;padding:3px 8px;white-space:nowrap}
.pc .cals{display:flex;gap:12px}
.pc table.c{border-collapse:collapse;font-size:10px}
.pc table.c caption{font-weight:600;text-align:left;font-size:11px}
.pc table.c td,.pc table.c th{width:19px;height:18px;text-align:center;padding:0}
.pc table.c th{color:#9ca3af;font-weight:400}
.pc .off{background:#fee2e2;color:#b91c1c}.pc .co{background:#e0e7ff;color:#3730a3}.pc .dn{background:#0d9488;color:#fff}
.pc .pl{box-shadow:inset 0 0 0 1.5px #0d9488}.pc .cd{box-shadow:inset 0 0 0 1.5px #f59e0b;background:#fffbeb}
.pc .leg{font-size:10px;margin-top:4px}.pc .leg span{display:inline-block;padding:0 4px;margin-right:4px}
.pc .more{padding:8px 16px;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb;text-align:center}
.pcw h3{margin:12px 0 2px;font-size:15px}.pcw .why{font-size:12px;color:#6b7280;margin:0 0 6px}
.ph .ask{margin:8px 10px;padding:9px 10px;border:1px dashed #0d9488;border-radius:8px;background:#f0fdfa}
.ph .ask b{font-size:12.5px}
.ph .ask .btn2{display:inline-block;margin-top:6px;background:#0d9488;color:#fff;border-radius:6px;padding:5px 12px;font-size:11.5px}
.ph .ask .f{display:flex;gap:6px;align-items:center;margin-top:6px;font-size:11px}
.ph .ask .in{border:1px solid #d1d5db;border-radius:6px;padding:4px 8px;background:#fff;min-width:44px;text-align:center}
.pc.modal{position:relative;height:470px}
.pc .dim{position:absolute;inset:0;background:rgba(17,24,39,.45)}
.pc .dlg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:380px;background:#fff;border-radius:12px;padding:16px 18px;font-size:12.5px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.pc .dlg h5{margin:0 0 8px;font-size:15px}
.pc .dlg .kv{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid #e5e7eb}
.pc .dlg .kv span:first-child{color:#6b7280}
.pc .dlg .in{border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;color:#9ca3af;display:inline-block;min-width:30px}
.pc .dlg .seg{display:flex;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;font-size:11.5px}
.pc .dlg .seg span{padding:4px 10px;color:#6b7280}.pc .dlg .seg .on{background:#0d9488;color:#fff}
.pc .dlg .acts{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;align-items:center}
.pc .dlg .go{background:#0d9488;color:#fff;border-radius:8px;padding:8px 18px;font-weight:600}
.pc .dlg .no{color:#6b7280}.pc .dlg .del{color:#b91c1c;margin-right:auto}
.pc .lnk{color:#0d9488}
.ph .gnote{font-size:10px;color:#5b21b6;margin:2px 0 4px}
.ph .nx{color:#5b21b6}
.ph .tabs i{position:absolute;left:2px;right:2px;bottom:-15px;font-style:normal;font-size:8.5px;color:#92400e;background:#fef3c7;border-radius:6px}
.ph .q{margin:18px 10px 8px;padding:0 2px}
.ph .q h4{margin:0 0 2px;font-size:13px}
.ph .st{font-size:11px;margin-bottom:4px}
.ph .tag{display:inline-block;font-size:10px;padding:0 6px;border-radius:9px;margin-left:4px}
.ph .ok{background:#d1fae5;color:#065f46}.ph .long{background:#ede9fe;color:#5b21b6}
.ph .lab{font-size:10px;color:#6b7280;margin-top:8px;display:flex;justify-content:space-between}
.ph .add{color:#0d9488}
.ph .row{display:flex;gap:6px;align-items:center;padding:6px 0;border-top:1px dashed #e5e7eb}
.ph .row .g{flex:1}
.ph .btn{font-size:11px;border:1px solid #0d9488;color:#0d9488;border-radius:6px;padding:5px 8px;white-space:nowrap}
.ph .cals{display:flex;gap:6px;margin:8px 0 4px;justify-content:space-between}
.ph table.c{border-collapse:collapse;font-size:8.5px}
.ph table.c caption{font-weight:600;text-align:left;font-size:10px}
.ph table.c td,.ph table.c th{width:13px;height:13px;text-align:center;padding:0}
.ph table.c th{color:#9ca3af;font-weight:400}
.ph .off{background:#fee2e2;color:#b91c1c}
.ph .co{background:#e0e7ff;color:#3730a3}
.ph .dn{background:#0d9488;color:#fff}
.ph .pl{box-shadow:inset 0 0 0 1.5px #0d9488}
.ph .cd{box-shadow:inset 0 0 0 1.5px #f59e0b;background:#fffbeb}
.ph .leg{font-size:9px;margin-top:2px}
.ph .leg span{display:inline-block;padding:0 4px;margin-right:4px}
</style>
"""


def tabs(on):
    items = [("2026年", "10〜12月", True), ("2027年", "1〜3月", False), ("2027年", "4〜6月", False), ("2027年", "7〜9月", False)]
    h = '<div class="tabs"><div class="past">‹ 前</div>'
    for i, (y, m, has) in enumerate(items):
        h += f'<div class="{"on" if i == on else ""}"><small>{y}</small>{m}</div>'
    return h + "</div>"

bar = '<div class="bar">連休プランナー <span>設定</span></div><div class="bal"><div class="s">有休 残り</div><b>9日2時間</b><div class="s">予定 2日・未割り当て 7日2時間</div></div><div class="lb"><span class="t">長めの休暇</span><span class="chip has">10〜12月 あり</span><span class="chip none">1〜3月 まだ</span><span class="chip none">4〜6月 まだ</span><span class="chip none">7〜9月 まだ</span></div>'
legend = '<div class="leg"><span class="off">土日・祝日</span><span class="co">会社の休日</span><span class="dn">取得済み</span><span class="pl">予定</span><span class="cd">候補</span></div>'
legend2 = legend.replace('</div>', '<span class="gr">付与日</span></div>')

def cals(y, ms):
    return '<div class="cals">' + "".join(month(y, m) for m in ms) + "</div>"




foot = '<div class="s" style="margin:10px 12px 0;padding-top:6px;border-top:1px solid #e5e7eb">祝日は内閣府の公表データです。2027年12月31日まで確定。<span class="lnk">くわしく</span></div>'
cand4 = '<div class="row"><div class="g">11/20(金) を休むと 4連休<div class="s">11/20〜11/23</div></div><div class="btn">日程に入れる</div></div>'
ents4 = """<div class="row"><div class="g">10/7(水) 2時間 体調不良<div class="s">取得済み</div></div><span class="s">›</span></div>
    <div class="row"><div class="g">11/2(月) 1日 連休作成<div class="s">取得済み・10/31〜11/3 の 4連休</div></div><span class="s">›</span></div>
    <div class="row"><div class="g">11/13(金) 半日 通院<div class="s warn">予定・日付を過ぎています</div></div><div class="btn">取得済みにする</div></div>
    <div class="grp">12/26〜1/3 の 9連休<span class="tag long">長め</span></div>
    <div class="row"><div class="g">12/28(月) 1日 年末年始<div class="s">予定</div></div><span class="s">›</span></div>
    <div class="row"><div class="g">12/29(火) 1日 年末年始<div class="s">予定</div></div><span class="s">›</span></div>"""

def q4(extra=""):
    return f"""{bar}{tabs(0)}
  <div class="q"><h4>2026年 10〜12月</h4><div class="st">長めの休暇: 12/26〜1/3（9連休）<span class="tag ok">あり</span></div>
    {cals(2026, (10, 11, 12))}{legend}
    <div class="lab">候補</div>{cand4}
    <div class="lab">日程 <span class="add">＋ 日を足す</span></div>{ents4}
  </div>{foot}{extra}"""

sp1 = q4()
sp2 = f"""{bar}{tabs(2)}
  <div class="q"><h4>2027年 4〜6月</h4><div class="st">長めの休暇: まだない</div>
    {cals(2027, (4, 5, 6))}{legend2}
    <div class="gnote">5/1 から次の付与年（前の年と同じ 14日で計算中）<span class="lnk">日数を入れる</span></div>
    <div class="lab">候補</div>
    <div class="row"><div class="g">4/30(金) を休むと 7連休<span class="tag long">長め</span><div class="s">4/29〜5/5</div></div><div class="btn">日程に入れる</div></div>
    <div class="row"><div class="g">5/6(木) を休むと 6連休<span class="tag long">長め</span><div class="s">5/1〜5/6・<span class="nx">次の付与年から引く</span></div></div><div class="btn">日程に入れる</div></div>
    <div class="lab">日程 <span class="add">＋ 日を足す</span></div>
    <div class="row"><div class="g s">まだありません</div></div>
  </div>{foot}"""
sp3 = q4("""<div class="dim"></div><div class="sheet">
  <h5>日程に入れる</h5>
  <div class="kv"><span>休む日</span><span>11/20(金) 1日</span></div>
  <div class="kv"><span>連休</span><span>11/20〜11/23 の 4連休</span></div>
  <div class="kv"><span>引く休暇</span><span>有休（残り 9日2時間）</span></div>
  <div class="kv"><span>未割り当て</span><span>7日2時間 → 6日2時間</span></div>
  <div class="kv"><span>予定の名前</span><span class="in">任意</span></div>
  <div class="go">予定に入れる</div><div class="no">やめる</div></div>""")
sp4 = q4("""<div class="dim"></div><div class="sheet">
  <h5>12/28(月) の日程</h5>
  <div class="kv"><span>量</span><span class="seg"><span class="on">1日</span><span>半日</span><span>時間で入れる</span></span></div>
  <div class="kv"><span>引く休暇</span><span>有休 ▾</span></div>
  <div class="kv"><span>予定の名前</span><span class="in" style="color:#1f2937">年末年始</span></div>
  <div class="kv"><span>状態</span><span class="seg"><span class="on">予定</span><span>取得済み</span></span></div>
  <div class="kv"><span>連休</span><span>12/26〜1/3 の 9連休</span></div>
  <div class="kv"><span>カレンダー</span><span class="lnk">Google カレンダーに追加</span></div>
  <div class="go">保存する</div><div class="del">この日程を消す</div></div>""")

EMPTY = True
strip0 = '<div class="lb"><span class="t">長めの休暇（土日と祝日だけで計算）</span><span class="chip none">10〜12月 まだ</span><span class="chip none">1〜3月 まだ</span><span class="chip has">4〜6月 あり</span><span class="chip none">7〜9月 まだ</span></div>'
legend0 = '<div class="leg"><span class="off">土日・祝日</span><span class="cd">候補</span></div>'
ask = '<div class="ask"><b>有休の残りを出す</b><div class="s">付与日と日数を入れると、残りと、まだ日を決めていない日数が出ます。</div><div class="btn2">付与日と日数を入れる</div></div>'
top0 = '<div class="bar">連休プランナー <span>設定</span></div>'
def empty(extra=""):
    return f"""{top0}{ask}{strip0}{tabs(0)}
  <div class="q"><h4>2026年 10〜12月</h4><div class="st">長めの休暇: まだない</div>
    {cals(2026, (10, 11, 12))}{legend0}
    <div class="lab">候補</div>
    <div class="row"><div class="g">11/20(金) を休むと 4連休<div class="s">11/20〜11/23</div></div><div class="btn">日程に入れる</div></div>
    <div class="row"><div class="g">12/31(木) を休むと 4連休<div class="s">12/31〜1/3</div></div><div class="btn">日程に入れる</div></div>
    <div class="lab">日程 <span class="add">＋ 日を足す</span></div>
    <div class="row"><div class="g s">まだありません</div></div>
  </div>{foot}{extra}"""
sp5 = empty()
sp6 = empty("""<div class="dim"></div><div class="sheet">
  <h5>有休の付与日と日数</h5>
  <div class="kv"><span>付与日</span><span><span class="in" style="width:auto;color:#1f2937">5月</span> <span class="in" style="width:auto;color:#1f2937">1日</span></span></div>
  <div class="kv"><span>付与日数</span><span><span class="in" style="width:auto;color:#1f2937">14</span> 日</span></div>
  <div class="kv"><span>前の年からの繰り越し</span><span><span class="in" style="width:auto">0</span> 日（任意）</span></div>
  <div class="s" style="padding:8px 0 0">入れた内容は、このブラウザの中にだけ保存します。運営には送られません。</div>
  <div class="go">残りを出す</div><div class="no">やめる</div></div>""")
pc_empty_cals = cals(2026, (10, 11, 12))
EMPTY = False

sp7 = """<div class="bar"><span>‹ 戻る</span> 設定 <span></span></div><div class="set">
  <h6>有休</h6>
  <div class="kv"><span>付与日</span><span>5月 1日</span></div>
  <div class="kv"><span>2026/5/1〜2027/4/30</span><span>付与 14日・繰り越し 0日</span></div>
  <div class="kv"><span>2027/5/1〜</span><span class="lnk">日数を入れる（いまは 14日で計算）</span></div>
  <h6>1 日の所定労働時間</h6>
  <div class="kv"><span>時間</span><span>8時間 0分</span></div>
  <h6>会社の休日</h6>
  <div class="kv"><span>12/30〜1/3</span><span>毎年</span></div>
  <div class="kv"><span class="lnk">＋ 会社の休日を足す</span><span></span></div>
  <h6>休暇の種類</h6>
  <div class="kv"><span>有休</span><span class="n">消せません</span></div>
  <div class="kv"><span>夏季休暇</span><span>3日・7/1〜9/30</span></div>
  <div class="kv"><span class="lnk">＋ 休暇の種類を足す</span><span></span></div>
  <h6>記録の持ち出し</h6>
  <div class="kv"><span class="lnk">ファイルに書き出す</span><span class="lnk">ファイルを読み込む</span></div>
  <div class="kv"><span class="lnk">カレンダー用のファイル（.ics）を書き出す</span><span></span></div>
  <h6>祝日について</h6>
  <div class="n" style="padding:6px 0">祝日は内閣府の公表データです。2027年12月31日まで確定しています。それより先は未確定で、候補が変わることがあります。祝日データの最終更新: 2026年11月15日</div>
</div>"""

# PC
pchead = '<div class="bar">連休プランナー <span>設定</span></div><div class="head"><div class="bal"><div class="s">有休 残り</div><b>9日2時間</b><div class="s">予定 2日・未割り当て 7日2時間</div></div><div class="lb"><span class="t">長めの休暇</span><span class="chip has">10〜12月 あり</span><span class="chip none">1〜3月 まだ</span><span class="chip none">4〜6月 まだ</span><span class="chip none">7〜9月 まだ</span></div></div>'
pcfoot = '<div class="more" style="text-align:left">祝日は内閣府の公表データです。2027年12月31日まで確定。<span class="add">くわしく</span><span style="float:right" class="add">過ぎた四半期の記録を見る</span></div>'
def sec(title, st, c, leg, right, note=""):
    return f'<div class="sec"><div class="l"><h4>{title}</h4><div class="st">{st}</div>{c}{leg}{note}</div><div class="r">{right}</div></div>'
r4 = """<div class="lab">候補</div>
<div class="row"><div class="g">11/20(金) を休むと 4連休 <span class="s">11/20〜11/23</span></div><div class="btn">日程に入れる</div></div>
<div class="lab">日程 <span class="add">＋ 日を足す</span></div>
<div class="row"><div class="g">10/7(水) 2時間 体調不良 <span class="s">取得済み</span></div></div>
<div class="row"><div class="g">11/2(月) 1日 連休作成 <span class="s">取得済み・10/31〜11/3 の 4連休</span></div></div>
<div class="row"><div class="g">11/13(金) 半日 通院 <span class="s" style="color:#b45309">予定・日付を過ぎています</span></div><div class="btn">取得済みにする</div></div>
<div style="font-size:10.5px;color:#5b21b6;margin-top:6px">12/26〜1/3 の 9連休<span class="tag long">長め</span></div>
<div class="row"><div class="g">12/28(月) 1日 年末年始 <span class="s">予定</span></div></div>
<div class="row"><div class="g">12/29(火) 1日 年末年始 <span class="s">予定</span></div></div>"""
r1 = """<div class="lab">候補</div>
<div class="row"><div class="g">2/12(金) を休むと 4連休 <span class="s">2/11〜2/14</span></div><div class="btn">日程に入れる</div></div>
<div class="row"><div class="g">2/22(月) を休むと 4連休 <span class="s">2/20〜2/23</span></div><div class="btn">日程に入れる</div></div>
<div class="row"><div class="g">3/19(金) を休むと 4連休 <span class="s">3/19〜3/22</span></div><div class="btn">日程に入れる</div></div>
<div class="lab">日程 <span class="add">＋ 日を足す</span></div>
<div class="row"><div class="g s">まだありません</div></div>"""
r2 = """<div class="lab">候補</div>
<div class="row"><div class="g">4/30(金) を休むと 7連休<span class="tag long">長め</span> <span class="s">4/29〜5/5</span></div><div class="btn">日程に入れる</div></div>
<div class="row"><div class="g">5/6(木) を休むと 6連休<span class="tag long">長め</span> <span class="s">5/1〜5/6・<span style="color:#5b21b6">次の付与年から引く</span></span></div><div class="btn">日程に入れる</div></div>
<div class="lab">日程 <span class="add">＋ 日を足す</span></div>
<div class="row"><div class="g s">まだありません</div></div>"""
pcleg2 = legend2.replace('class="gr"', 'style="outline:2px solid #7c3aed;outline-offset:-1px"')
pc1 = pchead + sec("2026年 10〜12月", '長めの休暇: 12/26〜1/3（9連休）<span class="tag ok">あり</span>', cals(2026, (10, 11, 12)), legend, r4) \
    + sec("2027年 1〜3月", "長めの休暇: まだない", cals(2027, (1, 2, 3)), legend, r1) \
    + sec("2027年 4〜6月", "長めの休暇: まだない", cals(2027, (4, 5, 6)), pcleg2, r2, '<div style="font-size:10.5px;color:#5b21b6;margin-top:4px">5/1 から次の付与年（前の年と同じ 14日で計算中）<span class="add">日数を入れる</span></div>') \
    + '<div class="more">↓ 2027年 7〜9月 と続く</div>' + pcfoot
pc0head = '<div class="bar">連休プランナー <span>設定</span></div><div class="head"><div style="padding:9px 12px;border:1px dashed #0d9488;border-radius:8px;background:#f0fdfa"><b>有休の残りを出す</b><div class="s">付与日と日数を入れると、残りと、まだ日を決めていない日数が出ます。</div><span style="display:inline-block;margin-top:6px;background:#0d9488;color:#fff;border-radius:6px;padding:4px 12px;font-size:11.5px">付与日と日数を入れる</span></div><div class="lb"><span class="t">長めの休暇（土日と祝日だけで計算）</span><span class="chip none">10〜12月 まだ</span><span class="chip none">1〜3月 まだ</span><span class="chip has">4〜6月 あり</span><span class="chip none">7〜9月 まだ</span></div></div>'
r0 = """<div class="lab">候補</div>
<div class="row"><div class="g">11/20(金) を休むと 4連休 <span class="s">11/20〜11/23</span></div><div class="btn">日程に入れる</div></div>
<div class="row"><div class="g">12/31(木) を休むと 4連休 <span class="s">12/31〜1/3</span></div><div class="btn">日程に入れる</div></div>
<div class="lab">日程 <span class="add">＋ 日を足す</span></div>
<div class="row"><div class="g s">まだありません</div></div>"""
pc0 = pc0head + sec("2026年 10〜12月", "長めの休暇: まだない", pc_empty_cals, legend0, r0) + '<div class="more">↓ 2027年 1〜3月、4〜6月、7〜9月 と続く</div>' + pcfoot

sec4 = sec("2026年 10〜12月", '長めの休暇: 12/26〜1/3（9連休）<span class="tag ok">あり</span>', cals(2026, (10, 11, 12)), legend, r4)
def pcmodal(base, dlg):
    return f'<div class="pc modal">{base}<div class="dim"></div><div class="dlg">{dlg}</div></div>'
dlg_add = """<h5>日程に入れる</h5>
  <div class="kv"><span>休む日</span><span>11/20(金) 1日</span></div>
  <div class="kv"><span>連休</span><span>11/20〜11/23 の 4連休</span></div>
  <div class="kv"><span>引く休暇</span><span>有休（残り 9日2時間）</span></div>
  <div class="kv"><span>未割り当て</span><span>7日2時間 → 6日2時間</span></div>
  <div class="kv"><span>予定の名前</span><span class="in" style="width:170px">任意</span></div>
  <div class="acts"><span class="no">やめる</span><span class="go">予定に入れる</span></div>"""
dlg_edit = """<h5>12/28(月) の日程</h5>
  <div class="kv"><span>量</span><span class="seg"><span class="on">1日</span><span>半日</span><span>時間で入れる</span></span></div>
  <div class="kv"><span>引く休暇</span><span>有休 ▾</span></div>
  <div class="kv"><span>予定の名前</span><span class="in" style="width:170px;color:#1f2937">年末年始</span></div>
  <div class="kv"><span>状態</span><span class="seg"><span class="on">予定</span><span>取得済み</span></span></div>
  <div class="kv"><span>連休</span><span>12/26〜1/3 の 9連休</span></div>
  <div class="kv"><span>カレンダー</span><span class="lnk">Google カレンダーに追加</span></div>
  <div class="acts"><span class="del">この日程を消す</span><span class="no">やめる</span><span class="go">保存する</span></div>"""
dlg_grant = """<h5>有休の付与日と日数</h5>
  <div class="kv"><span>付与日</span><span><span class="in" style="color:#1f2937">5月</span> <span class="in" style="color:#1f2937">1日</span></span></div>
  <div class="kv"><span>付与日数</span><span><span class="in" style="color:#1f2937">14</span> 日</span></div>
  <div class="kv"><span>前の年からの繰り越し</span><span><span class="in">0</span> 日（任意）</span></div>
  <div style="color:#6b7280;font-size:11px;padding-top:10px;border-top:1px solid #e5e7eb">入れた内容は、このブラウザの中にだけ保存します。運営には送られません。</div>
  <div class="acts"><span class="no">やめる</span><span class="go">残りを出す</span></div>"""
pc2 = pcmodal(pchead + sec4, dlg_add)
pc3 = pcmodal(pchead + sec4, dlg_edit)
pc4 = pcmodal(pc0head + sec("2026年 10〜12月", "長めの休暇: まだない", pc_empty_cals, legend0, r0), dlg_grant)

def phone(n, title, why, inner, fixed=False):
    st = "" if fixed else ' style="height:auto;padding-bottom:10px"'
    return f'<div class="ph-col"><h3>{n}. {title}</h3><p class="why">{why}</p><div class="ph"{st}>{inner}</div></div>'

PAGE = """<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>連休プランナー 画面のモック（2026-11-15）</title>
<style>
body{font-family:-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;background:#f9fafb;color:#111827;margin:0;padding:24px 28px 60px;line-height:1.6}
h1{font-size:20px;margin:0 0 6px}h2{font-size:17px;margin:34px 0 4px;border-left:4px solid #0d9488;padding-left:10px}
.note{font-size:13px;color:#4b5563;max-width:900px}.note li{margin:2px 0}
.lnk{color:#0d9488}
</style>
"""

html = PAGE + CSS + f"""</head><body>
<h1>連休プランナー 画面のモック（2026-11-15）</h1>
<div class="note">
<p>画面定義書（13）のブレストで決めた配置を、スマホと PC で並べたものです。例は、付与日 5/1・有休 14 日・会社の休日 12/30〜1/3 を登録した人が、2026 年 11 月に開いた画面です（5 と 6、PC の 2 枚目は、何も設定していない人）。</p>
<ul>
<li><b>文言は仮です。</b>「未割り当て」「長めの休暇」「候補」「日程」などは要求定義書の用語のままで、利用者に伝わる言葉への言い換えは、配置が固まったあとにまとめて決めます。</li>
<li>色、文字の大きさ、余白は決めていません。配置と、何をどこに出すかを見るための絵です。</li>
<li>スマホの 3・4・6 は、下から出る面を重ねた状態です。その 3 枚だけ、枠の高さを実機に近い長さで切っています。ほかは、スクロールした先まで全部見えるように縦に伸ばしています。</li>
</ul>
</div>

<h2>スマホ</h2>
<div class="ph-wrap">
{phone(1, "主な画面（10〜12月のタブ）", "上から、持ち分、長めの休暇の 1 行、四半期のタブ、タブの中身（長めの休暇、月カレンダー、候補、日程）、祝日の 1 行。過ぎた四半期は、タブの左の「‹ 前」で見返す。日程は 1 日 1 行で、同じ連休の日程は連休の見出しの下にまとめる。", sp1)}
{phone(2, "付与日がある四半期（4〜6月のタブ）", "付与日はカレンダーの日付に紫の枠。次の年の日数が未入力なら「前の年と同じ 14日で計算中」と出す。5/1 以降を休む候補には「次の付与年から引く」。", sp2)}
{phone(3, "「日程に入れる」を押した面", "下から出る面で、休む日・連休・引く休暇・未割り当ての変化を確かめてから入れる。予定の名前もここで入れられる。", sp3, True)}
{phone(4, "日程を押した面", "量、引く休暇、予定の名前、状態を直す。Google カレンダーへの追加と、消す操作もここ。「＋ 日を足す」は、日付の欄が加わった同じ面。", sp4, True)}
</div>
<div class="ph-wrap">
{phone(5, "何も設定していない人の主な画面", "候補は土日と祝日だけで計算して出す。持ち分の場所に、付与日と日数の入力を誘うカードを置く。", sp5)}
{phone(6, "付与日と日数を入れる面", "誘いのカードを押すと下から出る。付与日、付与日数、繰り越し（任意）。ボタンの上に、ブラウザの中にだけ保存して運営には送らないことを 1 行で伝える。", sp6, True)}
{phone(7, "設定の面", "主な画面とは別の 1 枚。有休、所定労働時間、会社の休日、休暇の種類、記録の持ち出し、祝日について。", sp7)}
</div>

<h2>PC</h2>
<div class="pcw">
<h3>8. 主な画面（設定済み）</h3><p class="why">タブを置かず、4 つの四半期を縦に並べる。カレンダーを左、候補と日程を右。過ぎた四半期は、いちばん下の「過ぎた四半期の記録を見る」から開く（めったに押さないので、目立つ場所に置かない。スマホはタブの左の「‹ 前」）。</p>
<div class="pc">{pc1}</div>
<h3>9. 主な画面（何も設定していない人）</h3><p class="why">持ち分の場所に誘いのカード。ほかはスマホの 5 と同じ内容。</p>
<div class="pc">{pc0}</div>
<h3>10. 「日程に入れる」を押した面</h3><p class="why">PC では、面を下からでなく画面の中央に出す。中身はスマホの 3 と同じ。ボタンは右下に並べる。</p>
{pc2}
<h3>11. 日程を押した面</h3><p class="why">中身はスマホの 4 と同じ。「この日程を消す」は左下に離して置く。</p>
{pc3}
<h3>12. 付与日と日数を入れる面</h3><p class="why">何も設定していない人が、誘いのカードを押したところ。中身はスマホの 6 と同じ（保存先を伝える 1 行も同じ）。</p>
{pc4}
</div>
</body></html>
"""
open(out, "w", encoding="utf-8").write(html)
