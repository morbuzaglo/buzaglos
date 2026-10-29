// Injected into the page by tools/shot.mjs for scripted play-testing.
window.T = {
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  click: async (n = 1) => { for (let i = 0; i < n; i++) { document.getElementById('dialogue').click(); await T.sleep(70); } },
  w: () => __game.scene.getScene('World'),
  near: (id) => { const w = T.w(); const n = w.npcs.find((x) => x.id === id); w.player.x = n.spr.x + 12; w.player.y = n.spr.y; w.player.dir = 2; return 1; },
  nearProp: (id) => { const w = T.w(); const r = w.props.find((x) => x.p.id === id); w.player.x = r.p.x * 16 + 8; w.player.y = (r.p.y + 2) * 16 - 2; w.player.dir = 1; return 1; },
  tp: (map, x, y) => { T.w().changeMap(map, x, y); return 1; },
  skipIntro: async () => { window.confirm = () => true; (document.querySelector('.pick[data-id="' + (window.__who || 'mordechai') + '"]') || document.getElementById('btnPlay')).click(); await T.sleep(600); await T.click(30); },
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

Object.assign(T, {
  go: async (map, x, y) => { T.tp(map, x, y); await T.sleep(900); },
  playQuiz: async () => { for (let k = 0; k < 8; k++) { const c = document.querySelector('.mg .choice'); if (!c) { await T.sleep(300); if (!document.querySelector('.mg')) break; continue; } c.click(); await T.sleep(900); } return 1; },
  doAccept: async (map, npc) => { await T.go(map, 8, 9); T.near(npc); T.w().onA(); await T.accept(); },
  playthrough2: async (log) => {
    const L = (m) => log.push(m + ' :: ' + T.state());
    const talkMg = async (npc, clicks, game) => { T.near(npc); T.w().onA(); await T.sleep(500); await T.click(clicks); await T.sleep(500); if (game === 'quiz') await T.playQuiz(); if (game === 'timing') await T.playTiming(); if (game === 'memory') await T.playMemory(); if (game === 'reaction') await T.playReaction(); await T.sleep(1500); await T.rewardFlow(); };
    // japan (yitzhak, house)
    await T.doAccept('house', 'yitzhak'); await talkMg('yitzhak', 2, 'quiz'); L('japan');
    // phone (anat)
    await T.doAccept('house', 'anat'); await T.go('market', 7, 8); T.at('market', 12, 6); await T.sleep(1200); await T.go('house', 8, 9); await T.talk('anat', 6); await T.rewardFlow(); L('phone');
    // barcelona
    await T.doAccept('house', 'anat'); await T.go('street', 9, 11); for (const [x, y] of [[10, 11], [22, 12], [34, 11]]) { T.at('street', x, y); await T.sleep(1000); }
    await T.go('house', 8, 9); await talkMg('anat', 2, 'timing'); await T.talk('anat', 4); await T.rewardFlow(); L('barcelona');
    // cruise
    await T.doAccept('house', 'anat'); await talkMg('anat', 1, 'quiz'); L('cruise');
    // dinner
    await T.doAccept('house', 'anat'); await talkMg('anat', 2, 'memory'); await T.talk('yitzhak', 6); await T.rewardFlow(); L('dinner');
    // pikanto + seven (tohar)
    await T.doAccept('house', 'tohar'); await talkMg('tohar', 3, 'quiz'); L('pikanto');
    await T.doAccept('house', 'tohar'); await talkMg('tohar', 2, 'reaction'); L('seven');
    // terry (eden)
    await T.doAccept('house', 'eden'); await T.go('street', 11, 14); await T.talk('terry', 8); await T.go('house', 8, 9); await talkMg('eden', 0, 'quiz'); L('terry');
    // cat (maayan)
    await T.doAccept('house', 'maayan'); for (const [x, y] of [[3, 12], [16, 9]]) { T.at('house', x, y); await T.sleep(1000); } await T.talk('eden', 8); await T.rewardFlow(); L('cat');
    // rinat + yoav (street)
    await T.doAccept('street', 'rinat'); await talkMg('rinat', 2, 'quiz'); L('rinat');
    await T.go('street', 21, 13); T.near('yoav'); T.w().onA(); await T.accept(); await talkMg('yoav', 2, 'reaction'); L('yoav');
    // ending
    await T.go('house', 19, 3); T.nearProp('attic_door'); T.w().onA(); await T.sleep(500); await T.click(4); await T.sleep(1500);
    T.nearProp('album_chest'); T.w().onA(); await T.sleep(500); await T.click(12); await T.sleep(800);
    return 'done';
  },
});
1;

Object.assign(T, {
  clickChoice: async (idx) => { const c = document.querySelectorAll('#dialogue .choice')[idx]; if (c) c.click(); await T.sleep(500); },
  play: async (game, cfg) => {
    if (game === 'timing') return T.playTiming();
    if (game === 'memory') return T.playMemory();
    if (game === 'reaction') return T.playReaction();
    if (game === 'quiz') { for (let k = 0; k < (cfg?.questions?.length || 3); k++) { const q = cfg.questions[k]; await T.sleep(250); const cs = [...document.querySelectorAll('.mg .choice')]; const right = cs.find((c) => c.textContent.includes(q.a[q.c])); if (right) right.click(); await T.sleep(900); } return 1; }
    return 1;
  },
  // Generic story solver: reads the current step of the quest and performs it like a player would.
  solve: async (qid, log) => {
    const { Q, content, S } = __bz;
    const w = () => T.w();
    for (let guard = 0; guard < 120; guard++) {
      const st = S.state.quests[qid];
      if (!st || st.state === 'done') break;
      const step = Q.currentStep(qid); if (!step) break;
      const before = JSON.stringify([st.step, S.state.map]);
      log.push(qid + ' step ' + st.step + ' ' + step.type + (step.game ? ':' + step.game : '') + ' map=' + S.state.map);
      await T.sleep(500);
      const dlg = () => document.getElementById('dialogue') && !document.getElementById('dialogue').classList.contains('hidden');
      if (['cutscene', 'teleport', 'choice'].includes(step.type) || (step.type === 'minigame' && step.auto)) {
        for (let k = 0; k < 60; k++) {
          await T.sleep(400);
          if (JSON.stringify([S.state.quests[qid]?.step, S.state.map]) !== before || S.state.quests[qid]?.state === 'done') break;
          if (document.querySelector('#dialogue .choice')) { const idx = step.options ? step.options.findIndex((o) => o.correct) : 0; await T.clickChoice(idx < 0 ? 0 : idx); continue; }
          if (document.querySelector('.mg') && step.game) { await T.play(step.game, step.config); continue; }
          if (dlg()) document.getElementById('dialogue').click();
        }
      } else if (step.type === 'collect') {
        const m = content.maps[S.state.map];
        const pks = (m.pickups || []).filter((p) => p.needsQuest === qid && !S.state.collected[S.state.map + ':' + p.id]);
        for (const p of pks) { T.at(S.state.map, p.x, p.y); await T.sleep(900); }
        for (const n of (m.npcs || []).filter((n) => n.gives === step.item)) { if (w().npcs.find((x) => x.entry === n)) { const npc = w().npcs.find((x) => x.entry === n); w().player.x = npc.spr.x + 12; w().player.y = npc.spr.y; w().player.dir = 2; w().onA(); await T.sleep(500); await T.click(4); await T.sleep(300); } }
        for (const p of (m.props || []).filter((p) => p.gives === step.item)) { T.nearProp(p.id); w().onA(); await T.sleep(500); await T.click(4); await T.sleep(300); }
      } else if (step.type === 'interact' || step.type === 'minigame' || step.type === 'talk') {
        const tgt = step.target || step.at || step.npc;
        if (w().npcs.find((x) => x.id === tgt)) T.near(tgt); else T.nearProp(tgt);
        w().onA(); await T.sleep(600);
        const mg = step.minigame || (step.type === 'minigame' ? { game: step.game, config: step.config } : null);
        for (let k = 0; k < 12; k++) { if (document.querySelector('.mg')) break; if (dlg()) document.getElementById('dialogue').click(); await T.sleep(350); }
        if (mg && document.querySelector('.mg')) await T.play(mg.game, mg.config);
        await T.sleep(1500); await T.rewardFlow();
      } else if (step.type === 'goto') {
        T.at(step.map, step.x, step.y); await T.sleep(1200);
      }
      await T.rewardFlow();
    }
    await T.sleep(1200); await T.rewardFlow(); await T.sleep(1500);
    return S.state.quests[qid]?.state;
  },
  playthrough3: async (log) => {
    window.__bzTest = { autowin: { drive: true, sequence: true } };
    const { S, content } = __bz; const res = {};
    for (const q of Object.values(content.quests)) {
      T.nearProp('album_portal'); T.w().onA(); await T.sleep(700);
      __bz.UI.closePanel && __bz.UI.closePanel();
      __bz.UI.hooks.enterStory(q.id); await T.sleep(1500);
      res[q.id] = await T.solve(q.id, log);
      await T.sleep(800);
    }
    return JSON.stringify({ res, shards: S.state.shards.length, map: S.state.map });
  },
});
1;
Object.assign(T, {
  callAndEnter: async () => {
    const w = T.w(); const rec = w.callerRec; if (!rec) return 'no-caller';
    w.player.x = rec.spr.x + 14; w.player.y = rec.spr.y; w.player.dir = 2; await T.sleep(400);
    w.onA(); await T.sleep(600);
    for (let k = 0; k < 30; k++) { if (document.querySelector('#dialogue .choice')) { await T.clickChoice(0); break; } document.getElementById('dialogue') && document.getElementById('dialogue').click(); await T.sleep(350); }
    await T.sleep(1800); return 'entered';
  },
  playthrough4: async (log) => {
    window.__bzTest = { autowin: { drive: true, sequence: true } };
    const { S, Q } = __bz; const res = {};
    for (const q of Q.missions()) {
      await T.sleep(1500);
      const r = await T.callAndEnter(); log.push(q.id + ' call=' + r + ' caller=' + (T.w().callerId || '-'));
      res[q.id] = await T.solve(q.id, log);
      await T.sleep(800);
    }
    return JSON.stringify({ res, shards: S.state.shards.length, map: S.state.map });
  },
});
1;
