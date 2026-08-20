// 灰烬城 · 世界内容（仅服务端，前端不打包，按需下发且经服务端校验）
import type { AreaDef, NpcDef, QuestDef, HiddenDef, EndingDef, ItemDef } from './types';

export const START_AREA = 'gate';

export const ITEMS: Record<string, ItemDef> = {
  scrap_metal: { id: 'scrap_metal', name: '废金属', desc: '废墟里到处都是，可换东西。' },
  ration: { id: 'ration', name: '压缩口粮', desc: '能救命，也能收买人。' },
  meds: { id: 'meds', name: '抗生素', desc: '感染与辐射伤的硬通货。' },
  map_fragment: { id: 'map_fragment', name: '地下管网地图碎片', desc: '指向城市下方的另一座城。' },
  key_bunker: { id: 'key_bunker', name: '锈蚀的钥匙', desc: '不知开哪扇门，但很重要。' },
  photo: { id: 'photo', name: '一张被烧焦的照片', desc: '背面写着一行字：「他们不想让你看见这个。」' },
  echo_core: { id: 'echo_core', name: '回声核心', desc: '一段拒绝被删除的记忆。' },
  fuel: { id: 'fuel', name: '柴油', desc: '船夫要的渡河费。' },
  // v2.0.3 P2: 跨周目礼物 — 通关后下周口袋里多一份旧笔记,作为"档案管理员"的礼物
  note_archive: {
    id: 'note_archive',
    name: '档案管理员的旧笔记',
    desc: '一份泛黄的笔记：「你走过这条河了。下次别只看到河流,也看看岸边。」',
  },
  // v2.0.3 P2: 解谜材料(可选物品)
  key_lockbox: { id: 'key_lockbox', name: '小铁盒钥匙', desc: '柜子密码锁的备用钥匙,老吴留下的。' },
};

export const AREAS: Record<string, AreaDef> = {
  gate: {
    id: 'gate', name: '旧城西门', desc: '唯一还有人把守的城门。风从废墟那头吹来，带着灰。',
    neighbors: ['market', 'tenements'],
  },
  market: {
    id: 'market', name: '黑市街区', desc: '铁皮棚下做着见不得光的买卖，疤脸的人在收"保护费"。',
    neighbors: ['gate', 'metro', 'factory'],
  },
  metro: {
    id: 'metro', name: '地铁废线', desc: '停电的隧道里有人生火。辐射读数偏高，呼吸要浅。',
    neighbors: ['market', 'tenements'], danger: 12,
    hiddenPickups: ['scrap_metal'],
  },
  tenements: {
    id: 'tenements', name: '居民楼群', desc: '半塌的楼里还住着人。墙上的涂鸦拼出一个失踪者的名字。',
    neighbors: ['gate', 'metro', 'river'],
  },
  factory: {
    id: 'factory', name: '废弃工厂', desc: '出事的地方。铁门后的车间，监工说"里面早就清干净了"。',
    neighbors: ['market', 'river'], danger: 22,
    hiddenPickups: ['scrap_metal', 'meds'],
  },
  river: {
    id: 'river', name: '河岸棚户', desc: '靠着一条毒河活下来的人。船夫的船，能去更远也更危险的地方。',
    neighbors: ['tenements', 'factory', 'undernet'],
    hiddenPickups: ['key_bunker', 'fuel'],
  },
  undernet: {
    id: 'undernet', name: '地下管网', desc: '城市真正的底色。这里没有灰，只有嗡鸣，和一个不肯闭嘴的声音。',
    neighbors: ['river'], locked: true, unlockFlag: 'has_undermap',
  },
};

// NPC（每个区域 1-3 个，含多分支对话）
export const NPCS: NpcDef[] = [
  // —— 旧城西门 ——
  {
    id: 'zhou', area: 'gate', name: '老周', blurb: '守门的旧货贩子，什么都知道一点。',
    start: 'a',
    nodes: {
      a: { speaker: '老周', text: '新来的？这年头还敢出城捡东西的，要么是傻子，要么是走投无路。你算哪种？',
        options: [
          { label: '打听城里的事', goto: 'b', setFlag: 'met_zhou' },
          { label: '问哪里能换物资', goto: 'c' },
          { label: '先走了', goto: 'bye' },
        ] },
      b: { speaker: '老周', text: '工厂半年前炸的，死的不是报告上那几个。阿芸家的丫头，到现在没回来。', options: [
          { label: '谢谢，我记下了', goto: 'bye', setFlag: 'clue_factory' },
        ] },
      c: { speaker: '老周', text: '黑市能换。废金属、药、口粮都收。你要是捡到好东西，先拿来给我看。', options: [
          { label: '明白', goto: 'bye', setFlag: 'met_zhou' },
        ] },
      bye: { text: '（老周挥挥手，继续翻他的破烂。）' },
    },
  },
  {
    id: 'yun', area: 'gate', name: '阿芸', blurb: '总在城门边张望的女人，眼神空了一块。',
    start: 'a',
    nodes: {
      a: { speaker: '阿芸', text: '你……见过我女儿小月吗？她去地铁那边找药，再没回来。',
        options: [
          { label: '我替你去找', goto: 'b', acceptQuest: 'q_daughter', setFlag: 'met_yun' },
          { label: '节哀', goto: 'bye' },
          // v2.0.3: trust>=3 解锁的真情隐藏分支 — 之前帮她 / 给过物资才能聊到的内心话
          { label: '（之前帮忙过）她现在还好吗？', goto: 'warm', requires: { questDone: 'q_daughter', trust: { npc: 'yun', min: 3 } } },
        ] },
      b: { speaker: '阿芸', text: '她左腕有道疤。要是见到她，告诉她妈还在等。', options: [
          { label: '我记住了', goto: 'bye', setFlag: 'clue_yue' },
        ] },
      warm: { speaker: '阿芸', text: '她比以前开朗了些……谢谢你。如果哪天能找到老吴，林婶也能安心一些。', options: [
        { label: '我会去居民楼看看', goto: 'bye', setFlag: 'warm_yun' },
      ] },
      bye: { text: '（阿芸又转回去看城门外的灰。）' },
    },
  },
  // —— 黑市街区 ——
  {
    id: 'scar', area: 'market', name: '疤脸', blurb: '收保护费的，腰上别着家伙。',
    start: 'a',
    nodes: {
      a: { speaker: '疤脸', text: '想在这片说话，先交三块废金属。没有？那就别怪我不客气。',
        options: [
          { label: '（给他 3 废金属）', goto: 'ok', requires: { item: 'scrap_metal', itemQty: 3 }, setFlag: 'paid_scar' },
          { label: '（转身走开）', goto: 'bye' },
        ] },
      ok: { speaker: '疤脸', text: '识相。药我这儿有，用废金属换。工厂里多的是，胆子大就去。', options: [
        { label: '知道了', goto: 'bye', setFlag: 'met_scar' },
        // v2.0.3 剧情:带真相物品来,疤脸立场暴露 — 他也是受害者一员
        { label: '（出示照片）我见到哑女给我的那张照片', goto: 'scar_truth', requires: { item: 'photo' } },
      ] },
      // v2.0.3:疤脸知道自己被监视,他吐露立场:"我也是被淘汰的,只是我学会低着头"
      scar_truth: { speaker: '疤脸', text: '……（他低声）我弟弟在工厂里上班,出事后再没回来。这疤是被"谈话"时留下的。我接着收钱,只是为了让上面的人别盯着我。你要是继续,就别让我看见。', options: [
        { label: '我明白', goto: 'bye', setFlag: 'scar_confessed', trust: { npc: 'scar', delta: 1 } },
      ] },
      bye: { text: '（疤脸眯着眼看你离开。）' },
    },
  },
  {
    id: 'manman', area: 'market', name: '小满', blurb: '在铁皮缝里跑的小女孩。',
    start: 'a',
    nodes: {
      a: { speaker: '小满', text: '哥哥，你看见我的小熊了吗？昨天还在，今天就没了。',
        options: [
          { label: '我帮你找（接任务）', goto: 'b', acceptQuest: 'q_orphan', setFlag: 'met_manman' },
          { label: '小朋友，先回家吧', goto: 'bye' },
          // v2.0.3: trust>=4 解锁 — 找回小熊之后才出现,小满愿意见到陌生人
          { label: '（以后再来找你玩）', goto: 'play', requires: { questDone: 'q_orphan', trust: { npc: 'manman', min: 4 } } },
        ] },
      b: { speaker: '小满', text: '它在工厂那边！我不敢去，那里有坏人。', options: [
          { label: '我去看看', goto: 'bye', setFlag: 'clue_bear' },
        ] },
      play: { speaker: '小满', text: '哥哥你来啦！我在河岸边发现了一个奇怪符号——一颗星星,藏在地砖下面……', options: [
        { label: '星星？什么颜色？', goto: 'bye', setFlag: 'clue_star' },
      ] },
      bye: { text: '（小满蹲回去摆弄石子。）' },
    },
  },
  {
    id: 'doctor', area: 'market', name: '医生', blurb: '黑市唯一的郎中，手很稳。',
    start: 'a',
    nodes: {
      a: { speaker: '医生', text: '我缺两盒抗生素，能给病人续命。你要是弄来，我替你治伤。',
        options: [
          { label: '我去找药（接任务）', goto: 'b', acceptQuest: 'q_cure', setFlag: 'met_doctor' },
          { label: '改天', goto: 'bye' },
        ] },
      b: { speaker: '医生', text: '地铁和工厂都有。别贪，辐射会要命。', options: [
          { label: '明白', goto: 'bye' },
        ] },
      c: { speaker: '医生', text: '你真把药送来了。孩子们会记住你的，我也会。\n这是给他们的谢礼，你别嫌弃。',
        options: [
          { label: '谢谢医生', goto: 'c_after', setFlag: 'rewarded_by_doctor', giveItem: 'ration' },
        ] },
      c_after: { speaker: '医生', text: '这阵子工厂的味道不对。你要是去，小心河上游的风。', options: [
        { label: '我会注意', goto: 'bye' },
      ] },
      bye: { text: '（医生低头继续碾药。）' },
    },
    questStart: { q_cure: 'c' },
  },
  // —— 地铁废线 ——
  {
    id: 'ghost', area: 'metro', name: '幽灵', blurb: '火光旁的人影，说话像隔着水。',
    start: 'a',
    nodes: {
      a: { speaker: '幽灵', text: '……你也听得见它们在响吗？地下的钟。',
        options: [
          { label: '（递上口粮）', goto: 'b', requires: { item: 'ration' }, setFlag: 'fed_ghost' },
          { label: '你在说什么？', goto: 'c' },
          { label: '（离开）', goto: 'bye' },
        ] },
      b: { speaker: '幽灵', text: '好心人。钟下面有张地图，能去他们不想让你去的地方。工厂的柜子里。',
        options: [
          { label: '地图？', goto: 'd', setFlag: 'clue_undermap' },
        ] },
      c: { speaker: '幽灵', text: '钟在工厂。钟在河底。钟在你不敢去的地方。', options: [
          { label: '……', goto: 'bye', setFlag: 'met_ghost' },
        ] },
      d: { speaker: '幽灵', text: '去找吧。找到就别回头。', options: [
          { label: '好', goto: 'bye' },
        ] },
      bye: { text: '（人影又融进火光里。）' },
    },
  },
  {
    id: 'singer', area: 'metro', name: '流浪歌手', blurb: '在隧道里弹断弦琴的人。',
    start: 'a',
    nodes: {
      a: { speaker: '歌手', text: '我写了一首歌，关于一个左腕有疤的女孩。你听过吗？',
        options: [
          { label: '我正在找她', goto: 'b', setFlag: 'clue_song' },
          { label: '唱来听听', goto: 'c' },
          { label: '（离开）', goto: 'bye' },
        ] },
      b: { speaker: '歌手', text: '她在更深的隧道。小心疤脸的人，他们也盯着她。', options: [
          { label: '谢谢', goto: 'bye', setFlag: 'met_singer' },
        ] },
      c: { speaker: '歌手', text: '「灰落下来，妈妈还在等，钟声响过，我就回家。」……就这些了。', options: [
          { label: '（离开）', goto: 'bye' },
        ] },
      bye: { text: '（琴声又断在半句。）' },
    },
  },
  // —— 居民楼群 ——
  {
    id: 'linshen', area: 'tenements', name: '林婶', blurb: '总在擦一面根本没有人的照片。',
    start: 'a',
    nodes: {
      a: { speaker: '林婶', text: '我家老吴，去工厂上工，就没回来。他们说他"被优化了"。',
        options: [
          { label: '我去工厂看看（接任务）', goto: 'b', acceptQuest: 'q_husband', setFlag: 'met_linshen' },
          { label: '节哀', goto: 'bye' },
        ] },
      b: { speaker: '林婶', text: '他袖子里总藏着把钥匙，说"万一哪天用得上"。', options: [
          { label: '钥匙？', goto: 'c', setFlag: 'clue_key' },
        ] },
      c: { speaker: '林婶', text: '在河岸那边丢的，也许还在。', options: [
          { label: '我去找', goto: 'bye' },
        ] },
      bye: { text: '（林婶又擦起那面空照片。）' },
    },
  },
  {
    id: 'teen', area: 'tenements', name: '少年', blurb: '蹲在涂鸦前的瘦高个，眼睛很亮。',
    start: 'a',
    nodes: {
      a: { speaker: '少年', text: '这面墙的密码，我快破译了。但缺一段——在工厂的记录里。',
        options: [
          { label: '我帮你找（接任务）', goto: 'b', acceptQuest: 'q_code', setFlag: 'met_teen' },
          { label: '什么密码？', goto: 'c' },
          { label: '（离开）', goto: 'bye' },
        ] },
      b: { speaker: '少年', text: '找到那段记录，回来找我。我给你看地下的样子。', options: [
          { label: '好', goto: 'bye' },
        ] },
      c: { speaker: '少年', text: '地下还有一座城。他们不让我们下去，因为下面的人，记得真相。', options: [
          { label: '（离开）', goto: 'bye', setFlag: 'clue_down' },
        ] },
      bye: { text: '（少年继续对着墙念念有词。）' },
    },
  },
  {
    id: 'wu', area: 'tenements', name: '老吴（？）', blurb: '楼洞里缩着的老人，眼神浑浊却警觉。',
    start: 'a',
    nodes: {
      a: { speaker: '老吴', text: '……你拿着我家的钥匙？林婶让你来的？',
        options: [
          { label: '是的，她在等你', goto: 'b', requires: { item: 'key_bunker' }, setFlag: 'wu_found' },
          { label: '（你是谁）', goto: 'c' },
          { label: '（离开）', goto: 'bye' },
        ] },
      b: { speaker: '老吴', text: '我没死。他们把我"优化"了，可我躲进了楼里的密室。这钥匙开那扇门。', options: [
          { label: '密室？', goto: 'd', setFlag: 'knows_bunker' },
        ] },
      c: { speaker: '老吴', text: '一个不该还活着的人。别声张。', options: [
          { label: '（离开）', goto: 'bye', setFlag: 'met_wu' },
        ] },
      d: { speaker: '老吴', text: '密室里有真相。但你要先拿到地图，才下得去。', options: [
          { label: '我明白了', goto: 'bye' },
        ] },
      bye: { text: '（老人又缩回阴影里。）' },
    },
  },
  // —— 废弃工厂 ——
  {
    id: 'foreman', area: 'factory', name: '监工', blurb: '穿着干净制服的人，在这片废墟里格格不入。',
    start: 'a',
    nodes: {
      a: { speaker: '监工', text: '捡破烂的，这里清过场了。带着你的东西，滚。',
        options: [
          { label: '这里到底出了什么事', goto: 'b', setFlag: 'met_foreman' },
          { label: '（查看车间记录）', goto: 'c', setFlag: 'found_record', requires: { flag: 'clue_down' } },
          { label: '（离开）', goto: 'bye' },
          // v2.0.3: 带 photo + 真相 flag,触发监工认罪分支
          { label: '（出示烧焦的照片）这照片里的人,你认识吧', goto: 'confess', requires: { item: 'photo', flag: 'truth_photo' } },
        ] },
      b: { speaker: '监工', text: '意外。报告上写得很清楚。你最好别多问。', options: [
          { label: '（接下抉择任务）', goto: 'd', acceptQuest: 'q_factory' },
          { label: '（离开）', goto: 'bye' },
        ] },
      c: { speaker: '监工', text: '谁让你动记录的！……算了。你看都看了。', options: [
          { label: '（接下抉择任务）', goto: 'd', acceptQuest: 'q_factory', setFlag: 'truth_evidence' },
        ] },
      // v2.0.3:监工不再是脸谱反派 — 他知道真相,只是装作不知道
      confess: { speaker: '监工', text: '……（他点了根烟,手在发抖）那场"意外"我没签字。当时上面来人,我只是……我看着他们把名单上的人带走了。我有老婆孩子。你有本事就公开,别牵连我。', options: [
        { label: '我替你保密,但你要给我看记录', goto: 'records', trust: { npc: 'foreman', delta: 2 } },
        { label: '我不会替你瞒', goto: 'bye', setFlag: 'foreman_refused' },
      ] },
      // v2.0.3:监工交出真相记录的妥协分支
      records: { speaker: '监工', text: '……在文件柜第三格,密码是我女儿的生日。0307。', options: [
        { label: '（记下密码）', goto: 'd', acceptQuest: 'q_factory', setFlag: 'truth_evidence', trust: { npc: 'foreman', delta: 1 } },
      ] },
      d: { speaker: '监工', text: '三条路：把记录交给我，当没看见；或者，你想当英雄？', options: [
          { label: '（先想想）', goto: 'bye' },
        ] },
      bye: { text: '（监工盯着你，像在估量你值不值得处理。）' },
    },
  },
  {
    id: 'tech', area: 'factory', name: '技师', blurb: '被铐在工位上的年轻人，手指还在动。',
    start: 'a',
    nodes: {
      a: { speaker: '技师', text: '帮我松开，我就告诉你柜子里有什么。那张地图，能去地下。',
        options: [
          { label: '（松开他）', goto: 'b', setFlag: 'freed_tech' },
          { label: '先告诉我地图在哪', goto: 'c' },
          { label: '（离开）', goto: 'bye' },
          // v2.0.3 剧情:深层选项 — 玩家已经见过技师,问他身份
          { label: '你是谁,为什么帮我们', goto: 'identity', requires: { trust: { npc: 'tech', min: 1 } } },
        ] },
      b: { speaker: '技师', text: '够意思。柜子在监工办公室，钥匙在他身上。地图在里面。',
        options: [
          { label: '好', goto: 'bye', setFlag: 'knows_cabinet' },
        ] },
      c: { speaker: '技师', text: '先松开我，再谈条件。', options: [
        { label: '（离开）', goto: 'bye' },
      ] },
      // v2.0.3:技师承认身份 — 他是事故时潜入的调查记者
      identity: { speaker: '技师', text: '……我是外面来的记者。事故当晚我藏在通风管里。他们不知道我活着。我是来把真相带出去的——不是为了你,是为了还在外面的人。', options: [
        { label: '那就先把你自己解脱出来', goto: 'b', trust: { npc: 'tech', delta: 1 } },
        { label: '那你拍的证据呢', goto: 'evidence', requires: { flag: 'freed_tech' } },
      ] },
      // v2.0.3:拿到证据后,技师才透露完整真相链
      evidence: { speaker: '技师', text: '我拍了底片,那是完整的记录——但监工把它和那烧焦的一起埋在柜子里了。你拿到的"照片"是我留下来的一部分。剩下的,你得去地下管网,找到回声,它记得所有的事。', options: [
        { label: '我明白了', goto: 'bye', setFlag: 'knows_full_evidence' },
      ] },
      bye: { text: '（技师垂下眼，继续装作在干活。）' },
    },
  },
  // —— 河岸棚户 ——
  {
    id: 'boatman', area: 'river', name: '船夫', blurb: '毒河上唯一敢摆渡的人。',
    start: 'a',
    nodes: {
      a: { speaker: '船夫', text: '过河？一桶柴油，或者……你手里有那张地图的话，我送你下去。',
        options: [
          { label: '（给柴油）', goto: 'b', requires: { item: 'fuel' }, setFlag: 'paid_boat' },
          { label: '（出示地图碎片）', goto: 'c', requires: { item: 'map_fragment' }, setFlag: 'has_undermap' },
          { label: '（离开）', goto: 'bye' },
        ] },
      b: { speaker: '船夫', text: '上船。下游那片棚户，有人记得真相。', options: [
          { label: '（渡河）', goto: 'bye' },
        ] },
      c: { speaker: '船夫', text: '……你真找到了。坐稳，我送你去他们最怕你去的地方。', options: [
          { label: '（下到地下管网）', goto: 'bye' },
        ] },
      bye: { text: '（船夫撑篙，毒河泛起油光。）' },
    },
  },
  {
    id: 'mute', area: 'river', name: '哑女', blurb: '不说话的女孩，手里总攥着什么。',
    start: 'a',
    nodes: {
      a: { speaker: '哑女', text: '（她把一张烧焦的照片塞进你手里，又指了指自己的嘴，摇了摇头。）',
        options: [
          { label: '（收下照片）', goto: 'b', giveItem: 'photo', setFlag: 'met_mute' },
          { label: '（离开）', goto: 'bye' },
        ] },
      b: { speaker: '哑女', text: '（她比划：上面的人，想让所有人都像她一样，说不出话。）',
        options: [
          { label: '我懂了', goto: 'bye', setFlag: 'truth_photo' },
        ] },
      bye: { text: '（哑女转身走进棚户，再没回头。）' },
    },
  },
  // —— 地下管网 ——
  {
    id: 'echo', area: 'undernet', name: '回声', blurb: '墙里渗出的声音，不属于任何人，又属于所有人。',
    start: 'a',
    nodes: {
      a: { speaker: '回声', text: '你下来了。他们都以为，把记忆删干净，城市就干净了。',
        options: [
          { label: '你是谁', goto: 'b' },
          { label: '（聆听）', goto: 'c' },
          { label: '（离开）', goto: 'bye' },
          // v2.0.3:带照片+回声核心进来,触发"完整真相"分支
          { label: '（手持真相碎片 + 回声核心）我能听见完整的故事吗', goto: 'full', requires: { item: 'photo' }, attr: { hp: -10 } },
        ] },
      b: { speaker: '回声', text: '我是被删除的那部分。钟、照片、疤、钥匙——所有他们想抹掉的，都在我这里。', options: [
          { label: '我能做什么', goto: 'c' },
        ] },
      c: { speaker: '回声', text: '带着我的核心出去。让人记得。否则，他们赢了。', options: [
          { label: '（取走回声核心）', goto: 'd', giveItem: 'echo_core', setFlag: 'has_echo_core' },
        ] },
      // v2.0.3:"完整真相"分支 — 拿到 echo_core 后,带回去这里听到整段事件
      full: { speaker: '回声', text: '（嗡鸣变强,你的意识里被压进一段记忆——）\n火灾前三个月,42人向外部送出报告。监工拿到名单。事故当夜,只有一人没在场——老吴,因为他提早下班。剩下的人被"优化"。他们让所有家属相信是意外。', options: [
        { label: '我听到了', goto: 'c', setFlag: 'heard_full_truth' },
      ] },
      d: { speaker: '回声', text: '……谢谢你，还记得回来。', options: [
          { label: '（离开）', goto: 'bye' },
        ] },
      bye: { text: '（嗡鸣渐渐平复，像一个人终于睡着了。）' },
    },
  },
];

// 任务（多分支）
export const QUESTS: QuestDef[] = [
  {
    id: 'q_daughter', name: '找回家的小月', area: 'gate', giver: 'yun',
    summary: '阿芸的女儿小月去地铁找药后失踪。',
    category: 'main', mainStep: 1,
    milestone: '小月回家了。你把活生生的人从灰里接了回来。',
    methods: [
      { id: 'm_find', label: '在地铁深处找到她，平安带回', path: 'kind',
        completeRequires: { flag: 'met_singer', area: 'metro' },
        effects: [{ flag: 'found_yue' }, { attr: { reputation: 8 } }] },
      { id: 'm_force', label: '武力制伏拦路的人，强行带走', path: 'hard',
        completeRequires: { area: 'metro', attrs: { hp: 40 } },
        effects: [{ flag: 'found_yue' }, { attr: { reputation: -6, hp: -20 } }] },
      { id: 'm_lie', label: '回去告诉阿芸「找到了」，其实没有', path: 'neutral',
        completeRequires: { flag: 'met_yun' },
        effects: [{ flag: 'lied_yue' }, { attr: { reputation: -10 } }] },
    ],
  },
  {
    id: 'q_supply', name: '老周的存货', area: 'gate', giver: 'zhou',
    summary: '老周要 3 块废金属。',
    category: 'side',
    methods: [
      { id: 'm_give', label: '给他 3 块废金属', path: 'neutral',
        completeRequires: { item: 'scrap_metal', itemQty: 3 },
        effects: [{ item: 'scrap_metal', itemQty: -3 }, { item: 'ration', itemQty: 1 }, { trust: { npc: 'zhou', delta: 2 } }] },
    ],
  },
  {
    id: 'q_cure', name: '医生的药', area: 'market', giver: 'doctor',
    summary: '医生要 2 盒抗生素。',
    category: 'main', mainStep: 2,
    milestone: '医生收下了抗生素。"孩子们会记住你的,我也会。"',
    methods: [
      { id: 'm_give', label: '给他 2 盒抗生素', path: 'kind',
        completeRequires: { item: 'meds', itemQty: 2 },
        effects: [{ item: 'meds', itemQty: -2 }, { attr: { hp: 40 } }, { trust: { npc: 'doctor', delta: 3 } }] },
    ],
  },
  {
    id: 'q_orphan', name: '小满的小熊', area: 'market', giver: 'manman',
    summary: '小满的小熊掉在了工厂那边。',
    category: 'side',
    methods: [
      { id: 'm_get', label: '去工厂找回小熊（给她 1 口粮）', path: 'kind',
        completeRequires: { flag: 'clue_bear', area: 'factory', item: 'ration' },
        effects: [{ item: 'ration', itemQty: -1 }, { trust: { npc: 'manman', delta: 3 } }, { flag: 'good_deed' }] },
    ],
  },
  {
    id: 'q_husband', name: '林婶的丈夫', area: 'tenements', giver: 'linshen',
    summary: '老吴在工厂"被优化"后失踪。',
    category: 'main', mainStep: 3,
    milestone: '老吴从密室里走出来,擦了擦眼睛:"我以为没人来了。"',
    methods: [
      { id: 'm_rescue', label: '在居民楼密室找到藏起来的老吴', path: 'kind',
        completeRequires: { flag: 'wu_found' },
        effects: [{ flag: 'saved_wu' }, { attr: { reputation: 6 } }] },
      { id: 'm_confirm', label: '确认他已死，回去安抚林婶', path: 'neutral',
        completeRequires: { flag: 'met_linshen', area: 'factory' },
        effects: [{ flag: 'lost_wu' }, { attr: { reputation: 1 } }] },
    ],
  },
  {
    id: 'q_code', name: '墙上的密码', area: 'tenements', giver: 'teen',
    summary: '少年缺一段工厂记录来破译地下城的密码。',
    category: 'main', mainStep: 4,
    milestone: '密码破译了。少年递给你一张地图碎片——"去找吧,找到就别回头。"',
    methods: [
      { id: 'm_break', label: '带回工厂记录，破译密码', path: 'truth',
        completeRequires: { flag: 'found_record' },
        effects: [{ flag: 'knows_bunker' }, { item: 'map_fragment', itemQty: 1 }] },
    ],
  },
  {
    id: 'q_factory', name: '工厂的抉择', area: 'factory', giver: 'foreman',
    summary: '监工给你三条路：合作、揭发、或镇压。',
    category: 'main', mainStep: 5,
    milestone: '你做出了选择。剩下的交给时间。',
    methods: [
      { id: 'm_expose', label: '把真相证据公之于众', path: 'truth',
        completeRequires: { flag: 'truth_evidence' },
        effects: [{ flag: 'exposed' }, { attr: { reputation: 12 } }] },
      { id: 'm_coop', label: '把记录交给监工，拿一笔好处', path: 'hard',
        completeRequires: { flag: 'met_foreman' },
        effects: [{ flag: 'cooperated' }, { item: 'scrap_metal', itemQty: 5 }, { attr: { reputation: -4 } }] },
      { id: 'm_crush', label: '暴力镇压知情者，独吞秘密', path: 'hard',
        completeRequires: { flag: 'met_foreman', attrs: { hp: 30 } },
        effects: [{ flag: 'crushed' }, { attr: { reputation: -15 } }] },
    ],
  },
];

// 隐藏要素（条件组合触发）
export const HIDDENS: HiddenDef[] = [
  { id: 'h_undermap', name: '地下管网地图', area: 'factory', hint: '工厂某处藏着一张通往地下的地图。',
    requires: [{ flag: 'knows_cabinet' }, { flag: 'met_foreman' }],
    effects: [{ item: 'map_fragment', itemQty: 1 }, { flag: 'got_map' }] },
  { id: 'h_bunker', name: '居民楼密室', area: 'tenements', hint: '老吴说的密室，需要那把钥匙。',
    requires: [{ item: 'key_bunker' }, { flag: 'knows_bunker' }],
    effects: [{ flag: 'found_bunker' }, { attr: { reputation: 4 } }, { flag: 'camp_found' }] },
  { id: 'h_ghost', name: '幽灵的线索', area: 'metro', hint: '火光旁的人影，似乎知道些什么。',
    requires: [{ flag: 'fed_ghost' }],
    effects: [{ flag: 'clue_undermap' }] },
  { id: 'h_truth_photo', name: '被烧焦的真相', area: 'river', hint: '哑女手里那张照片，背面有字。',
    requires: [{ flag: 'truth_photo' }],
    effects: [{ flag: 'has_truth' }] },
  { id: 'h_echo_core', name: '回声核心', area: 'undernet', hint: '地下管网深处，一个不肯被删除的声音。',
    requires: [{ flag: 'has_undermap' }, { flag: 'has_echo_core' }],
    effects: [{ flag: 'took_echo' }] },
  { id: 'h_easter', name: '旧收音机', area: 'gate', hint: '城门边一台早就不响的收音机，还在闪灯。',
    requires: [{ flag: 'easter_click' }],
    effects: [{ flag: 'easter' }, { attr: { reputation: 1 } }] },
  // v2.0.3 钟声 world event — 拿到真相碎片之后回到地下深处听到的钟声
  // 这是个隐藏情感节点,玩家看到它就算完成一个里程碑
  { id: 'h_bell', name: '钟声响起', area: 'undernet', hint: '你听见了不该在这里响起的钟声。',
    requires: [{ flag: 'has_echo_core' }, { flag: 'has_truth' }, { flag: 'got_map' }, { flag: 'found_bunker' }],
    effects: [{ flag: 'heard_bell' }, { attr: { radiation: -20, reputation: 8 } }] },
];

// 结局（服务端判定）
export const ENDINGS: EndingDef[] = [
  { id: 'e_rebuild', title: '结局 · 重建', tone: '希望',
    passages: [
      '你把小月带回家，把老吴从密室接出来，把药给了医生。',
      '河岸的棚户里，你点起第一堆不分你我的火。',
      '有人开始记得"工厂"两个字意味着什么，也有人在学着，明天去捡更多金属。',
      '灰没散，但风里有了人味。',
      '—— 你选了把人一个个接回来。',
    ],
    requires: [{ attrs: { reputation: 20 } }, { flag: 'camp_found' }, { flag: 'exposed' }],
    hint: '需要：声望足够高，找到密室，并公开真相。',
    cost: '你失去：回去的路。',
    keeps: '留下：小月的笑声、林婶给你添的半碗汤、老吴记得你的名字。',
    tone_color: '#88dd88',
  },
  { id: 'e_hermit', title: '结局 · 独善', tone: '平静',
    passages: [
      '你办完了阿芸托付的事，没多问，也没多管。',
      '监工的记录你没交出去，也没烧掉，就压在枕头底下。',
      '城门照常开关，灰照常落下。你活下来了，这年头，活下来就算赢。',
      '—— 你选了不让自己陷进去。',
    ],
    requires: [{ flag: 'found_yue' }, { flag: 'met_foreman' }, { attrs: { reputation: -5 } }],
    hint: '需要：把小月带回来、见过监工、声望不太高。',
    cost: '你失去：让城里人记得真相的机会。',
    keeps: '留下：你自己。少数几次安稳的夜。',
    tone_color: '#ddcc88',
  },
  { id: 'e_conspirator', title: '结局 · 揭穿', tone: '凛冽',
    passages: [
      '你把工厂的记录、哑女的照片、墙上的密码，拼成一份没人能抵赖的东西。',
      '它在一个雨夜，出现在每个还通电的屏幕上。',
      '名字一个个被想起。监工消失了。可你清楚，系统还在别处运转。',
      '—— 你选了让真相见光，哪怕只是裂一道缝。',
    ],
    requires: [{ flag: 'exposed' }, { flag: 'has_truth' }],
    hint: '需要：公开真相，并收集到全部真相碎片。',
    cost: '你失去：安全的城门外圈。',
    keeps: '留下：真相在地上，不在地底。',
    tone_color: '#88c8ff',
  },
  { id: 'e_warlord', title: '结局 · 暴君', tone: '荒芜',
    passages: [
      '你压下所有知道内情的人，独吞了工厂的秘密和里面的金属。',
      '疤脸归你管，黑市挂你的名。灰城有了新规矩：听你的。',
      '阿芸还在等女儿。你没再见过她。',
      '—— 你选了在废墟上，做唯一的王。',
    ],
    requires: [{ flag: 'crushed' }, { attrs: { reputation: -10 } }],
    hint: '需要：暴力镇压知情者，并保持足够冷血。',
    cost: '你失去：城里的所有朋友。',
    keeps: '留下：灰烬城里所有装不进棺材的人。',
    tone_color: '#dd8888',
  },
  { id: 'e_echo', title: '结局 · 回声', tone: '永恒',
    passages: [
      '你带着回声核心回到地面。墙里的嗡鸣，第一次有了形状。',
      '你把核心接进城里的每一块屏、每一台旧收音机。',
      '被删除的记忆，一个接一个，自己醒过来。',
      '小月、老吴、哑女、所有"被优化"的人，在别人的嘴里，重新活了一遍。',
      '—— 隐藏结局 · 你让城市，记得自己做过什么。',
    ],
    requires: [{ flag: 'took_echo' }, { flag: 'found_bunker' }, { flag: 'got_map' }, { flag: 'has_truth' }, { flag: 'clue_undermap' }],
    hint: '需要：拿到回声核心、打开密室、拿到地图、真相齐全。',
    cost: '你失去：正常的归宿，城里每个人都会认识你。',
    keeps: '留下：你们所有人的声音。',
    tone_color: '#c47aff',
  },
];

