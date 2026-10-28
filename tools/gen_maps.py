"""Generates content/maps.json (starter maps). Edit freely; the Admin Studio edits the JSON directly later."""
import json
import os

def grid(w, h, ch):
    return [[ch] * w for _ in range(h)]

def rect(g, x, y, w, h, ch):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= yy < len(g) and 0 <= xx < len(g[0]):
                g[yy][xx] = ch

def out(g):
    return [''.join(r) for r in g]

LEG = {'g': 'grass', 'f': 'flower', 'p': 'path', '.': 'wood', 't': 'tile', 'r': 'rug', '#': 'wall', 'W': 'wallface',
       '~': 'water', 's': 'sand', '=': 'fence', 'd': 'dark', 'c': 'carpet', '^': 'roof'}
BEACH_CLOSED = 'הדרך לחוף סגורה. אולי סבתא יודעת מי יכול לפתוח אותה?'

maps = {}

# ---------------------------------------------------------------- HOUSE 22x15
g = grid(22, 15, '.')
rect(g, 0, 0, 22, 1, '#'); rect(g, 1, 1, 20, 1, 'W'); rect(g, 0, 0, 1, 15, '#'); rect(g, 21, 0, 1, 15, '#'); rect(g, 0, 14, 22, 1, '#')
rect(g, 1, 2, 8, 5, 't')              # kitchen
rect(g, 11, 4, 6, 3, 'r')             # living rug
rect(g, 1, 10, 8, 3, 'c')             # carpet corner
g[14][10] = '.'                       # entrance gap
maps['house'] = dict(id='house', name='הבית של בוזגלו', music='home', legend=LEG, tiles=out(g),
    props=[
        dict(type='fridge', x=1, y=2, interact=dict(dialogue='fridge')),
        dict(type='stove', x=2, y=2, id='stove', interact=dict(dialogue='stove')),
        dict(type='counter', x=3, y=2),
        dict(type='table', x=4, y=5), dict(type='plant', x=7, y=2),
        dict(type='tv', x=12, y=2, interact=dict(dialogue='tv')),
        dict(type='sofa', x=12, y=7, interact=dict(dialogue='sofa')),
        dict(type='shelf', x=17, y=2, interact=dict(dialogue='shelf')), dict(type='plant', x=19, y=2),
        dict(type='bed', x=18, y=12), dict(type='lamp', x=16, y=11),
        dict(type='chest', x=1, y=13, id='chest_house', interact=dict(dialogue='chest_house')),
        dict(type='mat', x=10, y=13, solid=False),
        dict(type='door', x=20, y=2, id='attic_door', interact=dict(dialogue='attic_door')),
        dict(type='sign', x=14, y=9, interact=dict(dialogue='house_sign')),
    ],
    npcs=[dict(id='anat', x=5, y=8, dir=0), dict(id='yitzhak', x=14, y=8, dir=2), dict(id='eden', x=13, y=5, dir=0), dict(id='maayan', x=10, y=11, dir=0), dict(id='tohar', x=4, y=11, dir=0)],
    pickups=[dict(id='boots_pk', item='boots', x=3, y=12, hidden=True, needsQuest='q_cat'), dict(id='cat_hat_pk', item='cat_hat', x=16, y=9, hidden=True, needsQuest='q_cat')],
    doors=[dict(x=10, y=14, to='street', tx=7, ty=8, dir=0, label='החוצה')],
    spawn=dict(x=8, y=9))

# ---------------------------------------------------------------- STREET 40x22
g = grid(40, 22, 'g')
for y in range(22):
    for x in range(40):
        if (x * 7 + y * 13) % 17 == 0:
            g[y][x] = 'f'
rect(g, 0, 10, 40, 3, 'p')            # main road
rect(g, 6, 8, 3, 2, 'p'); rect(g, 24, 8, 3, 2, 'p'); rect(g, 6, 13, 2, 5, 'p'); rect(g, 30, 13, 3, 6, 'p')
rect(g, 3, 3, 9, 3, '^'); rect(g, 3, 6, 9, 2, 'W'); g[7][7] = 'p'        # house building
rect(g, 21, 3, 9, 3, '^'); rect(g, 21, 6, 9, 2, 'W'); g[7][25] = 'p'    # market building
rect(g, 14, 15, 8, 1, '='); rect(g, 12, 16, 1, 4, '=')
rect(g, 14, 17, 6, 4, '~')
maps['street'] = dict(id='street', name='רחוב בוזגלו', music='town', legend=LEG, tiles=out(g),
    props=[
        dict(type='tree', x=1, y=4), dict(type='tree', x=13, y=5), dict(type='tree', x=14, y=8), dict(type='tree', x=19, y=4),
        dict(type='tree', x=33, y=6), dict(type='tree', x=36, y=5), dict(type='tree', x=2, y=15), dict(type='tree', x=2, y=19), dict(type='tree', x=37, y=18),
        dict(type='bush', x=4, y=8), dict(type='bush', x=10, y=8), dict(type='bush', x=22, y=8), dict(type='bush', x=28, y=8),
        dict(type='rock', x=16, y=14), dict(type='rock', x=35, y=15),
        dict(type='sign', x=8, y=9, interact=dict(dialogue='street_sign')),
        dict(type='sign', x=37, y=11, interact=dict(dialogue='beach_sign')),
        dict(type='lamp', x=18, y=9), dict(type='lamp', x=32, y=9),
        dict(type='table', x=9, y=15, id='picnic_table', interact=dict(dialogue='picnic')),
        dict(type='chest', x=13, y=19, id='fence_chest', needsFlag='fence_fixed', interact=dict(dialogue='fence_chest')),
        dict(type='sign', x=11, y=17, id='broken_fence', ability='fix', flag='fence_fixed', interact=dict(dialogue='broken_fence')),
        dict(type='umbrella', x=34, y=14),
    ],
    npcs=[dict(id='rinat', x=12, y=11, dir=0), dict(id='yoav', x=22, y=14, dir=0), dict(id='terry', x=12, y=14, dir=1), dict(id='mordechai', x=30, y=14, dir=1)],
    pickups=[dict(id='cloth1', item='cloth', x=10, y=11, needsQuest='q_barcelona'), dict(id='cloth2', item='cloth', x=22, y=12, hidden=True, needsQuest='q_barcelona'), dict(id='cloth3', item='cloth', x=34, y=11, hidden=True, needsQuest='q_barcelona')],
    doors=[
        dict(x=7, y=7, to='house', tx=10, ty=13, dir=1, label='הביתה'),
        dict(x=25, y=7, to='market', tx=7, ty=10, dir=1, label='מכולת'),
        dict(x=39, y=11, to='beach', tx=1, ty=9, dir=3, label='חוף', needsFlag='beach_open', blocked=BEACH_CLOSED),
        dict(x=39, y=12, to='beach', tx=1, ty=10, dir=3, label='חוף', needsFlag='beach_open', blocked=BEACH_CLOSED),
    ],
    spawn=dict(x=7, y=9))

# ---------------------------------------------------------------- MARKET 16x12
g = grid(16, 12, '.')
rect(g, 0, 0, 16, 1, '#'); rect(g, 1, 1, 14, 1, 'W'); rect(g, 0, 0, 1, 12, '#'); rect(g, 15, 0, 1, 12, '#'); rect(g, 0, 11, 16, 1, '#')
rect(g, 5, 5, 6, 3, 'r')
g[11][7] = '.'
maps['market'] = dict(id='market', name='המכולת המשפחתית', music='town', legend=LEG, tiles=out(g),
    props=[dict(type='counter', x=6, y=3, id='shop_counter'), dict(type='shelf', x=2, y=2), dict(type='shelf', x=3, y=2), dict(type='shelf', x=12, y=2),
           dict(type='plant', x=13, y=9), dict(type='plant', x=2, y=9), dict(type='sign', x=11, y=9, interact=dict(dialogue='market_sign'))],
    npcs=[dict(id='shopkeeper', x=7, y=2, dir=0)],
    pickups=[dict(id='phone_pk', item='phone_anat', x=12, y=6, hidden=True, needsQuest='q_phone')], doors=[dict(x=7, y=11, to='street', tx=25, ty=8, dir=0, label='רחוב')], spawn=dict(x=7, y=10))

# ---------------------------------------------------------------- BEACH 30x18
g = grid(30, 18, 's')
rect(g, 0, 0, 30, 4, '~'); rect(g, 0, 15, 30, 3, 'g')
g[9][0] = 'p'; g[10][0] = 'p'
maps['beach'] = dict(id='beach', name='החוף', music='beach', legend=LEG, tiles=out(g),
    props=[dict(type='umbrella', x=6, y=8), dict(type='umbrella', x=15, y=12), dict(type='boat', x=20, y=5), dict(type='rock', x=25, y=6), dict(type='rock', x=27, y=6), dict(type='bush', x=26, y=7),
           dict(type='tree', x=3, y=16), dict(type='tree', x=12, y=16), dict(type='tree', x=24, y=16),
           dict(type='chest', x=26, y=5, id='secret_chest', interact=dict(dialogue='secret_chest')),
           dict(type='sign', x=2, y=11, interact=dict(dialogue='beach_info'))],
    npcs=[],
    pickups=[],
    doors=[dict(x=0, y=9, to='street', tx=38, ty=11, dir=2, label='רחוב'), dict(x=0, y=10, to='street', tx=38, ty=12, dir=2, label='רחוב')],
    spawn=dict(x=2, y=9))

# ---------------------------------------------------------------- ATTIC 14x10
g = grid(14, 10, 'd')
rect(g, 0, 0, 14, 1, '#'); rect(g, 1, 1, 12, 1, 'W'); rect(g, 0, 0, 1, 10, '#'); rect(g, 13, 0, 1, 10, '#'); rect(g, 0, 9, 14, 1, '#')
rect(g, 4, 4, 6, 3, 'c')
g[9][7] = 'd'
maps['attic'] = dict(id='attic', name='עליית הגג הסודית', music='mystery', legend=LEG, tiles=out(g),
    props=[dict(type='chest', x=6, y=3, id='album_chest', interact=dict(dialogue='album')), dict(type='lamp', x=3, y=3), dict(type='lamp', x=10, y=3), dict(type='plant', x=11, y=7)],
    npcs=[], pickups=[],
    doors=[dict(x=7, y=9, to='house', tx=20, ty=3, dir=0, label='למטה')],
    spawn=dict(x=6, y=7))

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, '..', 'content', 'maps.json'), 'w', encoding='utf-8') as fh:
    json.dump(maps, fh, indent=1, ensure_ascii=False)
print({k: (len(v['tiles'][0]), len(v['tiles'])) for k, v in maps.items()})
