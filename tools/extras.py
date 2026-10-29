"""More life for the story scenes: fictional background characters (never real people) and a few extra needed items.
Applied after scenes.build() by gen_maps.py. Quests that gain steps carry rev + stepShifts so saves in progress are migrated, never reset."""


def L(who, text): return dict(who=who, text=text)


def fig(skin, hair, style, shirt, pants, acc='none', **kw):
    return dict(skin=skin, hair=hair, hairStyle=style, shirt=shirt, pants=pants, accessory=acc, **kw)


def enrich(maps, quests, items, npcs):
    def cast(id_, name, role, look, phrases, **kw): npcs[id_] = dict(id=id_, name=name, role=role, look=look, phrases=phrases, **kw)
    def put(mid, id_, x, y, d=0, **kw): maps[mid]['npcs'].append(dict(id=id_, x=x, y=y, dir=d, **kw))
    def item(id_, name, icon, color, desc): items[id_] = dict(id=id_, name=name, type='quest', icon=icon, color=color, desc=desc)

    # ------------------------------------------------------------------ cast
    cast('sumo_wrestler', 'מתאבק הסומו', 'דמות משנית',
         fig('#e8b890', '#101014', 'bun', '#e8b890', '#2b2b6a', wide=True, sleeves='none'), scale=1.2,
         phrases=['הופ! לא נוגעים בבטן. זה לא מנוף.', 'שלושה שבועות אימונים, ארוחת בוקר של שמונה קערות אורז.', 'מי רוצה להתמודד? גם אבא וגם הבן יכולים.', 'בזירה הזאת אין מקום לפחדנים. יש מקום לארוחה גדולה.'])
    cast('ticket_seller', 'מוכר הכרטיסים', 'דמות משנית', fig('#f1d3b5', '#14141a', 'short', '#c44a4a', '#2b2b3a', 'glasses'),
         phrases=['כרטיס לזירה? רק ליד השער. רגע, איפה הכרטיס?', 'סומו זה ספורט רציני. אנחנו לא מצחיקים.'])
    cast('ramen_chef', 'שף הראמן', 'דמות משנית', fig('#f1d3b5', '#14141a', 'short', '#ffffff', '#2b2b3a', hat='#ffffff', hatStyle='cap'),
         phrases=['ראמן חם! כל קערה עם ביצה וחיוך.', 'לא כשר? בדקו בשלט. אנחנו אנשים הוגנים.'])
    cast('kimono_lady', 'גברת הקימונו', 'דמות משנית', fig('#f6dcc0', '#14141a', 'bun', '#c0357a', '#7a2d5a', bottom='longskirt'),
         phrases=['קימונו נלבש משמאל לימין. כן, כולם טועים.', 'צילום? רק אם מחייכים.'])
    cast('tourist', 'תייר', 'דמות משנית', fig('#e8c9a8', '#5a3418', 'short', '#ffd23f', '#3a5aa8', 'sunglasses'),
         phrases=['איפה כאן הכי יפה לצלם?', 'הכול נראה כמו סרט. גם האיל שאכל לי את המפה.'])
    cast('shopkeeper_a', 'מוכרת', 'דמות משנית', fig('#d9a679', '#2b2b2b', 'long', '#e84b4b', '#2b2b3a'),
         phrases=['בחצי מחיר? ניסית כבר כאן?', 'הכול במבצע, גם מה שלא.'])
    cast('shopkeeper_b', 'מוכר', 'דמות משנית', fig('#f1d3b5', '#5a3418', 'short', '#4a6fa5', '#2b2b3a', 'beard', beardColor='#5a3418'),
         phrases=['לקוחה מתמקחת? אני שומר על הכיסים.', 'זה לא יקר. זה אמיתי.'])
    cast('mall_guard', 'מאבטח', 'דמות משנית', fig('#e8c9a8', '#2b2b2b', 'short', '#1c2a4a', '#1c2a4a'),
         phrases=['אבדות ומציאות? בדקו בחנויות.', 'אני רואה הכול. חוץ ממפתחות.'])
    cast('shopper', 'קונה', 'דמות משנית', fig('#f1d3b5', '#7a2d1c', 'curly', '#2fa39a', '#3a3a56'),
         phrases=['שוק זה הגימנסיה של הקניות.', 'אם זה לא במבצע, זה לא קורה.'])
    cast('rental_agent', 'נציג ההשכרה', 'דמות משנית', fig('#e8c9a8', '#3a2415', 'short', '#2b5fa8', '#2b2b3a', 'glasses'),
         phrases=['רכב קטן, מזוודות גדולות. המתמטיקה לא מסתדרת.', 'ביטוח מלא? כדאי.'])
    cast('traveler', 'נוסעת', 'דמות משנית', fig('#f1d3b5', '#8a5a2b', 'ponytail', '#a35fd0', '#2b2b3a'),
         phrases=['הטיסה בוטלה, הקפה לא.', 'שוויץ יפה. גם יקרה.'])
    cast('cleaner', 'מנקה', 'דמות משנית', fig('#d9a679', '#2b2b2b', 'short', '#2fa39a', '#3a3a56'),
         phrases=['שומר על הרצפה. מזוודות מעופפות לא מאושרות.'])
    cast('dock_worker', 'פועל נמל', 'דמות משנית', fig('#d9a679', '#2b2b2b', 'short', '#ff9f43', '#3a3a56', hat='#ffd23f', hatStyle='cap'),
         phrases=['הספינה ענקית, השעון עוד יותר.', 'מזוודות על הגג? ראיתי גם יותר גרוע.'])
    cast('sailor', 'מלח', 'דמות משנית', fig('#e8c9a8', '#8a8a90', 'short', '#ffffff', '#1c2a4a', 'beard', beardColor='#8a8a90', hat='#1c2a4a', hatStyle='cap'),
         phrases=['מזל טוב, הגעתם. עכשיו תעלו.', 'ים זה כיף, עד הגל הרביעי.'])
    cast('porter', 'סבל', 'דמות משנית', fig('#d9a679', '#14141a', 'short', '#e84b4b', '#2b2b3a', hat='#e84b4b', hatStyle='cap'),
         phrases=['מזוודות? אני שומר עליהן כמו על ילדים.', 'שמונה מזוודות למשפחה אחת, כבוד.'])
    cast('passenger', 'נוסע', 'דמות משנית', fig('#f1d3b5', '#5a3418', 'short', '#4fc3f7', '#e8e2d2', 'sunglasses'),
         phrases=['כבר מכין את הכובע לשמש.', 'מישהו ראה את הקפטן? אולי הוא במסעדה.'])
    cast('pool_swimmer', 'שוחה', 'דמות משנית', fig('#f1d3b5', '#5a3418', 'short', '#ff7a7a', '#3a5aa8', sleeves='none'),
         phrases=['המים מושלמים. רק אל תצלמו אותי.', 'שמעתי דיבורים באנגלית. נשמע חשוב.'])
    cast('lifeguard', 'מציל', 'דמות משנית', fig('#d9a679', '#2b2b2b', 'short', '#ff7a7a', '#ff7a7a', 'sunglasses', sleeves='none'),
         phrases=['בלי קפיצות. בלי ריצות. כן, ראיתי אתכם.', 'מי שמדבר אנגלית יכול לשחות בכל מקום.'])
    cast('camel_guide', 'מדריך גמלים', 'דמות משנית', fig('#d9a679', '#14141a', 'short', '#f4f4f8', '#f4f4f8', 'beard', beardColor='#14141a', hat='#f4f4f8', hatStyle='scarf'),
         phrases=['גמל לא מפחד מבריכות. הוא פשוט לא מבין אותן.', 'דובאי גדולה. הגמל מכיר קיצורי דרך.'])
    cast('clown', 'ליצן', 'דמות משנית', fig('#f6dcc0', '#e84b4b', 'curly', '#ffd23f', '#4a6fa5'),
         phrases=['פורים שמח! הנחתי את האף איפשהו.', 'אל תיבהלו, אני רק ליצן. כמעט.'])
    cast('pirate', 'פיראט', 'דמות משנית', fig('#e8c9a8', '#2b2b2b', 'short', '#2b2b2b', '#5a3418', 'beard', beardColor='#2b2b2b', hat='#2b2b2b', hatStyle='cap'),
         phrases=['ארררר! מי לקח את משקה הענבים?', 'החתול במגפיים? אני מקנא.'])
    cast('princess', 'נסיכה', 'דמות משנית', fig('#f1d3b5', '#e8c25a', 'long', '#ff7ac8', '#ff7ac8', bottom='longskirt'),
         phrases=['הכתר שלי נפל. אל תגידו לאף אחד.', 'פורים: היום מותר גם לשחק נסיכה.'])
    cast('plaza_tourist', 'תיירת', 'דמות משנית', fig('#f1d3b5', '#7a2d1c', 'long', '#ffffff', '#3a5aa8', 'sunglasses'),
         phrases=['איזו תחושה במקום הזה.', 'אפשר צילום? אני אחכה בסבלנות.'])
    cast('plaza_elder', 'מתפלל מבוגר', 'דמות משנית', fig('#e8c9a8', '#d8d8dc', 'short', '#ffffff', '#1c1c26', 'beard', beardColor='#d8d8dc', hat='#101014', hatStyle='kippah'),
         phrases=['מקום שאפשר לעמוד בו שעה בלי לשים לב.', 'כל אחד והבקשה שלו.'])
    cast('yard_neighbor', 'שכן', 'דמות משנית', fig('#e8c9a8', '#8a8a90', 'short', '#6bbf6b', '#3a3a56', hat='#c9a24a', hatStyle='cap'),
         phrases=['הגינה הזאת עוד תהיה גן עדן.', 'מי זרק את הקליפות? לא אני.'])
    cast('dining_neighbor', 'שכנה', 'דמות משנית', fig('#f1d3b5', '#5a3418', 'bun', '#ff9f43', '#2b2b3a'),
         phrases=['מריח דג מרוקאי מהמדרגות. אני עולה.', 'שנים עשר סלטים? אני בעד.'])

    # ------------------------------------------------------------------ placement
    put('jp', 'sumo_wrestler', 21, 9, 2); put('jp', 'ticket_seller', 16, 10, 1, gives='sumo_ticket', uid='tk1',
        givesText='״כרטיס אחד לזירה, בבקשה. תשמרו אותו, הם בודקים.״', emptyText='כבר קיבלתם כרטיס. אל תאבדו אותו.')
    put('jp', 'ramen_chef', 12, 9, 0); put('jp', 'kimono_lady', 6, 10, 3); put('jp', 'tourist', 18, 14, 1)
    for i, (x, y, sid) in enumerate([(5, 2, 'shopkeeper_a'), (11, 2, 'shopkeeper_b'), (17, 2, 'shopkeeper_a'), (22, 2, 'shopkeeper_b')]): put('mall', sid, x, y, 0)
    put('mall', 'mall_guard', 18, 6, 2); put('mall', 'shopper', 8, 6, 3); put('mall', 'shopper', 21, 10, 2)
    put('airport', 'rental_agent', 13, 4, 2, gives='car_key', uid='key1', givesText='״הנה המפתח, חתמתם על הכול. נסיעה טובה!״', emptyText='המפתח כבר אצלכם. אל תאבדו אותו בדרך.')
    put('airport', 'traveler', 8, 7, 3); put('airport', 'traveler', 19, 6, 2); put('airport', 'cleaner', 14, 6, 0)
    put('port', 'dock_worker', 6, 7, 3); put('port', 'sailor', 16, 8, 2)
    put('terminal', 'porter', 16, 8, 0); put('terminal', 'passenger', 17, 6, 2); put('terminal', 'passenger', 21, 6, 2)
    put('hotelpool', 'pool_swimmer', 12, 9, 1); put('hotelpool', 'lifeguard', 19, 5, 2)
    put('dubai', 'camel_guide', 8, 8, 3); put('dubai', 'tourist', 16, 9, 2)
    put('purim', 'clown', 7, 6, 0); put('purim', 'pirate', 18, 9, 2); put('purim', 'princess', 14, 11, 0)
    put('kotelplaza', 'plaza_tourist', 6, 9, 3); put('kotelplaza', 'plaza_elder', 15, 5, 2)
    put('yard', 'yard_neighbor', 16, 5, 2)
    put('dining', 'dining_neighbor', 20, 5, 2)
    # the agent hands over the boarding pass
    for n in maps['terminal']['npcs']:
        if n['id'] == 'agent':
            n.update(gives='boarding_pass', uid='bp1', givesText='״כרטיס עלייה לכל המשפחה. תשמרו אותו עד הספינה.״', emptyText='הכרטיס כבר אצלכם. עלו לספינה.')

    # ------------------------------------------------------------------ needed items (steps are inserted; saves in progress are migrated)
    item('sumo_ticket', 'כרטיס לזירת הסומו', 'ticket', '#e84b4b', 'בלי כרטיס לא נכנסים לזירה.')
    item('car_key', 'מפתח הרכב השכור', 'key', '#c9a24a', 'בלי מפתח אין נסיעה.')
    item('boarding_pass', 'כרטיס עלייה לספינה', 'ticket', '#4fc3f7', 'הכרטיס לעלות על ההפלגה.')

    q = quests['q_japan']
    q['steps'].insert(2, dict(type='collect', item='sumo_ticket', count=1, text='לקנות כרטיס לזירת הסומו אצל מוכר הכרטיסים.', hint='מדברים עם מוכר הכרטיסים (ליד הפנסים).'))
    for s in q['steps']:
        if s.get('target') == 'sumo': s['consume'] = 'sumo_ticket'; s['consumeCount'] = 1
    q.update(rev=1, stepShifts=[dict(at=2, n=1)])

    q = quests['q_barcelona']
    q['steps'].insert(2, dict(type='collect', item='car_key', count=1, text='לקבל את מפתח הרכב מנציג ההשכרה.', hint='הנציג עומד מאחורי הדלפק.'))
    q.update(rev=1, stepShifts=[dict(at=2, n=1)])

    q = quests['q_cruise']
    idx = next(i for i, s in enumerate(q['steps']) if s['type'] == 'cutscene' and any(('הכול מסודר' in (l.get('text') or '')) for l in s['lines']))
    q['steps'].insert(idx, dict(type='collect', item='boarding_pass', count=1, text='לקבל מהנציגה כרטיס עלייה לספינה.', hint='מדברים עם הנציגה ליד דלפק הצ׳ק-אין.'))
    q.update(rev=1, stepShifts=[dict(at=idx, n=1)])
