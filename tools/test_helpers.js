// Injected into the page by tools/shot.mjs for scripted play-testing.
window.T = {
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  click: async (n = 1) => { for (let i = 0; i < n; i++) { document.getElementById('dialogue').click(); await T.sleep(70); } },
  w: () => __game.scene.getScene('World'),
  near: (id) => { const w = T.w(); const n = w.npcs.find((x) => x.id === id); w.player.x = n.spr.x + 12; w.player.y = n.spr.y; w.player.dir = 2; return 1; },
  nearProp: (id) => { const w = T.w(); const r = w.props.find((x) => x.p.id === id); w.player.x = r.p.x * 16 + 8; w.player.y = (r.p.y + 2) * 16 - 2; w.player.dir = 1; return 1; },
  tp: (map, x, y) => { T.w().changeMap(map, x, y); return 1; },
  skipIntro: async () => { document.getElementById('btnPlay').click(); await T.sleep(600); await T.click(30); },
  accept: async () => { await T.sleep(400); await T.click(8); await T.sleep(400); document.querySelector('#dialogue .choice')?.click(); await T.sleep(500); },
  closeReward: async () => { for (let i = 0; i < 6; i++) { const b = document.getElementById('btnContinue'); if (b) { b.click(); await T.sleep(400); } else await T.sleep(300); } },
  playTiming: async () => {
    const btn = document.getElementById('mgStop'); let wins = 0;
    for (let k = 0; k < 600 && btn.isConnected; k++) {
      const z = document.querySelector('.zone'), c = document.querySelector('.cursor'); if (!z || !c) break;
      const zl = parseFloat(z.style.left), zw = parseFloat(z.style.width), m = /calc\(([0-9.]+)%/.exec(c.style.left), pos = m ? parseFloat(m[1]) : 0;
      if (pos > zl + zw * 0.25 && pos < zl + zw * 0.75) { btn.dispatchEvent(new PointerEvent('pointerdown')); wins++; await T.sleep(500); }
      await T.sleep(12);
    } return wins;
  },
  playMemory: async () => {
    const cards = [...document.querySelectorAll('.mcard')]; const byFace = {};
    cards.forEach((c) => (byFace[c.dataset.f] ||= []).push(c));
    for (const f of Object.keys(byFace)) { byFace[f][0].click(); await T.sleep(100); byFace[f][1].click(); await T.sleep(250); } return 1;
  },
  playReaction: async () => { for (let k = 0; k < 400; k++) { const t = document.querySelector('.target'); if (t) t.dispatchEvent(new PointerEvent('pointerdown')); await T.sleep(60); if (!document.querySelector('.arena')) break; } return 1; },
  state: () => JSON.stringify({ map: __bz.S.state.map, coins: __bz.S.state.coins, xp: __bz.S.state.xp, lvl: __bz.S.state.level, shards: __bz.S.state.shards, quests: __bz.S.state.quests, inv: __bz.S.state.inv, flags: Object.keys(__bz.S.state.flags), ach: __bz.S.state.achievements }),
};
1;
Object.assign(T, {
  talk: async (id, clicks = 10) => { T.near(id); const w = T.w(); w.onA(); await T.sleep(500); await T.click(clicks); await T.sleep(300); },
  acceptFrom: async (id) => { T.near(id); T.w().onA(); await T.accept(); },
  at: (map, tx, ty) => { const w = T.w(); const p = w.player; p.x = tx * 16 + 8; p.y = ty * 16 + 15; return 1; },
  rewardFlow: async () => { await T.sleep(400); await T.closeReward(); await T.sleep(300); await T.click(4); },
  playthrough: async (log) => {
    const L = (m) => log.push(m + ' :: ' + T.state());
    // A. toast
    await T.acceptFrom('grandma'); T.nearProp('stove'); T.w().onA(); await T.sleep(500); await T.click(4); await T.playTiming(); await T.sleep(1000);
    await T.talk('grandma', 6); await T.rewardFlow(); L('toast');
    // B. remote
    await T.acceptFrom('uncle'); T.at('house', 17, 9); await T.sleep(1500); await T.talk('uncle', 8); await T.rewardFlow(); L('remote');
    // C. market (street aunt)
    await T.tp('street', 17, 12); await T.sleep(900); await T.acceptFrom('aunt'); await T.tp('market', 7, 6); await T.sleep(1500);
    T.near('shopkeeper'); T.w().onA(); await T.sleep(500); await T.click(3); await T.sleep(500); await T.playMemory(); await T.sleep(1500);
    await T.tp('street', 17, 12); await T.sleep(900); await T.talk('aunt', 6); await T.rewardFlow(); L('market');
    // D. cousin
    await T.tp('street', 30, 12); await T.sleep(900); await T.acceptFrom('cousin'); T.near('cousin'); T.w().onA(); await T.sleep(500); await T.click(4); await T.playReaction(); await T.sleep(1200); await T.rewardFlow(); L('cousin');
    // E. beach
    await T.tp('beach', 2, 9); await T.sleep(900); await T.acceptFrom('lifeguard');
    for (const [x, y] of [[5, 6], [18, 13], [27, 11]]) { T.at('beach', x, y); await T.sleep(1000); }
    await T.talk('lifeguard', 6); await T.rewardFlow(); L('beach');
    // F. ending
    await T.tp('house', 19, 3); await T.sleep(900); T.nearProp('attic_door'); T.w().onA(); await T.sleep(500); await T.click(4); await T.sleep(1500);
    L('attic'); T.nearProp('album_chest'); T.w().onA(); await T.sleep(500); await T.click(12); await T.sleep(800);
    return 'done';
  },
});
1;
