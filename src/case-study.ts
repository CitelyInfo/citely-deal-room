import schema from '../config/room-schema.json';
import caseFile from '../config/case-northstar.json';
import type { CaseFile, RoomSchema } from './engine/types';
import { loadCase } from './engine/persist';
import { Store } from './engine/store';
import { createTools } from './webmcp/tools';
import { setMaterialState } from './engine/actions';

const root = document.getElementById('case-study')!;
root.innerHTML = `
  <header class="site-header wrap">
    <a class="wordmark" href="#" aria-label="Citely 案例首页"><img src="/brand/citely-mark.png" alt="" width="24" height="24" />Citely</a>
    <nav aria-label="页面导航"><a href="#experience">交互演示</a><a href="#approach">如何实现</a><div class="lang-toggle" role="group" aria-label="语言"><button type="button" data-lang="zh" aria-pressed="true">中</button><span>/</span><button type="button" data-lang="en" aria-pressed="false">EN</button></div><a class="nav-link" href="/">打开 Deal Room <span aria-hidden="true">↗</span></a></nav>
  </header>
  <main>
    <section class="hero wrap">
      <div class="eyebrow"><span class="green-dot"></span> CITELY LABS <span class="slash">/</span> WEBMCP 案例</div>
      <div class="hero-layout"><div><h1>让 AI 走进<br>你的<span class="highlight">业务现场<svg viewBox="0 0 350 15" aria-hidden="true"><path d="M3 10 Q170 -4 346 8" /></svg></span>。</h1><p class="hero-copy">一句指令，连接对话与行动。<br>看看 Codex 如何通过 WebMCP 整理交易材料，<br class="desktop-break">把证据带回工作台，把决定留给你。</p><a class="primary hero-cta" href="#experience">体验完整流程 <span aria-hidden="true">↘</span></a></div><div class="hero-aside"><span class="aside-index">CASE STUDY — 01</span><div class="connection"><span>Codex</span><span class="connection-line" aria-hidden="true">⟷</span><span>你的业务系统</span></div><p>以 Citely Deal Room 为例<br>为 AI 开放明确、可控的网页操作。</p><div class="tags"><span>业务协作</span><span>人在回路</span><span>WebMCP</span></div></div></div>
    </section>
    <section class="experience wrap" id="experience" aria-labelledby="demo-title">
      <div class="section-top"><div><span class="eyebrow">TRY THE WORKFLOW</span><h2 id="demo-title">一边对话，一边推进。</h2></div><p class="simulation-label"><span class="amber-dot"></span>交互模拟 · 虚构案例数据</p></div>
      <div class="demo-window">
        <div class="window-bar"><div class="traffic" aria-hidden="true"><i></i><i></i><i></i></div><span>Citely Deal Room <span class="window-slash">/</span> Codex 工作流</span><span class="window-mode">SIMULATION</span></div>
        <div class="demo-body">
          <section class="agent-pane" aria-label="模拟 Codex 对话"><div class="pane-heading"><span class="codex-mark" aria-hidden="true">⌘</span><strong>Codex</strong><span class="pane-subtitle">模拟对话</span></div>
            <div class="conversation"><div class="user-message">检查这笔合作的数据溯源材料，整理证据，并告诉我还有哪些事情需要确认。</div><div class="agent-message"><span class="agent-avatar" aria-hidden="true">⌘</span><div><strong>Codex</strong><p id="agent-copy"></p></div></div><div id="tool-feed" class="tool-feed"></div><div id="agent-result" class="agent-result" hidden></div></div>
            <div class="prompt-preview"><span>按下方步骤，查看任务如何完成</span><span aria-hidden="true">↑</span></div>
          </section>
          <section class="board-pane" aria-label="同步更新的交易室"><div class="browser-bar"><span aria-hidden="true">▧</span><span>citely / deal-room / northstar</span><span class="local-label">演示工作台</span></div><div class="board-content"><div class="board-heading"><div class="eyebrow">DEAL ROOM</div><span class="board-tag">供应商准入</span></div><h3>Northstar Capture Labs</h3><p class="board-description">前沿模型实验室 · 数据供应试点</p><div class="board-metrics"><div><span>审核关卡</span><strong>03<small>道</small></strong></div><div><span>待解决事项</span><strong id="blocker-count">07</strong></div><div><span>材料确认</span><strong id="material-count">00<small>/ 12</small></strong></div></div><div class="list-heading"><h4>关键材料</h4><span>当前演示关注项</span></div><div class="material-row"><span class="file-icon" aria-hidden="true">≡</span><div><strong>数据溯源记录</strong><span>采集时间、场地、设备与操作员</span></div><span class="status" id="lineage-status">待提供</span></div><div id="evidence-card" class="evidence-card" hidden><div><span class="green-dot"></span><strong>Codex 已添加证据</strong><span>待人工核验</span></div><p>采集流程记录了时间、场地、设备和操作员字段。建议核验样本导出后确认材料。</p><code>pipeline/lineage.py</code></div><div class="material-row"><span class="file-icon" aria-hidden="true">≡</span><div><strong>安全问卷 / SOC 2 报告</strong><span>需与合作方协商替代审核路径</span></div><span class="status missing">不存在</span></div><div class="material-row"><span class="file-icon" aria-hidden="true">≡</span><div><strong>操作员协议</strong><span>知识产权条款仍待核验</span></div><span class="status">待提供</span></div><div class="human-note" id="human-note"><span aria-hidden="true">◈</span><p><strong>AI 整理证据，你来确认事实。</strong><br>添加证据不会自动把材料标记为「已提供」。</p></div><button class="confirm-button" id="confirm" hidden>模拟人工确认：材料已提供 <span aria-hidden="true">✓</span></button></div></section>
        </div>
        <div class="demo-controls"><div class="playback"><button id="play" class="play-button" aria-label="自动播放演示">▶</button><span id="step-label" aria-live="polite"></span></div><div class="step-dots" aria-label="演示步骤"><span></span><span></span><span></span><span></span><span></span></div><div class="control-actions"><button id="reset" aria-label="从头重播">↺ <span>重置</span></button><button id="next">下一步 <span aria-hidden="true">→</span></button></div></div>
      </div><p class="demo-caption">Codex 对话与调用过程为预设模拟；工作台复用本项目的工具逻辑。本页不连接真实 Codex，也不读取你的文件。</p>
    </section>
    <section class="approach wrap" id="approach"><div class="approach-intro"><span class="eyebrow">FROM CONVERSATION TO ACTION</span><h2>从一句话，<br>到有据可查的下一步。</h2><p>WebMCP 让网页向 AI 提供结构化工具。<br>在这个案例中，我们把它接入了交易准备流程。</p><a class="text-link" href="https://developer.chrome.com/docs/ai/agents" target="_blank" rel="noopener noreferrer">了解 WebMCP <span aria-hidden="true">↗</span></a></div><div class="principles"><article><span>01</span><div><h3>看见业务上下文</h3><p>读取同一份交易室：材料、事实与阻塞项。让 AI 的下一步建立在当前状态之上。</p></div></article><article><span>02</span><div><h3>让每条建议带上证据</h3><p>通过明确的工具，把发现和来源写回材料卡片。你可以看见发生了什么，以及为什么。</p></div></article><article><span>03</span><div><h3>把确认权留给人</h3><p>AI 只能取证和提议。材料确认、事实签署和简报冻结，仍由人完成。</p></div></article></div></section>
    <section class="closing wrap"><div><span class="eyebrow">EXPLORE THE CASE</span><h2>让你的业务系统，<br>成为 AI 能协作的工作台。</h2></div><div><a class="primary" href="/">探索完整 Deal Room <span aria-hidden="true">↗</span></a><p>查看实际工作台与 WebMCP 工具接入</p></div></section>
  </main><footer class="wrap"><a class="wordmark" href="#" aria-label="Citely 案例首页"><img src="/brand/citely-mark.png" alt="" width="22" height="22" />Citely</a><p>WebMCP 案例展示 · 合成数据，不构成法律意见</p><form action="/invite/logout" method="post" class="invite-logout"><button type="submit">退出访问</button></form></footer>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type Language = 'zh' | 'en';
const translations: Record<string, string> = {
  '页面导航': 'Page navigation', '交互演示': 'Interactive demo', '如何实现': 'How it works', '语言': 'Language',
  '打开 Deal Room': 'Open Deal Room', 'WEBMCP 案例': 'WEBMCP CASE', '让 AI 走进': 'Bring AI into', '你的': 'your ', '业务现场': 'business workflow',
  '一句指令，连接对话与行动。': 'One instruction connects conversation to action.', '看看 Codex 如何通过 WebMCP 整理交易材料，': 'See how Codex uses WebMCP to organize deal materials,',
  '把证据带回工作台，把决定留给你。': 'bringing evidence into the workspace while leaving decisions to you.', '体验完整流程': 'Experience the workflow',
  '你的业务系统': 'Your business system', '以 Citely Deal Room 为例': 'Using Citely Deal Room as an example,', '为 AI 开放明确、可控的网页操作。': 'we expose clear, controlled web actions to AI.',
  '业务协作': 'Business collaboration', '人在回路': 'Human in the loop', '一边对话，一边推进。': 'Move work forward as you talk.',
  '交互模拟 · 虚构案例数据': 'Interactive simulation · Synthetic case data', 'Codex 工作流': 'Codex workflow', '模拟 Codex 对话': 'Simulated Codex conversation', '模拟对话': 'Simulated conversation',
  '检查这笔合作的数据溯源材料，整理证据，并告诉我还有哪些事情需要确认。': 'Review the data-lineage materials for this deal, organize the evidence, and tell me what still needs confirmation.',
  '按下方步骤，查看任务如何完成': 'Follow the steps below to see the task completed', '同步更新的交易室': 'Deal Room updating in sync', '演示工作台': 'Demo workspace', '供应商准入': 'Vendor onboarding',
  '前沿模型实验室 · 数据供应试点': 'Frontier model lab · Data supply pilot', '审核关卡': 'Review gates', '道': 'gates', '待解决事项': 'Open blockers', '材料确认': 'Materials confirmed',
  '关键材料': 'Key materials', '当前演示关注项': 'Items in this demo', '数据溯源记录': 'Data lineage records', '采集时间、场地、设备与操作员': 'Capture time, site, device, and operator',
  '安全问卷 / SOC 2 报告': 'Security questionnaire / SOC 2 report', '需与合作方协商替代审核路径': 'Alternative review path must be negotiated', '不存在': 'Not available',
  '操作员协议': 'Operator agreements', '知识产权条款仍待核验': 'IP assignment terms need review', 'Codex 已添加证据': 'Evidence added by Codex', '待人工核验': 'Human review required',
  '待提供': 'Pending', '。': '.',
  '采集流程记录了时间、场地、设备和操作员字段。建议核验样本导出后确认材料。': 'The capture pipeline records time, site, device, and operator fields. Verify a sample export before confirming the material.',
  'AI 整理证据，你来确认事实。': 'AI organizes evidence. You confirm the facts.', '添加证据不会自动把材料标记为「已提供」。': 'Adding evidence never marks a material as “provided” automatically.',
  '模拟人工确认：材料已提供': 'Simulate human confirmation: material provided', '演示步骤': 'Demo steps', '重置': 'Reset', '下一步': 'Next',
  'Codex 对话与调用过程为预设模拟；工作台复用本项目的工具逻辑。本页不连接真实 Codex，也不读取你的文件。': 'The Codex conversation and calls are a scripted simulation. The workspace reuses this project’s real tool logic. This page does not connect to Codex or read your files.',
  '从一句话，': 'From one instruction', '到有据可查的下一步。': 'to an evidence-backed next step.', 'WebMCP 让网页向 AI 提供结构化工具。': 'WebMCP lets a website offer structured tools to AI.', '在这个案例中，我们把它接入了交易准备流程。': 'In this case, we connect those tools to deal preparation.',
  '了解 WebMCP': 'Learn about WebMCP', '看见业务上下文': 'See the business context', '读取同一份交易室：材料、事实与阻塞项。让 AI 的下一步建立在当前状态之上。': 'Read the same Deal Room—materials, facts, and blockers—so every AI action starts from the current state.',
  '让每条建议带上证据': 'Attach evidence to every proposal', '通过明确的工具，把发现和来源写回材料卡片。你可以看见发生了什么，以及为什么。': 'Write findings and sources back to material cards through explicit tools, so you can see what happened and why.',
  '把确认权留给人': 'Keep confirmation human', 'AI 只能取证和提议。材料确认、事实签署和简报冻结，仍由人完成。': 'AI can gather evidence and propose. People still confirm materials, sign facts, and freeze briefs.',
  '让你的业务系统，': 'Turn your business system', '成为 AI 能协作的工作台。': 'into a workspace for AI collaboration.', '探索完整 Deal Room': 'Explore the full Deal Room', '查看实际工作台与 WebMCP 工具接入': 'See the working interface and WebMCP integration',
  'WebMCP 案例展示 · 合成数据，不构成法律意见': 'WebMCP case study · Synthetic data · Not legal advice', '退出访问': 'Sign out', 'Citely 案例首页': 'Citely case study home',
};
const dynamic = {
  zh: {
    labels: ['提出任务', '读取交易室', '添加材料证据', '查看待解决事项', '由你确认'],
    messages: ['我会先查看交易室，再整理溯源材料的证据。材料是否已提供，需要由你确认。', '已读取交易室：共 12 项材料、3 道审核关卡。数据溯源记录仍待提供，我会把相关发现附在材料卡片上。', '已将溯源字段及来源附到材料卡片。材料仍然是「待提供」，请核对实际记录和样本导出。', '当前仍有 7 个待解决事项。数据溯源这一项需要你确认材料；安全报告缺失等其他事项还需分别处理。', '请在右侧模拟确认数据溯源材料。确认完成后，工作台会重新计算待解决事项。'],
    confirmed: '你已完成模拟确认。数据溯源阻塞项已解除，其余 6 项仍待处理。', status: ['待提供', '待确认', '已提供'], result: '✓ 证据有来源，确认有归属，业务状态同步更新。',
    tools: ['读取当前业务状态', '为溯源材料添加证据', '重新检查待解决事项'], evidence: '模拟证据：采集流程记录时间、场地、设备与操作员字段；请人工核验样本导出。', failed: '演示暂时未能继续，请点击重置重新开始。', play: '自动播放演示', pause: '暂停演示', replay: '从头重播',
  },
  en: {
    labels: ['Give the task', 'Read the Deal Room', 'Attach evidence', 'Check blockers', 'You confirm'],
    messages: ['I’ll read the Deal Room first, then organize the lineage evidence. You decide whether the material is provided.', 'I found 12 materials across three review gates. The data-lineage records are still pending, so I’ll attach the relevant findings to that material.', 'I attached the lineage fields and their source. The material remains “pending”; please verify the records and a sample export.', 'Seven blockers remain. You need to confirm the lineage material; the missing security report and other items require separate action.', 'Confirm the data-lineage material in the workspace. The Deal Room will recalculate blockers after your confirmation.'],
    confirmed: 'Simulation confirmed. The lineage blocker is resolved; six other blockers remain.', status: ['Pending', 'Needs confirmation', 'Provided'], result: '✓ Evidence has a source, confirmation has an owner, and the business state stays in sync.',
    tools: ['Read current business state', 'Attach evidence to lineage material', 'Recheck open blockers'], evidence: 'Simulated evidence: the capture pipeline records time, site, device, and operator fields. A human should verify a sample export.', failed: 'The simulation could not continue. Reset and try again.', play: 'Play demo', pause: 'Pause demo', replay: 'Replay from the beginning',
  },
} as const;
const originalText = new Map<Text, string>();
const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) originalText.set(walker.currentNode as Text, walker.currentNode.textContent ?? '');
let language: Language = new URLSearchParams(location.search).get('lang') === 'en' || (!new URLSearchParams(location.search).has('lang') && localStorage.getItem('citely_case_language') === 'en') ? 'en' : 'zh';
const strings = () => dynamic[language];
let store: Store;
let step = 0;
let playing = false;
let busy = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let epoch = 0;
let confirmed = false;

function pause() {
  playing = false;
  clearTimeout(timer);
  el('play').textContent = '▶';
  el('play').setAttribute('aria-label', strings().play);
}

function applyLanguage(next: Language, persist = true) {
  language = next;
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.title = language === 'en' ? 'Bring AI into your business workflow · Citely × WebMCP' : '让 AI 走进业务现场 · Citely × WebMCP';
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', language === 'en' ? 'Citely WebMCP case study: experience how AI reads a Deal Room, organizes evidence, and leaves confirmation to people.' : 'Citely WebMCP 案例：通过可交互的 Codex 模拟演示，体验 AI 如何读取交易室、整理证据并将确认权交给客户。');
  for (const [node, original] of originalText) {
    const value = original.trim();
    node.textContent = language === 'en' && translations[value] ? original.replace(value, translations[value]!) : original;
  }
  root.querySelector('nav')?.setAttribute('aria-label', language === 'en' ? 'Page navigation' : '页面导航');
  root.querySelector('.lang-toggle')?.setAttribute('aria-label', language === 'en' ? 'Language' : '语言');
  root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
  root.querySelectorAll<HTMLAnchorElement>('.wordmark').forEach(link => link.setAttribute('aria-label', language === 'en' ? 'Citely case study home' : 'Citely 案例首页'));
  el('play').setAttribute('aria-label', strings().play);
  el('reset').setAttribute('aria-label', strings().replay);
  document.querySelector('.step-dots')?.setAttribute('aria-label', language === 'en' ? 'Demo steps' : '演示步骤');
  document.querySelector('.agent-pane')?.setAttribute('aria-label', language === 'en' ? 'Simulated Codex conversation' : '模拟 Codex 对话');
  document.querySelector('.board-pane')?.setAttribute('aria-label', language === 'en' ? 'Deal Room updating in sync' : '同步更新的交易室');
  document.querySelector<HTMLFormElement>('.invite-logout')!.action = `/invite/logout?lang=${language}`;
  if (persist) localStorage.setItem('citely_case_language', language);
}

function render() {
  const copy = strings();
  el('step-label').textContent = `${String(step + 1).padStart(2, '0')} / 05　${copy.labels[step]}`;
  document.querySelectorAll('.step-dots span').forEach((dot, i) => dot.classList.toggle('active', i <= step));
  el('agent-copy').textContent = step === 4 && confirmed ? copy.confirmed : copy.messages[step]!;
  el('evidence-card').hidden = step < 2;
  el('lineage-status').textContent = confirmed ? copy.status[2] : step >= 2 ? copy.status[1] : copy.status[0];
  el('lineage-status').classList.toggle('provided', confirmed);
  el('blocker-count').textContent = String(store.blockers().filter(b => b.open).length).padStart(2, '0');
  el('material-count').innerHTML = `${confirmed ? '01' : '00'}<small>/ 12</small>`;
  el('confirm').hidden = step !== 4 || confirmed;
  el('human-note').hidden = step === 4 && !confirmed;
  el<HTMLButtonElement>('next').disabled = busy || step === 4;
  el<HTMLButtonElement>('play').disabled = step === 4;
  el('agent-result').hidden = !confirmed;
  el('agent-result').textContent = copy.result;
}

function addTool(name: string, summary: string, response: unknown) {
  const details = document.createElement('details');
  details.className = 'tool-call';
  const heading = document.createElement('summary');
  const check = document.createElement('span');
  check.className = 'tool-check';
  check.textContent = '✓';
  const title = document.createElement('span');
  title.textContent = summary;
  const arrow = document.createElement('span');
  arrow.textContent = '⌄';
  heading.append(check, title, arrow);
  const code = document.createElement('code');
  code.textContent = name;
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(response, null, 2);
  details.append(heading, code, pre);
  el('tool-feed').append(details);
}

async function advance() {
  if (busy || step >= 4) return;
  busy = true;
  const generation = epoch;
  const next = step + 1;
  render();
  const tools = createTools(store);
  let failed = false;
  try {
    if (next <= 3) {
      const names = ['dealroom_get_room', 'dealroom_propose_material', 'dealroom_get_blockers'];
      const tool = tools.find(t => t.name === names[next - 1])!;
      const input = next === 2 ? { material_id: 'm1', state: 'pending', evidence: { summary: strings().evidence, source_kind: 'code', location: 'pipeline/lineage.py' } } : {};
      const response = await tool.execute(input);
      if (generation !== epoch) return;
      if (!response.ok) throw new Error('工具执行未完成，请重置后再试。');
      addTool(tool.name, strings().tools[next - 1]!, response);
    }
    step = next;
    if (step === 4) pause();
  } catch {
    pause();
    failed = true;
  } finally {
    if (generation === epoch) {
      busy = false;
      render();
      if (failed) el('agent-copy').textContent = strings().failed;
    }
  }
}

function schedule() {
  timer = setTimeout(async () => {
    await advance();
    if (playing && step < 4) schedule();
  }, 2400);
}

function reset() {
  epoch++;
  pause();
  busy = false;
  step = 0;
  confirmed = false;
  store = new Store(schema as RoomSchema, loadCase(caseFile as CaseFile));
  el('tool-feed').replaceChildren();
  render();
}
el('next').addEventListener('click', () => { pause(); void advance(); });
el('reset').addEventListener('click', reset);
el('play').addEventListener('click', () => {
  if (playing) { pause(); return; }
  playing = true;
  el('play').textContent = 'Ⅱ';
  el('play').setAttribute('aria-label', strings().pause);
  void advance().then(() => { if (playing) schedule(); });
});
el('confirm').addEventListener('click', () => {
  if (step !== 4 || confirmed) return;
  store.update(s => setMaterialState(s, 'm1', 'provided', { confirmation: { by: language === 'en' ? 'Case visitor (simulated)' : '案例访客（模拟确认）', at: new Date().toISOString(), basis: language === 'en' ? 'Simulated verification of lineage records and sample export' : '模拟核验溯源记录与样本导出' } }));
  confirmed = true;
  render();
  el('reset').focus();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(button => button.addEventListener('click', () => {
  const next = button.dataset.lang as Language;
  if (next === language) return;
  pause();
  applyLanguage(next);
  reset();
}));
applyLanguage(language, false);
reset();
