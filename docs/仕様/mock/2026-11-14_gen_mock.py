import calendar
import datetime as dt
import sys

out = sys.argv[1]
D = dt.date

holidays = {
    D(2026, 5, 3), D(2026, 5, 4), D(2026, 5, 5), D(2026, 5, 6), D(2026, 7, 20), D(2026, 8, 11),
    D(2026, 9, 21), D(2026, 9, 22), D(2026, 9, 23), D(2026, 10, 12), D(2026, 11, 3), D(2026, 11, 23),
    D(2027, 1, 1), D(2027, 1, 11), D(2027, 2, 11), D(2027, 2, 23), D(2027, 3, 22), D(2027, 4, 29),
}
company = {D(2026, 12, 30), D(2026, 12, 31), D(2027, 1, 2), D(2027, 1, 3)}
done = {D(2026, 5, 15), D(2026, 5, 21), D(2026, 6, 22), D(2026, 8, 10), D(2026, 9, 4), D(2026, 10, 7), D(2026, 11, 2)}
planned = {D(2026, 12, 28), D(2026, 12, 29)}
cand = {D(2026, 11, 20), D(2027, 2, 12), D(2027, 2, 22), D(2027, 3, 19)}

CSS = """
<style>
.yk{background:#fff;color:#1f2937;font-size:13px;line-height:1.5;padding:14px;border-radius:6px}
.yk h4{margin:0 0 6px;font-size:14px}
.yk .band{display:flex;gap:18px;flex-wrap:wrap;padding:8px 12px;background:#f3f4f6;border-radius:6px;margin-bottom:12px}
.yk .band b{font-size:16px}
.yk .q{border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;margin-bottom:10px;display:flex;gap:16px;flex-wrap:wrap}
.yk .q .l{flex:1 1 380px;min-width:300px}
.yk .q .r{display:flex;gap:10px;flex-wrap:wrap}
.yk .tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:10px;margin-left:6px}
.yk .ng{background:#fef3c7;color:#92400e}.yk .ok{background:#d1fae5;color:#065f46}
.yk .long{background:#ede9fe;color:#5b21b6}
.yk .row{display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px dashed #e5e7eb}
.yk .row .g{flex:1}
.yk .btn{font-size:11px;border:1px solid #0d9488;color:#0d9488;border-radius:4px;padding:1px 8px;white-space:nowrap}
.yk .sub{color:#6b7280;font-size:11px}
.yk table.c{border-collapse:collapse;font-size:11px}
.yk table.c caption{font-weight:600;text-align:left;padding-bottom:2px}
.yk table.c td,.yk table.c th{width:22px;height:20px;text-align:center;padding:0}
.yk table.c th{color:#9ca3af;font-weight:400}
.yk .off{background:#fee2e2;color:#b91c1c}
.yk .co{background:#e0e7ff;color:#3730a3}
.yk .dn{background:#0d9488;color:#fff;border-radius:3px}
.yk .pl{box-shadow:inset 0 0 0 2px #0d9488;border-radius:3px}
.yk .cd{box-shadow:inset 0 0 0 2px #f59e0b;border-radius:3px;background:#fffbeb}
.yk .big table.c td,.yk .big table.c th{width:30px;height:26px;font-size:12px}
.yk .grid{display:grid;grid-template-columns:repeat(4,auto);gap:14px;justify-content:start}
.yk .leg span{display:inline-block;padding:0 6px;margin-right:8px;font-size:11px}
.yk .two{display:flex;gap:18px;flex-wrap:wrap}
.yk .side{flex:1 1 260px;min-width:240px}
</style>
"""


def cls(d):
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


def month(y, m):
    cal = calendar.Calendar(firstweekday=6)
    h = f'<table class="c"><caption>{y}年{m}月</caption><tr>' + "".join(f"<th>{w}</th>" for w in "日月火水木金土") + "</tr>"
    for week in cal.monthdatescalendar(y, m):
        h += "<tr>"
        for d in week:
            if d.month != m:
                h += "<td></td>"
            else:
                h += f'<td class="{cls(d)}">{d.day}</td>'
        h += "</tr>"
    return h + "</table>"


legend = (
    '<div class="leg"><span class="off">土日・祝日</span><span class="co">会社の休日</span>'
    '<span class="dn">取得済み</span><span class="pl">予定</span><span class="cd">候補</span></div>'
)
band = (
    '<div class="band"><div>有休 残り <b>9日2時間</b> <span class="sub">予定 2日 ・ 未割り当て 7日2時間</span></div>'
    '<div>夏季休暇 残り <b>0日</b> <span class="sub">7〜9月 ・ 使い切り</span></div></div>'
)


def row(text, span, long=False, btn="日程に入れる", sub=""):
    t = '<span class="tag long">長め</span>' if long else ""
    b = f'<span class="btn">{btn}</span>' if btn else ""
    return f'<div class="row"><div class="g">{text}{t} <span class="sub">{span}{sub}</span></div>{b}</div>'


A = f"""
<div class="yk">{band}
<div class="q"><div class="l">
<h4>2026年 10〜12月 <span class="tag ok">長めの休暇: 12/26〜1/3（9連休）</span></h4>
<div class="sub">候補</div>
{row('11/20(金) を休むと 4連休', '11/20〜11/23')}
<div class="sub" style="margin-top:6px">日程</div>
{row('10/7(水) 2時間 体調不良', '取得済み', btn='')}
{row('11/2(月) 1日 連休作成', '取得済み ・ 10/31〜11/3 の 4連休', btn='')}
{row('12/28(月)・29(火) 2日 年末年始', '予定 ・ 12/26〜1/3 の 9連休', long=True, btn='')}
</div><div class="r">{month(2026,10)}{month(2026,11)}{month(2026,12)}</div></div>
<div class="q"><div class="l">
<h4>2027年 1〜3月 <span class="tag ng">長めの休暇: まだない</span></h4>
<div class="sub">候補</div>
{row('2/12(金) を休むと 4連休', '2/11〜2/14')}
{row('2/22(月) を休むと 4連休', '2/20〜2/23')}
{row('3/19(金) を休むと 4連休', '3/19〜3/22')}
{row('2/12(金)・2/15(月)〜19(金)・2/22(月) を休むと 13連休', '2/11〜2/23 ・ 有休 7日', long=True)}
<div class="sub" style="margin-top:6px">日程</div>
<div class="row sub">まだありません <span class="btn" style="margin-left:8px">日を足す</span></div>
</div><div class="r">{month(2027,1)}{month(2027,2)}{month(2027,3)}</div></div>
{legend}</div>
"""

months = [(2026, m) for m in range(5, 13)] + [(2027, m) for m in range(1, 5)]
B = f"""
<div class="yk">{band}
<div style="margin-bottom:8px">四半期の長めの休暇
<span class="tag ok">4〜6月 あり</span><span class="tag ok">7〜9月 あり</span><span class="tag ok">10〜12月 あり</span><span class="tag ng">1〜3月 まだない</span></div>
<div class="two"><div class="big"><div class="grid">{''.join(month(y,m) for y,m in months)}</div>
<div class="sub" style="margin-top:6px">日を押すと、その日に休暇を入れる・外す</div></div>
<div class="side"><h4>候補（得な順）</h4>
{row('11/20(金) を休むと 4連休', '11/20〜11/23')}
{row('2/12(金) を休むと 4連休', '2/11〜2/14')}
{row('2/22(月) を休むと 4連休', '2/20〜2/23')}
{row('3/19(金) を休むと 4連休', '3/19〜3/22')}
<div class="sub" style="margin-top:6px">候補を押すと、カレンダーのその日が光る</div>
</div></div>
{legend}</div>
"""

html = f"""{CSS}
<h2>画面の主役をどちらにしますか</h2>
<p class="subtitle">付与日 5/1・有休 14日・会社の休日 12/30〜1/3 を登録した人の画面です。数字と日付はシートの記録をもとにした例です。配置を比べるための絵で、色や細部はまだ決めていません。</p>

<div class="section"><h3>A. 四半期ごとの一覧が主役</h3>
<p class="subtitle">四半期ごとに、長めの休暇があるか・候補・日程が並ぶ。横の小さなカレンダーで連休の形を確かめる。</p>
<div class="mockup"><div class="mockup-header">A: 一覧 ＋ 小さなカレンダー</div><div class="mockup-body">{A}</div></div></div>

<div class="section"><h3>B. 年間カレンダーが主役</h3>
<p class="subtitle">付与日から 12 か月のカレンダーが並び、日を押して休暇を入れる。候補は横の一覧に出る。</p>
<div class="mockup"><div class="mockup-header">B: 年間カレンダー ＋ 候補の一覧</div><div class="mockup-body">{B}</div></div></div>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)"><div class="letter">A</div><div class="content"><h3>四半期ごとの一覧が主役</h3><p>候補と「四半期に 1 度」が中心に来る</p></div></div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)"><div class="letter">B</div><div class="content"><h3>年間カレンダーが主役</h3><p>1 年の休みの形が一目で見える</p></div></div>
</div>
"""
open(out, "w").write(html)
