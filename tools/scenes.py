"""Story scenes for BUZAGLOS: every family story is its own playable map with steps and mini-games.
Run via tools/gen_maps.py (which calls build()). Hebrew text; {f:..|m:..} addresses the player by gender."""

LEG_EXTRA = {'S': 'stone', 'T': 'tatami', 'A': 'asphalt', 'L': 'lane', 'Q': 'pool', 'D': 'deck', 'K': 'kotel', 'C': 'cloud'}
BASE_LEG = {'g': 'grass', 'f': 'flower', 'p': 'path', '.': 'wood', 't': 'tile', 'r': 'rug', '#': 'wall', 'W': 'wallface',
            '~': 'water', 's': 'sand', '=': 'fence', 'd': 'dark', 'c': 'carpet', '^': 'roof'}
LEG = {**BASE_LEG, **LEG_EXTRA}


class M:
    """tiny map builder"""
    def __init__(self, mid, name, w, h, base, music, spawn, border='#'):
        self.id, self.name, self.w, self.h, self.music, self.spawn = mid, name, w, h, music, spawn
        self.g = [[base] * w for _ in range(h)]
        self.props, self.npcs, self.pickups, self.doors = [], [], [], []
        if border:
            self.rect(0, 0, w, 1, border); self.rect(0, h - 1, w, 1, border); self.rect(0, 0, 1, h, border); self.rect(w - 1, 0, 1, h, border)

    def rect(self, x, y, w, h, ch):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if 0 <= yy < self.h and 0 <= xx < self.w:
                    self.g[yy][xx] = ch

    def prop(self, type_, x, y, **kw): self.props.append(dict(type=type_, x=x, y=y, **kw)); return self
    def npc(self, id_, x, y, d=0, **kw): self.npcs.append(dict(id=id_, x=x, y=y, dir=d, **kw)); return self
    def pick(self, id_, item, x, y, qid, hidden=False): self.pickups.append(dict(id=id_, item=item, x=x, y=y, hidden=hidden, needsQuest=qid)); return self
    def broken(self, x, y, n=1):
        return self.prop('sign', x, y, id=f'broken_{self.id}_{n}', ability='fix', flag=f'fixed_{self.id}_{n}', reward=dict(coins=15, xp=10), interact=dict(dialogue='broken_generic'))
    def exit(self, x, y): return self.prop('door', x, y, id='exit', interact=dict(action='exit'))

    def out(self):
        return dict(id=self.id, name=self.name, music=self.music, legend=LEG, tiles=[''.join(r) for r in self.g],
                    props=self.props, npcs=self.npcs, pickups=self.pickups, doors=self.doors, spawn=dict(x=self.spawn[0], y=self.spawn[1]))


def L(who, text): return dict(who=who, text=text)


def build():
    maps, quests, items, npcs = {}, {}, {}, {}

    def item(id_, name, icon, color, desc='', **kw): items[id_] = dict(id=id_, name=name, type='quest', icon=icon, color=color, desc=desc, **kw)
    def cast(id_, name, role, look, **kw): npcs[id_] = dict(id=id_, name=name, role=role, look=look, **kw)

    for k, (sk, hr, hs, sh, ac) in enumerate([('#f1d3b5', '#2b2b2b', 'short', '#ffffff', 'none'), ('#e8c9a8', '#5a3418', 'curly', '#4a6fa5', 'glasses'), ('#d9a679', '#8a8a90', 'short', '#e8e2d2', 'beard'), ('#f1d3b5', '#14141a', 'short', '#7a3a3a', 'none')], 1):
        cast('jp_man' if k == 1 else f'jp_man{k}', 'אחד מהמתפללים', 'דמות משנית', dict(skin=sk, hair=hr, hairStyle=hs, shirt=sh, pants='#2b2b3a', accessory=ac, hat='#101014', hatStyle='kippah'), phrases=['שלום עליכם!', 'מחפשים מניין? אני בעניין.'], noLabel=True)
    cast('agent', 'נציגת ההפלגה', 'דמות משנית', dict(skin='#e8c9a8', hair='#3a2415', hairStyle='bun', shirt='#2b5fa8', pants='#2b2b3a', accessory='none'), phrases=['ברוכים הבאים. יש רק צ׳ק-אין אחד לפני העלייה.'])
    cast('elior', 'אליאור', 'בעלה של רינת', dict(skin='#f1d3b5', hair='#3a2415', hairStyle='short', shirt='#ffffff', pants='#1c1c26', accessory='none', beardColor='#3a2415', hat='#101014', hatStyle='kippah'), phrases=['רינת מחכה לי, אני בדרך.'])
    cast('dispatcher', 'המוקדנית', 'קול בטלפון', dict(skin='#f1d3b5', hair='#7a2d1c', hairStyle='bun', shirt='#2fa39a', pants='#2b2b3a', accessory='none'))
    cast('yoav_kid', 'יואב (בן 4)', 'זיכרון', dict(skin='#f6dcc0', hair='#e8c25a', hairStyle='long', shirt='#4fc3f7', pants='#3a3a56', accessory='none'), scale=0.72, phrases=['...'])
    cast('guest', 'אורח', 'דמות משנית', dict(skin='#e8c9a8', hair='#5a3418', hairStyle='short', shirt='#8a8a99', pants='#2b2b3a', accessory='none'), phrases=['בלי תחפושות? בסדר, גם זה סגנון.'], noLabel=True)

    # ======================================================== 1. JAPAN (Dad + Mordechai)
    m = M('jp', 'יפן', 28, 16, 'S', 'beach', (3, 13))
    m.rect(2, 2, 9, 6, 'T'); m.rect(17, 7, 7, 6, 'r')
    m.exit(1, 13)
    m.prop('torii', 12, 6).prop('lantern', 9, 11).prop('lantern', 14, 11).prop('lantern', 4, 5).prop('lantern', 26, 4)
    m.prop('podium', 19, 9, id='sumo', interact=dict(dialogue='sumo_look'))
    for i, (x, y) in enumerate([(5, 12), (13, 13), (24, 4)], 1):
        m.prop('deer', x, y, id=f'deer{i}', gives='deer_photo', givesText='קליק! צילום מושלם של איל שמסתובב לו חופשי ברחוב.', emptyText='האיל כבר צולם. הוא קצת עייף מכל הפפראצי.')
    for i, (x, y) in enumerate([(3, 3), (5, 3), (7, 3), (3, 6), (5, 6), (8, 6), (14, 3), (21, 3), (24, 8), (22, 14)], 1):
        m.npc('jp_man' if i % 4 == 1 else f'jp_man{(i - 1) % 4 + 1}', x, y, 0, gives='minyan_man', uid=f'man{i}', givesText='״בשמחה! אני מצטרף למניין.״', emptyText='הוא כבר איתנו במניין.')
    m.broken(22, 12)
    maps['jp'] = m.out()
    item('deer_photo', 'צילום של איל', 'star', '#c58d4a', 'איל ביפן, ממש ברחוב.')
    item('minyan_man', 'משתתף למניין', 'toy', '#f4f4f8', 'עוד אחד לעשרה.')
    quests['q_japan'] = dict(id='q_japan', title='שלושה שבועות ביפן', summary='יצחק ומרדכי בטיול ליפן: איילים, סומו, ומניין שצריך להרכיב.', scene=dict(map='jp', x=3, y=13), maps=['jp'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'שלושה שבועות ביפן. הרחובות נקיים, האורות אדומים, והכול נראה כמו סרט.'), L('yitzhak', 'מרדכי, תראה: איילים הולכים ברחוב!'), L('mordechai', 'אבא, זו יפן. פה הכול אפשרי.'), L('yitzhak', 'רק דבר אחד חסר לי: מניין מסודר לתפילה.')]),
        dict(type='collect', item='deer_photo', count=3, text='לצלם 3 איילים שמסתובבים חופשי ברחוב.', hint='מתקרבים לאיל ולוחצים על A.'),
        dict(type='interact', target='sumo', text='להצטרף לקרב סומו בזירה.', lines=[L('narrator', 'המתאבק הענק נכנס לזירה. מרדכי צועק: ״אבא, תרים אותו!״')], minigame=dict(game='reaction', config=dict(targets=10, time=14, emoji='💪'))),
        dict(type='collect', item='minyan_man', count=10, text='לאסוף מניין: 10 אנשים לתפילה (מדברים עם אנשים ברחוב).', hint='כל אחד מהמתפללים מצטרף כשמדברים איתו.'),
        dict(type='cutscene', lines=[L('yitzhak', 'עשרה! יש מניין! ביפן! אין כמו זה.'), L('mordechai', 'אבא, אתה מאושר.'), L('yitzhak', 'ועוד יום אחד של סומו ואיילים. בואו נתפלל.')]),
        dict(type='minigame', auto=True, game='quiz', text='לענות על חידון הטיול.', config=dict(questions=[
            dict(q='לאן טסו יצחק ומרדכי?', a=['יפן', 'אוסטרליה', 'ספרד'], c=0), dict(q='כמה שבועות נמשך הטיול?', a=['שלושה', 'שבוע', 'שישה'], c=0),
            dict(q='מה לא אהב יצחק ביפן?', a=['שאין מניינים מסודרים לתפילות', 'שהיה קר מדי', 'שהאוכל חריף'], c=0), dict(q='מה ראו ברחוב?', a=['איילים', 'פילים', 'דובים'], c=0)]))],
        reward=dict(coins=40, xp=55, shard=dict(id='shard_japan', title='שלושה שבועות ביפן', story='יצחק ומרדכי טסו ליפן לשלושה שבועות מצחיקים ומטורפים: קרב סומו, איילים ברחוב, ומניין שאף אחד לא סידר.')))

    # ======================================================== 2. PHONE (Mom)
    m = M('mall', 'קניון השווקים', 26, 14, '.', 'town', (3, 11))
    m.rect(1, 1, 24, 1, 'W'); m.rect(2, 7, 22, 1, 'r')
    m.exit(1, 11)
    for i, (x, y, n) in enumerate([(4, 3, 'ביגוד'), (10, 3, 'תכשיטים'), (16, 3, 'נעליים'), (21, 3, 'קפה')], 1):
        m.prop('counter', x, y, id=f'stall{i}', interact=dict(dialogue=f'stall{i}'))
    m.prop('plant', 5, 9).prop('plant', 24, 9).prop('lamp', 13, 9)
    m.pick('phone_pk', 'phone_anat', 11, 5, 'q_phone', hidden=True)
    m.broken(7, 10)
    maps['mall'] = m.out()
    quests['q_phone'] = dict(id='q_phone', title='איפה הטלפון?!', summary='אמא שוב שכחה את הטלפון באחת החנויות.', scene=dict(map='mall', x=3, y=11), maps=['mall'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'שוק גדול, ארבע חנויות, ואמא מתמקחת בכל אחת.'), L('anat', 'כמה זה עולה? בחצי?'), L('narrator', 'שעה אחר כך, ליד הקופה האחרונה...'), L('anat', 'רגע. איפה הטלפון שלי?! אוי, אוי, אוי!')]),
        dict(type='minigame', auto=True, game='sequence', text='להיזכר באיזה סדר ביקרנו בחנויות.', lines=[L('narrator', 'צריך לשחזר: באיזו חנות היא הייתה ובאיזה סדר?')], config=dict(icons=['👗', '💍', '👟', '☕'], length=4, watch='מסתכלים באיך אמא עברה בין החנויות...', repeat='עכשיו חוזרים על המסלול!')),
        dict(type='collect', item='phone_anat', count=1, text='למצוא את הטלפון של אמא באחת החנויות.', hint='הוא מבריק כשמתקרבים. למי שיש יכולת גילוי, אפשר ללחוץ B.'),
        dict(type='cutscene', lines=[L('anat', 'הטלפון שלי! אוי, כמה נבהלתי. מכל החנויות בעולם, דווקא בתכשיטים.'), L('player', 'אולי כדאי לתלות אותו על הצוואר?'), L('anat', 'אולי. אבל אז איפה אני אשים את התכשיטים?')])],
        reward=dict(coins=30, xp=45, shard=dict(id='shard_phone', title='איפה הטלפון?!', story='אמא שוב שכחה את הטלפון בחנות והתחילה להיבהל, עד שמישהו מצא אותו.')))
    item('phone_anat', 'הטלפון של אמא', 'phone', '#e84b4b', 'נשכח שוב בחנות.')

    # ======================================================== 3. BARCELONA (Mom + siblings)
    m = M('airport', 'שדה תעופה בשוויץ', 24, 12, 'S', 'town', (3, 9))
    m.rect(1, 1, 22, 1, 'W'); m.exit(1, 9)
    m.prop('desk', 10, 4, id='rental', interact=dict(dialogue='rental_look')).prop('sign', 18, 4, interact=dict(dialogue='gate_sign'))
    m.prop('car', 17, 9, id='rental_car', interact=dict(dialogue='car_look')).prop('suitcase', 15, 9).prop('suitcase', 20, 9)
    for i, (x, y) in enumerate([(5, 5), (13, 8), (21, 6)], 1): m.pick(f'cloth{i}', 'cloth', x, y, 'q_barcelona', hidden=(i > 1))
    m.broken(12, 5)
    maps['airport'] = m.out()
    m = M('road', 'הדרך לברצלונה', 12, 8, 'A', 'town', (2, 4)); m.rect(0, 3, 12, 2, 'L'); maps['road'] = m.out()
    m = M('port', 'נמל ברצלונה', 22, 12, 'D', 'beach', (2, 9))
    m.rect(0, 0, 22, 4, '~'); m.prop('ship', 12, 6, id='ship'); m.exit(1, 9)
    maps['port'] = m.out()
    item('cloth', 'בגד לקשירת מזוודות', 'shirt', '#e8a13a', 'יחזיק את המזוודה על הגג.')
    quests['q_barcelona'] = dict(id='q_barcelona', title='בדרך לברצלונה', summary='מפספסים קונקשן בשוויץ, וצריך להגיע להפלגה עד מחר בבוקר.', scene=dict(map='airport', x=3, y=9), maps=['airport', 'road', 'port'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'אמא והאחים והאחיות שלה בדרך לברצלונה, עם קונקשן בשוויץ.'), L('anat', 'מה זאת אומרת פספסנו את הטיסה?!'), L('anat', 'ההפלגה יוצאת מחר בבוקר! חייבים להגיע לברצלונה, גם אם זה יהיה בנסיעה.')]),
        dict(type='interact', target='rental', text='לגשת לדלפק השכרת הרכב.', lines=[L('narrator', 'הנציג מושיט מפתחות לרכב קטן.'), L('anat', 'ניקח אותו. אנחנו מסתדרים.')]),
        dict(type='collect', item='cloth', count=3, text='למצוא 3 בגדים לקשירת המזוודות (אין מקום בתוך הרכב).', hint='מסתכלים מתחת לספסלים. חלק נסתרים.'),
        dict(type='interact', target='rental_car', text='לקשור את המזוודות לגג הרכב.', lines=[L('anat', 'מהר, לפני שהן יעופו!')], minigame=dict(game='timing', config=dict(rounds=3, speed=1.2, zone=0.24)), consume='cloth', consumeCount=3),
        dict(type='teleport', map='road', x=2, y=4),
        dict(type='minigame', auto=True, game='drive', text='לנסוע שעות עד ברצלונה בלי להפיל את המזוודות.', lines=[L('narrator', 'שעות של נסיעה, מזוודות קשורות לגג, ואף אחד לא מוכן להחליף נהג.')], config=dict(time=18, car='🚗', obstacles=['🚧', '🐑', '🛢️', '🚚'])),
        dict(type='teleport', map='port', x=2, y=9),
        dict(type='goto', map='port', x=12, y=9, radius=3, text='להגיע לספינה לפני שהיא יוצאת.'),
        dict(type='cutscene', lines=[L('anat', 'הגענו! בדיוק בזמן.'), L('narrator', 'המזוודות עדיין על הגג, קשורות בבגדים. הספינה שורקת.'), L('anat', 'אמרתי לכם: תמיד יש פתרון.')])],
        reward=dict(coins=45, xp=60, shard=dict(id='shard_barcelona', title='בדרך לברצלונה', story='אמא והאחים והאחיות שלה פספסו קונקשן בשוויץ, שכרו רכב, נסעו שעות עד ברצלונה וקשרו את המזוודות לגג עם בגדים, כדי להספיק להפלגה.')))

    # ======================================================== 4. CRUISE (Yoav, corona suspicion, Mordechai as lawyer)
    m = M('terminal', 'מסוף ההפלגות', 24, 12, 'S', 'beach', (3, 9))
    m.rect(0, 0, 24, 3, '~'); m.exit(1, 9)
    m.prop('ship', 14, 4, id='ship2'); m.prop('desk', 6, 6, id='checkin', interact=dict(dialogue='checkin_look'))
    m.npc('agent', 9, 8, 0)
    for i, (x, y) in enumerate([(4, 4), (12, 9), (20, 8)], 1): m.pick(f'form{i}', 'form', x, y, 'q_cruise', hidden=(i == 3))
    m.broken(10, 9)
    maps['terminal'] = m.out()
    item('form', 'טופס צ׳ק-אין', 'book', '#f4f4f8', 'מסמך שהנציגה ביקשה.')
    quests['q_cruise'] = dict(id='q_cruise', title='הפלגה עם סיפור', summary='כמעט לא העלו את יואב להפלגה. הפתרון הגיע בטלפון.', scene=dict(map='terminal', x=3, y=9), maps=['terminal'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'אמא, טוהר, רינת ויואב מגיעים לנמל בחו״ל, מוכנים להפלגה.'), L('agent', 'רגע. יואב משתעל, ויש חשד לקורונה. אני לא יכולה להעלות אתכם.'), L('anat', 'מה?! אנחנו כבר מחכים לזה חודשים!')]),
        dict(type='choice', who='agent', question='הנציגה חוסמת את העלייה. מה עושים?', options=[
            dict(text='לצעוק עליה עד שתוותר', reply=[L('agent', 'צעקות לא עוזרות. אני עדיין צריכה אישור.')]),
            dict(text='להתקשר למרדכי, שיתחזה לעורך דין', correct=True, reply=[L('mordechai', 'שלום, כאן עורך הדין של המשפחה. אני מבקש לדבר עם האחראית.'), L('agent', 'עורך דין?! רגע, אני בודקת.')]),
            dict(text='לחזור הביתה עם המזוודות', reply=[L('anat', 'אין מצב. הגענו עד כאן, אנחנו מנסים עוד.')])]),
        dict(type='collect', item='form', count=3, text='להביא לנציגה 3 טפסים שהיא מבקשת (בנמל).', hint='אחד מהם נסתר.'),
        dict(type='cutscene', lines=[L('agent', 'הכול מסודר. ועורך הדין שלכם... משכנע מאוד.'), L('anat', 'הוא עורך דין מצוין, זה בטוח.'), L('narrator', 'אחרי הרבה שכנועים, הנציגה מרשה. מרדכי, בצד השני של הקו, מחייך.')]),
        dict(type='goto', map='terminal', x=14, y=7, radius=3, text='לעלות על הספינה!'),
        dict(type='cutscene', lines=[L('yoav', '...'), L('anat', 'עלינו! כולם איתי?'), L('tohar', 'כולנו כאן, אמא.')])],
        reward=dict(coins=45, xp=60, shard=dict(id='shard_cruise', title='הפלגה עם סיפור', story='כמעט לא העלו את יואב להפלגה כי חשבו שיש לו קורונה. אחרי שכנועים, ומרדכי שהתחזה לעורך דין בטלפון, הם בכל זאת עלו.')))

    # ======================================================== 5. FRIDAY DINNER (Mom + Dad)
    m = M('dining', 'ארוחת שישי', 24, 14, '.', 'home', (3, 11))
    m.rect(1, 1, 22, 1, 'W'); m.rect(1, 2, 8, 4, 't'); m.rect(10, 6, 12, 5, 'r'); m.exit(1, 11)
    m.prop('fridge', 1, 2).prop('stove', 2, 2, id='fish', interact=dict(dialogue='fish_look')).prop('counter', 4, 2).prop('table', 12, 8).prop('table', 15, 8).prop('table', 18, 8)
    for i, (x, y) in enumerate([(4, 4), (6, 4), (8, 4), (5, 5), (7, 5), (9, 5), (11, 3), (14, 3), (17, 3), (20, 3), (21, 6), (11, 12)], 1): m.pick(f'salad{i}', 'salad', x, y, 'q_dinner', hidden=(i % 4 == 0))
    m.broken(20, 11)
    maps['dining'] = m.out()
    item('salad', 'סלט', 'food', '#5be37d', 'אחד מ-12 סוגי הסלטים.')
    quests['q_dinner'] = dict(id='q_dinner', title='ארוחת שישי: 12 סלטים', summary='אמא מבשלת, אבא אומר דבר תורה, ובכל זאת צריך עזרה.', scene=dict(map='dining', x=3, y=11), maps=['dining'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'ליל שישי. ריח של דג מרוקאי מציף את הבית.'), L('anat', 'אני מכינה 12 סוגי סלטים, בכל הצבעים. מי עוזר לי להוציא אותם?')]),
        dict(type='collect', item='salad', count=12, text='לאסוף את כל 12 הסלטים מהמטבח ומהשולחנות.', hint='כמה מהם מוסתרים. יכולת מגלה עוזרת.'),
        dict(type='interact', target='fish', text='להשגיח על הדג המרוקאי בכיריים.', lines=[L('anat', 'לא לשכוח אותו! דג מרוקאי לא סולח.')], minigame=dict(game='timing', config=dict(rounds=3, speed=1.1, zone=0.26))),
        dict(type='cutscene', lines=[L('narrator', 'כולם סביב השולחן. 12 סלטים, דג, וריח של שישי.'), L('yitzhak', 'לפני שמתחילים: דבר תורה.'), L('anat', 'כמו בכל ארוחה.'), L('yitzhak', 'ואחריו, כמובן, בדיחת קרש.')]),
        dict(type='choice', who='narrator', question='מה אבא חייב לעשות בכל ארוחה?', options=[
            dict(text='להגיד דבר תורה', correct=True, reply=[L('yitzhak', 'בדיוק! ועכשיו, לאכול.')]),
            dict(text='לטוס לחו״ל', reply=[L('anat', 'את זה אני עוד צריכה לשכנע אותו לעשות.')]),
            dict(text='לצלם את הסלטים', reply=[L('anat', 'אני הצלמת במשפחה, אבל לא על הסלטים.')])])],
        reward=dict(coins=45, xp=60, shard=dict(id='shard_dinner', title='ארוחת שישי: 12 סלטים', story='בארוחת שישי אמא מגישה 12 סוגי סלטים צבעוניים ודג מרוקאי, ואבא, לפני שאוכלים, חייב להגיד דבר תורה.')))

    # ======================================================== 6. THE PICANTO (Tohar)
    m = M('city', 'כביש בעיר', 12, 8, 'A', 'town', (2, 4)); m.rect(0, 3, 12, 2, 'L'); maps['city'] = m.out()
    m = M('flat', 'דירה בקומה שלישית', 16, 10, 't', 'mystery', (3, 7))
    m.rect(0, 0, 16, 1, '#'); m.rect(1, 1, 14, 1, 'W'); m.exit(1, 7)
    m.prop('door', 8, 2, id='flat_door', interact=dict(dialogue='flat_door_look')).prop('plant', 12, 4)
    maps['flat'] = m.out()
    quests['q_pikanto'] = dict(id='q_pikanto', title='הפיקנטו', summary='הסיפור שבגללו המשפחה כולה צוחקת על טוהר והפיקנטו.', scene=dict(map='city', x=2, y=4), maps=['city', 'flat'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'לפני כמה שנים. טוהר חובשת במגן דוד אדום, כוננית, ונוהגת ברכב חירום: קיה פיקנטו.'), L('tohar', 'קריאה דחופה. נוסעים!')]),
        dict(type='minigame', auto=True, game='drive', text='להגיע לכתובת בפיקנטו, בלי להתנגש.', config=dict(time=15, car='🚙', obstacles=['🚧', '🐌', '🚦', '🛵'])),
        dict(type='teleport', map='flat', x=3, y=7),
        dict(type='interact', target='flat_door', text='להיכנס לדירה.', lines=[L('narrator', 'טוהר עולה בשקט לקומה השלישית ופותחת את הדלת. אין מה לעשות עבור האדם בדירה, וצריך לדווח.')]),
        dict(type='choice', who='tohar', question='טוהר מתקשרת למוקד ומדווחת. מה היא אומרת?', options=[
            dict(text='״הכול בסדר, אפשר להיות רגועים.״', reply=[L('dispatcher', 'בטוחה? תבדקי שוב.')]),
            dict(text='״מצאתי אדם שנפטר, במצב קישיון.״', correct=True, reply=[L('dispatcher', 'קישיון?!?!?! עם הפיקנטו?!?!?!'), L('tohar', 'המוקדנית לא האמינה שהגעתי בפיקנטו.')]),
            dict(text='״אני חוזרת לתחנה לאכול.״', reply=[L('dispatcher', 'תדווחי קודם.')])]),
        dict(type='cutscene', lines=[L('narrator', 'מאז, המשפט של המוקדנית הפך לבדיחה משפחתית.'), L('tohar', 'קישיון? עם הפיקנטו?! אני לא יכולה לשמוע את זה יותר.')])],
        reward=dict(coins=40, xp=55, shard=dict(id='shard_pikanto', title='הפיקנטו', story='טוהר נסעה כחובשת במגן דוד אדום בקיה פיקנטו, והמוקדנית צעקה בהלם: ״קישיון?!?! עם הפיקנטו?!?!״. מאז אנחנו צוחקים על זה.')))

    # ======================================================== 7. SEVEN MINUTES (Tohar + Mordechai)
    m = M('room', 'החדר של טוהר', 18, 12, '.', 'home', (3, 9))
    m.rect(1, 1, 16, 1, 'W'); m.rect(2, 6, 6, 4, 'c'); m.exit(1, 9)
    m.prop('bed', 14, 4).prop('shelf', 3, 2).prop('plant', 16, 2).prop('table', 8, 3)
    for i, (x, y) in enumerate([(5, 3), (9, 6), (13, 8), (3, 7), (15, 6), (10, 9), (7, 3)], 1): m.pick(f'ready{i}', 'ready_item', x, y, 'q_seven', hidden=(i in (3, 6)))
    m.broken(10, 4)
    maps['room'] = m.out()
    item('ready_item', 'משהו לצאת איתו', 'default', '#f4f4f8', 'בגד, תיק, מפתחות. הכול נחוץ.')
    quests['q_seven'] = dict(id='q_seven', title='שבע דקות', summary='מרדכי בדרך, וטוהר באמצע להתארגן.', scene=dict(map='room', x=3, y=9), maps=['room'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'אירוע משפחתי באולם. טוהר באמצע להתארגן. הטלפון מצלצל.'), L('mordechai', 'אני בדרך לאסוף אותך.'), L('tohar', 'כמה זמן?'), L('mordechai', 'שבע דקות.'), L('tohar', 'שבע דקותתת?!?! שבע דקותתתתת?!?!')]),
        dict(type='collect', item='ready_item', count=7, timeLimit=45, displaySeconds=420, text='לאסוף 7 דברים לפני שהשעון מגיע לאפס.', hint='שבע דקות הן בערך דקה בשעון הזה. מהר!', failLines=[L('narrator', 'השעון הגיע לאפס! מרדכי מצפצף מלמטה. מתחילים שוב.')]),
        dict(type='cutscene', lines=[L('narrator', 'פעמון הדלת. טוהר יוצאת, מסורקת, עם נעלי נייק לבנות.'), L('mordechai', 'שבע דקות בדיוק.'), L('tohar', 'אני תמיד אומרת: לחץ זה כיף.')])],
        reward=dict(coins=40, xp=55, shard=dict(id='shard_seven', title='שבע דקות', story='מרדכי התקשר לטוהר שהוא בדרך, ״שבע דקות״, והיא התחילה להתארגן ולהסתרק בטירוף.')))

    # ======================================================== 8. TERRY (Eden)
    m = M('hotelpool', 'בריכה במלון בתל אביב', 22, 14, 'S', 'beach', (3, 11))
    m.rect(8, 3, 11, 5, 'Q'); m.exit(1, 11)
    m.prop('umbrella', 4, 4).prop('umbrella', 20, 9).prop('umbrella', 5, 9).prop('plant', 20, 4)
    m.npc('terry', 6, 6, 3)
    maps['hotelpool'] = m.out()
    m = M('dubai', 'דובאי', 22, 12, 's', 'beach', (3, 9)); m.rect(0, 0, 22, 3, '~'); m.prop('ship', 12, 6, id='yacht'); m.exit(1, 9); maps['dubai'] = m.out()
    quests['q_terry'] = dict(id='q_terry', title='בריכה בתל אביב', summary='איך עדן הכירה את טרי, ומה קרה ביום שאחרי.', scene=dict(map='hotelpool', x=3, y=11), maps=['hotelpool', 'dubai'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'מלון ״סטאי״ בתל אביב. עדן יושבת ליד הבריכה.'), L('narrator', 'לא רחוק ממנה יושב טרי, אוסטרלי שהגיע לארץ לחתונה של חבר.')]),
        dict(type='talk', npc='terry', text='לגשת לטרי ליד הבריכה (הוא מדבר רק אנגלית).', lines=[L('terry', 'Hi! Nice pool, right?'), L('terry', "I'm only here for a friend's wedding, but I think I'm going to love this place."), L('player', 'Welcome to Israel!')]),
        dict(type='minigame', auto=True, game='memory', text='לשחק משחק זיכרון על הבריכה.', config=dict(pairs=6, faces=['🏊', '🍹', '☀️', '🌴', '✈️', '🏨']), lines=[L('narrator', 'השיחה נמשכת ונמשכת. בינתיים כל המלון עסוק במשחקי בריכה.')]),
        dict(type='cutscene', lines=[L('narrator', 'למחרת בבוקר.'), L('terry', 'What are you doing tomorrow? Want to fly to Dubai with me?')]),
        dict(type='choice', who='terry', question="So... want to fly to Dubai with me tomorrow?", options=[
            dict(text='Are you crazy? We just met!', reply=[L('terry', 'Come on, live a little!')]),
            dict(text="Why not? Let's go!", correct=True, reply=[L('terry', 'Amazing! Pack a bag!')]),
            dict(text='I need to ask my mother first.', reply=[L('terry', "Ha! Okay... but I'll wait.")])]),
        dict(type='teleport', map='dubai', x=3, y=9),
        dict(type='cutscene', lines=[L('narrator', 'דובאי. יום אחד אחרי שהכירו. סיפור מטורף.'), L('terry', 'Best decision I ever made.'), L('narrator', 'היום הם ביחד כמה חודשים, בקשר מרחוק, וטסים אחד לשנייה.')])],
        reward=dict(coins=45, xp=60, shard=dict(id='shard_terry', title='בריכה בתל אביב', story='עדן הכירה את טרי, אוסטרלי שהגיע לחתונה של חבר, בבריכה של מלון בתל אביב, ולמחרת הוא שכנע אותה לטוס איתו לדובאי.')))

    # ======================================================== 9. CAT IN BOOTS (Maayan)
    m = M('purim', 'ארוחת פורים בסגנון שרק', 22, 14, '.', 'home', (3, 11))
    m.rect(1, 1, 20, 1, 'W'); m.rect(9, 5, 10, 5, 'c'); m.exit(1, 11)
    m.prop('table', 11, 8).prop('table', 14, 8).prop('plant', 3, 3).prop('plant', 19, 3).prop('door', 10, 2, id='mirror', interact=dict(dialogue='mirror_look'))
    m.npc('guest', 12, 6, 0).npc('guest', 16, 6, 0)
    m.pick('boots_pk', 'boots', 4, 6, 'q_cat', hidden=True).pick('cat_hat_pk', 'cat_hat', 18, 11, 'q_cat', hidden=True)
    m.broken(6, 8)
    maps['purim'] = m.out()
    quests['q_cat'] = dict(id='q_cat', title='החתול במגפיים', summary='בפורים רצו ארוחה בסגנון שרק, ורק מעיין התחפשה.', scene=dict(map='purim', x=3, y=11), maps=['purim'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'פורים. המשפחה רצתה ארוחה בסגנון שרק, עם תחפושות.'), L('narrator', 'בסוף לא הסתדר, ואף אחד לא התחפש. כמעט אף אחד.'), L('maayan', 'אני מתחפשת! צריך רק למצוא מגפיים וכובע.')]),
        dict(type='collect', item='boots', count=1, text='למצוא מגפיים.', hint='יכולת מגלה מראה חפצים נסתרים.'),
        dict(type='collect', item='cat_hat', count=1, text='למצוא כובע חתול.'),
        dict(type='interact', target='mirror', text='להתחפש מול המראה.', lines=[L('narrator', 'מגפיים, כובע, ועוד קצת ביטחון עצמי. חתול במגפיים, בדיוק כמו בסרט.'), L('maayan', 'מושלם!')]),
        dict(type='goto', map='purim', x=14, y=6, radius=2, text='להיכנס לארוחה בתחפושת.'),
        dict(type='minigame', auto=True, game='reaction', config=dict(targets=8, time=12, emoji='😱', instruction='לוחצים על כל פרצוף מופתע 😱 לפני שהוא נעלם! צריך 8.'), text='להפתיע את כולם: ללחוץ על כל פרצוף מופתע שקופץ על המסך לפני שהוא נעלם.', lines=[L('eden', 'מעעיייייייןןןןן!'), L('narrator', 'כולם מסתכלים. היא היחידה שהתחפשה, והכי מצחיקה בחדר.')])],
        reward=dict(coins=40, xp=55, shard=dict(id='shard_cat', title='החתול במגפיים', story='בפורים רצו ארוחה בסגנון שרק ולא הסתדר, ורק מעיין הגיעה מחופשת לחתול במגפיים. כל פעם שמעיין מפתיעה, עדן אומרת: ״מעעיייייין״.')))
    item('boots', 'מגפיים', 'shoe', '#6b4423', 'חצי מהתחפושת.')
    item('cat_hat', 'כובע חתול', 'hat', '#c9892b', 'החצי השני.')

    # ======================================================== 10. RINAT: Kotel proposal + the dream
    m = M('kotelplaza', 'הכותל המערבי', 22, 14, 'S', 'mystery', (11, 11))
    m.rect(0, 0, 22, 4, 'K'); m.exit(1, 11)
    m.npc('elior', 11, 8, 0).prop('lamp', 3, 6).prop('lamp', 19, 6)
    maps['kotelplaza'] = m.out()
    m = M('dream', 'החלום של מרדכי', 20, 12, 'C', 'mystery', (3, 9), border=None)
    m.exit(1, 9)
    m.prop('crib', 6, 5, id='crib1').prop('crib', 10, 5, id='crib2').prop('crib', 14, 5, id='crib3')
    maps['dream'] = m.out()
    quests['q_rinat'] = dict(id='q_rinat', title='חלום בלילה', summary='הצעת נישואין בכותל, וחלום שהתגשם.', scene=dict(map='kotelplaza', x=11, y=11), maps=['kotelplaza', 'dream'], steps=[
        dict(type='cutscene', lines=[L('narrator', 'הכותל המערבי. רינת ואליאור מטיילים ביחד.')]),
        dict(type='goto', map='kotelplaza', x=11, y=8, radius=2, text='להתקרב לאליאור ולרינת ליד הכותל.'),
        dict(type='cutscene', lines=[L('elior', 'רינת, יש משהו שאני רוצה להגיד לך.'), L('rinat', 'מה קרה?'), L('elior', 'רוצה להתחתן איתי?'), L('rinat', 'כן!')]),
        dict(type='teleport', map='dream', x=3, y=9),
        dict(type='cutscene', lines=[L('narrator', 'כמה לילות לפני הלידה הראשונה של רינת. מרדכי חולם.'), L('mordechai', 'אני רואה תינוקת. תלתלים... שחורים...')]),
        dict(type='choice', who='mordechai', question='מה מרדכי רואה בחלום?', options=[
            dict(text='תינוקת עם תלתלים שחורים', correct=True, reply=[L('narrator', 'התינוקת מחייכת בחלום, ותלתלים שחורים מקיפים את פניה.')]),
            dict(text='תינוק בלי שיער בכלל', reply=[L('mordechai', 'לא... זה לא מה שראיתי בחלום.')]),
            dict(text='תאומים בלונדיניים', reply=[L('mordechai', 'יש לי תאום, אבל לא אלה בחלום.')])]),
        dict(type='cutscene', lines=[L('narrator', 'ואז, בלידה הראשונה, אביגיל נולדה: בדיוק עם תלתלים שחורים.'), L('rinat', 'מרדכי, איך ידעת?!'), L('mordechai', 'חלום, אני אומר לך.'), L('rinat', 'תודה, מרדכי. אתה קוסם!')])],
        reward=dict(coins=45, xp=60, shard=dict(id='shard_rinat', title='חלום בלילה', story='אליאור הציע לרינת נישואין בכותל. מרדכי חלם שתלד בת עם תלתלים שחורים, ובלידה הראשונה זה בדיוק מה שקרה.')))

    # ======================================================== 11. YOAV: cleaning + the flashback
    m = M('yard', 'הגינה של יואב', 22, 14, 'g', 'town', (3, 11))
    m.rect(1, 6, 20, 1, 'p'); m.exit(1, 11)
    m.prop('car', 14, 9, id='car_y', interact=dict(dialogue='car_dirty')).prop('tree', 4, 4).prop('tree', 18, 4).prop('bush', 8, 3).prop('lamp', 11, 7)
    for i, (x, y) in enumerate([(5, 8), (8, 10), (11, 3), (16, 6), (19, 11), (7, 5), (13, 12), (3, 6)], 1): m.pick(f'litter{i}', 'litter', x, y, 'q_yoav', hidden=(i % 3 == 0))
    m.broken(10, 9)
    maps['yard'] = m.out()
    m = M('flash', 'זיכרון: הבית החדש', 16, 10, '.', 'home', (3, 7)); m.rect(0, 0, 16, 1, '#'); m.rect(1, 1, 14, 1, 'W'); m.rect(4, 4, 8, 4, 'r'); m.exit(1, 7)
    m.npc('yoav_kid', 8, 5, 0).prop('sofa', 5, 3).prop('plant', 13, 3)
    maps['flash'] = m.out()
    item('litter', 'זבל', 'default', '#a0a0b0', 'יואב לא ישן בשקט כשיש לכלוך.')
    quests['q_yoav'] = dict(id='q_yoav', title='הגינה של יואב', summary='יואב אוהב שהכול נקי ומסודר, ויש גם סיפור מרגש מגיל 4.', scene=dict(map='yard', x=3, y=11), maps=['yard', 'flash'], steps=[
        dict(type='cutscene', lines=[L('yoav', 'יש פה לכלוך.'), L('narrator', 'יואב אוהב לסדר ולנקות הכול: גינות, גינות ציבוריות, רכבים, בתים.'), L('yoav', 'ניקיון זה לא תחביב. זו שליחות.')]),
        dict(type='collect', item='litter', count=8, text='לאסוף 8 פריטי זבל בגינה.', hint='חלק מהן מוסתרות מתחת לעצים.'),
        dict(type='interact', target='car_y', text='לשטוף את הרכב.', lines=[L('yoav', 'מלוכלך. לא יעבור.')], minigame=dict(game='reaction', config=dict(targets=10, time=12, emoji='🫧'))),
        dict(type='teleport', map='flash', x=3, y=7),
        dict(type='goto', map='flash', x=7, y=6, radius=2, text='להתקרב לילד הקטן.'),
        dict(type='cutscene', lines=[L('narrator', 'לפני שנים רבות. יואב בן 4, הילד הכי חמוד: בלונדיני, עם שיער ארוך.'), L('narrator', 'הוא הגיע מבית אומנה, ומאותו יום הוא נשאר במשפחה.'), L('narrator', 'היום הוא קשוח ומסודר, אבל הוא עדיין חלק מהמשפחה, ובלב יש מקום לכולם.')])],
        reward=dict(coins=45, xp=60, shard=dict(id='shard_yoav', title='הגינה של יואב', story='אימצנו את יואב כשהיה בן 4, ילד מתוק ובלונדיני עם שיער ארוך. היום הוא קשוח ומסודר, ואוהב לנקות את הכול.')))

    dialogues = {
        'broken_generic': {'start': {'who': 'narrator', 'text': 'משהו שבור. מי שיש לו יכולת תיקון (כפתור B) יכול לסדר אותו ולקבל פרס.', 'next': None}},
        'sumo_look': {'start': {'who': 'narrator', 'text': 'זירת סומו. מרדכי כבר מתלהב.', 'next': None}},
        'stall1': {'start': {'who': 'narrator', 'text': 'חנות הבגדים. אמא התמקחה כאן על חולצה.', 'next': None}},
        'stall2': {'start': {'who': 'narrator', 'text': 'חנות התכשיטים. נוצצת במיוחד.', 'next': None}},
        'stall3': {'start': {'who': 'narrator', 'text': 'חנות הנעליים. הרבה מדי זוגות.', 'next': None}},
        'stall4': {'start': {'who': 'narrator', 'text': 'בית הקפה. ריח של קפה טרי.', 'next': None}},
        'rental_look': {'start': {'who': 'narrator', 'text': 'דלפק השכרת הרכב.', 'next': None}},
        'gate_sign': {'start': {'who': 'narrator', 'text': 'שלט: ״הטיסה לברצלונה: ננעלה.״', 'next': None}},
        'car_look': {'start': {'who': 'narrator', 'text': 'רכב קטן. הרבה מזוודות, מעט מקום.', 'next': None}},
        'checkin_look': {'start': {'who': 'narrator', 'text': 'דלפק הצ׳ק-אין של ההפלגה.', 'next': None}},
        'fish_look': {'start': {'who': 'narrator', 'text': 'הדג המרוקאי מבעבע בסיר.', 'next': None}},
        'flat_door_look': {'start': {'who': 'narrator', 'text': 'דלת של דירה בקומה השלישית.', 'next': None}},
        'mirror_look': {'start': {'who': 'narrator', 'text': 'מראה גדולה. אפשר להתחפש מולה.', 'next': None}},
        'car_dirty': {'start': {'who': 'narrator', 'text': 'הרכב מלוכלך. יואב לא יסלח.', 'next': None}},
    }
    # ---------------- levels: order, who calls the player, and the mission briefing (adventure style, not a memory)
    LEVELS = [
        ('q_phone', ['anat', 'yitzhak', 'mordechai', 'eden'],
         ['הטלפון שלי נעלם בשוק, ואני כבר מרגישה את הפאניקה!', 'המשימה: לחזור לשוק, לשחזר את המסלול שלי בין החנויות ולמצוא אותו. {f:תבואי|m:תבוא} איתי?'],
         ['יש לנו משימה דחופה! אנט שוב שכחה את הטלפון בחנות, והיא כבר נבהלת.', 'המשימה: לרוץ לשוק, לשחזר באיזה סדר היא עברה בין החנויות ולמצוא את הטלפון. {f:מוכנה|m:מוכן}?']),
        ('q_japan', ['yitzhak', 'mordechai', 'anat', 'eden'],
         ['יש לי הרפתקה בשבילכם: אנחנו טסים ליפן!', 'המשימה: לצלם 3 איילים ברחוב, להתמודד בקרב סומו ולהרכיב מניין של עשרה לתפילה. {f:מוכנה|m:מוכן}?'],
         ['אבא ואני טסים ליפן לשלושה שבועות, וצריך עוד ידיים!', 'המשימה: לצלם 3 איילים ברחוב, להתמודד בקרב סומו ולהרכיב מניין של עשרה לתפילה. {f:מוכנה|m:מוכן}?']),
        ('q_seven', ['tohar', 'mordechai', 'rinat', 'maayan'],
         ['מהר! מרדכי בדרך, יש לי שבע דקות להתארגן, ואני לא מוצאת כלום!', 'המשימה: לאסוף 7 דברים לפני שהשעון נגמר. {f:תעזרי|m:תעזור} לי?'],
         ['טוהר בצרה: מרדכי התקשר שהוא בדרך, ״שבע דקות״, והיא לא מוכנה בכלל!', 'המשימה: לעזור לה לאסוף 7 דברים לפני שהשעון נגמר. {f:מוכנה|m:מוכן}?']),
        ('q_cat', ['maayan', 'eden', 'tohar', 'mordechai'],
         ['פורים! רציתי ארוחה בסגנון שרק, ואף אחד לא מתחפש. אז אני כן!', 'המשימה: למצוא מגפיים וכובע, להתחפש לחתול במגפיים ולהיכנס לארוחה בהפתעה. {f:תבואי|m:תבוא} איתי?'],
         ['מעיין מתכננת הפתעה בפורים: להגיע לארוחה בתחפושת חתול במגפיים.', 'המשימה: לעזור לה למצוא את התחפושת ולהיכנס בגדול. {f:מוכנה|m:מוכן}?']),
        ('q_terry', ['eden', 'mordechai', 'maayan', 'anat'],
         ['יש לי הרפתקה מטורפת: בריכה במלון בתל אביב, בחור אוסטרלי, ולמחרת טיסה לדובאי.', 'המשימה: ללכת לבריכה ולהכיר את טרי (הוא מדבר רק אנגלית!). {f:תבואי|m:תבוא}?'],
         ['עדן מספרת איך הכירה את טרי, ויש סיפור מטורף בדרך.', 'המשימה: ללכת לבריכה, לדבר עם טרי (באנגלית!) ולהחליט אם טסים איתו לדובאי. {f:מוכנה|m:מוכן}?']),
        ('q_dinner', ['anat', 'yitzhak', 'tohar', 'rinat'],
         ['ליל שישי! 12 סלטים, דג מרוקאי, והכול צריך להיות מוכן בזמן.', 'המשימה: לאסוף את כל הסלטים, להשגיח על הדג ולחכות לדבר התורה של אבא. {f:תעזרי|m:תעזור} לי?'],
         ['ארוחת שישי של אמא מתקרבת: 12 סוגי סלטים ודג מרוקאי.', 'המשימה: לעזור לה להכין הכול בזמן. {f:מוכנה|m:מוכן}?']),
        ('q_barcelona', ['anat', 'maayan', 'yitzhak', 'mordechai'],
         ['פספסנו את הקונקשן בשוויץ, וההפלגה יוצאת מחר בבוקר!', 'המשימה: לשכור רכב, לקשור את המזוודות לגג ולנסוע שעות עד ברצלונה. {f:תבואי|m:תבוא} איתנו?'],
         ['אמא והאחים והאחיות שלה פספסו קונקשן בשוויץ, וההפלגה למחרת בבוקר.', 'המשימה: לעזור להם להגיע לברצלונה בזמן: רכב שכור, מזוודות על הגג ושעות של נסיעה. {f:מוכנה|m:מוכן}?']),
        ('q_cruise', ['anat', 'tohar', 'rinat', 'mordechai'],
         ['הנציגה לא רוצה להעלות את יואב לספינה, כי היא חושבת שיש לו קורונה!', 'המשימה: לשכנע אותה לפני שהספינה תצא. אולי מרדכי יכול לעזור בטלפון. {f:תעזרי|m:תעזור} לנו?'],
         ['אמא, טוהר, רינת ויואב תקועים בנמל: חושבים שליואב יש קורונה.', 'המשימה: לעזור להם לעלות על הספינה, ואולי להתקשר למרדכי. {f:מוכנה|m:מוכן}?']),
        ('q_pikanto', ['tohar', 'rinat', 'mordechai', 'anat'],
         ['קריאה דחופה! אני נוהגת בפיקנטו של מד״א וצריך להגיע מהר.', 'המשימה: להגיע לכתובת ולדווח למוקד. {f:תבואי|m:תבוא} איתי?'],
         ['טוהר חובשת במד״א, והיא יוצאת לקריאה דחופה בפיקנטו.', 'המשימה: ללוות אותה: לנסוע, להגיע לדירה ולדווח למוקד. {f:מוכנה|m:מוכן}?']),
        ('q_rinat', ['rinat', 'mordechai', 'tohar', 'anat'],
         ['הכותל, ההצעה של אליאור, ואחרי זה חלום שהתגשם.', 'המשימה: להגיע לכותל ואחר כך להיכנס לחלום ולמצוא את התינוקת. {f:תבואי|m:תבוא}?'],
         ['רינת מזכירה יום מיוחד בכותל וחלום של מרדכי לפני הלידה.', 'המשימה: ללוות אותה גם לכותל וגם לחלום. {f:מוכנה|m:מוכן}?']),
        ('q_yoav', ['yoav', 'anat', 'rinat', 'tohar'],
         ['יש פה לכלוך.', 'המשימה: לנקות את הגינה, לשטוף את הרכב, ואחר כך אראה לך משהו. {f:תעזרי|m:תעזור} לי?'],
         ['יואב מחכה בגינה: יש לכלוך, והוא לא נרגע.', 'המשימה: לעזור לו לנקות את הכול, ואז הוא יראה לך משהו מיוחד. {f:מוכנה|m:מוכן}?']),
    ]

    MISSION_PLAYER = {
        'q_phone': ['{name}, נראה שהטלפון שלך שוב נעלם בשוק!', 'המשימה: לחזור לשוק, לשחזר את המסלול בין החנויות ולמצוא אותו. {f:בואי|m:בוא}, אני איתך!'],
        'q_japan': ['{name}, מחכה לנו הרפתקה: חוזרים לטיול ההוא ביפן!', 'המשימה: לצלם 3 איילים ברחוב, להתמודד בקרב סומו ולהרכיב מניין של עשרה לתפילה. אני איתך!'],
        'q_seven': ['{name}, שבע דקות! איך מתארגנים בזמן?', 'המשימה: לאסוף 7 דברים לפני שהשעון נגמר. אני מעודד מהצד!'],
        'q_cat': ['{name}, פורים בא, ואת הולכת להפתיע את כולם בתחפושת!', 'המשימה: למצוא מגפיים וכובע, להתחפש לחתול במגפיים ולהיכנס לארוחה בגדול. {f:מוכנה|m:מוכן}?'],
        'q_terry': ['{name}, בואו נחזור לבריכה ההיא בתל אביב!', 'המשימה: ללכת לבריכה, לדבר עם טרי (באנגלית!) ולהחליט אם טסים לדובאי. אני איתך!'],
        'q_dinner': ['{name}, ליל שישי מתקרב: 12 סלטים ודג מרוקאי!', 'המשימה: לאסוף את כל הסלטים, להשגיח על הדג ולחכות לדבר התורה של אבא. אני איתך!'],
        'q_barcelona': ['{name}, פספסתם את הקונקשן בשוויץ, וההפלגה מחר בבוקר!', 'המשימה: לשכור רכב, לקשור את המזוודות לגג ולנסוע שעות עד ברצלונה. אני איתך!'],
        'q_cruise': ['{name}, הנציגה לא מעלה את יואב לספינה: חושבים שיש לו קורונה!', 'המשימה: לשכנע אותה לפני שהספינה תצא. אולי מרדכי יכול לעזור בטלפון. אני איתך!'],
        'q_pikanto': ['{name}, קריאה דחופה במד״א, ואת בפיקנטו!', 'המשימה: להגיע לכתובת ולדווח למוקד. אני איתך!'],
        'q_rinat': ['{name}, הכותל, ההצעה של אליאור, והחלום של מרדכי: בואו נחזור לשם!', 'המשימה: להגיע לכותל ואחר כך להיכנס לחלום ולמצוא את התינוקת. אני איתך!'],
        'q_yoav': ['{name}, יש בגינה לכלוך שמחכה לך.', 'המשימה: לנקות את הגינה, לשטוף את הרכב, ולהגיע למקום שבו הכול התחיל. אני איתך!'],
    }
    for i, (qid, callers, mself, mother) in enumerate(LEVELS, 1):
        quests[qid]['missionPlayer'] = MISSION_PLAYER[qid]
        q = quests[qid]; q['order'] = i; q['callers'] = callers; q['missionSelf'] = mself; q['missionOther'] = mother
    return maps, quests, items, npcs, dialogues
