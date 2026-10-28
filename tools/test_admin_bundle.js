(() => {
  const bundle = {"quests":{"q_test_bbq":{"id":"q_test_bbq","title":"המנגל של אבא","giver":"uncle","summary":"בדיקה","offer":[{"who":"uncle","text":"{f:תוכלי|m:תוכל} להביא את הפחמים?"}],"steps":[{"type":"collect","item":"coal","count":2,"text":"למצוא 2 שקי פחם"}],"reward":{"coins":30,"xp":40,"shard":{"id":"shard_bbq","title":"המנגל","story":"סיפור לדוגמה."}}}},"items":{"coal":{"id":"coal","name":"פחם","type":"collectible","icon":"gem","color":"#333333","desc":"שחור"}}};
  const a = document.querySelector('textarea.code'); a.value = JSON.stringify(bundle);
  [...document.querySelectorAll('.btn')].find((b) => b.textContent.includes('בדיקה')).click();
  return 1;
})()
