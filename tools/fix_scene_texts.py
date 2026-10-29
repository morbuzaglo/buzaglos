"""One-off: gives the two existing generated scenes (party_scene, garden_burger) their own prop texts and per-scene character lines,
so reused characters never repeat lines from other levels. Marks them gen=True so the validator keeps enforcing it."""
import json

def load(n): return json.load(open(f'content/{n}.json', encoding='utf-8'))
def save(n, d):
    with open(f'content/{n}.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1); f.write('\n')

maps = load('maps'); npcs = load('npcs')

PARTY_PROPS = {
    'photo_screen': 'מסך שמציג תמונות מהחיים של מעיין. נעם זוכרת כל אחת, מעיין אף אחת.',
    'snack_bar': 'הכיבוד: נשנושים ומשקאות. מתן כבר דירג אותם בראש.',
    'sofa': ['ספה נוחה. אפשר לנוח כאן מהחקירה של נעם.', 'ספה פנויה בפינה. נעם בוחרת לשבת בצד ולהסתכל.'],
    'table': ['שולחן עם כוסות. מישהו שכח כאן כוס חצי מלאה.'],
    'lamp': ['מנורה שמטילה אור צבעוני על הרחבה.', 'אורות המסיבה מהבהבים בקצב המוזיקה.'],
    'plant': ['עציץ שספג יותר מדי מוזיקה בערב הזה.', 'עציץ ליד הקיר. גם הוא לא רוקד.'],
    'shelf': ['מדף עם תקליטים ותמונות מהמסיבות הקודמות.'],
}
PARTY_NPCS = {
    'maayan': ['אני כאן עם נעם ומתן. נעם זוכרת הכול עליי, ואני לא זוכרת כלום.', 'תגידו, מה אכלתי היום? נעם בטח יודעת.'],
    'party_dj': ['מי רוצה בקשה? אני לוקח בקשות!', 'הרחבה פתוחה לכולם.'],
}
BURGER_PROPS = {
    'garden_table': 'שולחן הגינה. אחרי הארוחה נשארו עליו צלחות, ומעט בצל.',
    'grill': 'הגריל של אבא. עדיין חם, ויש בו ריח של בצל.',
    'menu_sign': 'שלט: ״הערב בגינה: המבורגרים. מרכיב סוד: בצל.״',
    'tree': ['עץ בגינה של ההורים. נותן צל ושומע את כל הסודות.'],
    'bush': ['שיח שנראה כאילו הוא מתחבא מפני הבצל.'],
    'umbrella': ['שמשייה שמגנה על הארוחה מפני השמש, אבל לא מפני הבצל.'],
    'lamp': ['פנס גינה שמאיר את שולחן הארוחה.'],
    'plant': ['עציץ בגינה. נראה שמישהו חתך לידו הרבה בצל.'],
    'mat': ['שטיחון ליד הכניסה לגינה.'],
}
BURGER_NPCS = {
    'terry': ["Mom's burgers, huh? Eden says they're famous.", "I'm staying out of the onion debate."],
    'mordechai': ['אני רעב, ואני בודק כל ביס לפני שאני אוכל.', 'שמישהו יגיד לי: יש כאן בצל?'],
    'eden': ['אמא, זה באמת תפוחי אדמה?', 'טרי, אל תתערב בוויכוח של המשפחה על הבצל.'],
    'anat': ['הכנתי הרבה המבורגרים. מי רוצה עוד?', 'זה תפוחי אדמה. נקודה.'],
    'yitzhak': ['הגריל מוכן. מי רוצה להפוך אותם אחד אחד?', 'אני לא נכנס למחלוקת על בצל, אני רק מפעיל את הגריל.'],
    'yard_neighbor': ['איזה ריח מהגינה שלכם! אני מריח גם בצל?', 'הגריל שלכם מעורר תיאבון בכל השכונה.'],
}

def apply(mid, prop_texts, npc_lines):
    m = maps[mid]; m['gen'] = True
    for p in m['props']:
        if p.get('id') == 'exit': continue
        key = p.get('id') if p.get('id') in prop_texts else p['type']
        t = prop_texts.get(key)
        if t:
            p['interact'] = {**(p.get('interact') or {}), 'text': t}
    for n in m['npcs']:
        if n['id'] in npc_lines: n['phrases'] = npc_lines[n['id']]
        elif npcs[n['id']].get('phrases'): n['phrases'] = npcs[n['id']]['phrases']   # characters made for this very story

apply('party_scene', PARTY_PROPS, PARTY_NPCS)
apply('garden_burger', BURGER_PROPS, BURGER_NPCS)
save('maps', maps)
print('ok')
