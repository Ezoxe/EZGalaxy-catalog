#!/usr/bin/env node
/**
 * Builds the two content artefacts from content/source:
 *   - web/data.js               lessons, scenes and badges for the browser, WITHOUT graded answers
 *   - backend/content/bank.json quiz questions and scene answers, read only by the server
 *
 * Usage: node tools/build-content.mjs [--check]
 *   --check  validate only, write nothing (exit code 1 on error)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content', 'source');
const CHECK_ONLY = process.argv.includes('--check');
const LEVELS = ['college', 'lycee', 'but'];
const MIN_QUIZ = 8;

const load = async (file) => (await import(pathToFileURL(file).href));
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const meta = await load(path.join(SRC, 'meta.mjs'));
const modules = [];
for (const id of meta.MODULE_ORDER) {
  const mod = structuredClone((await load(path.join(SRC, 'modules', `${id}.mjs`))).default);
  const scenesFile = path.join(SRC, 'scenes', `${id}.mjs`);
  const scenes = fs.existsSync(scenesFile) ? (await load(scenesFile)).default : [];
  // Insert scenes into their lesson, last ones first so `at` indexes stay valid.
  [...scenes].sort((a, b) => (b.at ?? 1) - (a.at ?? 1)).forEach((scene) => {
    const { lesson, at = 1, ...block } = scene;
    const target = mod.lessons[lesson];
    if (!target) { fail(`${id}/scene ${scene.id}`, `leçon ${lesson} inexistante`); return; }
    target.content.splice(Math.min(at, target.content.length), 0, { type: 'scene', ...block });
  });
  modules.push(mod);
}

/* ───────── Validation ───────── */
const sceneIds = new Set();
const badgeIds = new Set(meta.BADGES.map((b) => b.id));
for (const mod of modules) {
  if (!mod.quiz || mod.quiz.length < MIN_QUIZ) fail(mod.id, `quiz de ${mod.quiz ? mod.quiz.length : 0} questions (minimum ${MIN_QUIZ})`);
  (mod.quiz || []).forEach((q, i) => {
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) fail(`${mod.id}/quiz ${i}`, 'index de bonne réponse invalide');
    if (!q.explanation) fail(`${mod.id}/quiz ${i}`, 'explication manquante');
  });
  const badge = meta.MODULE_BADGES[mod.id];
  if (!badge || !badgeIds.has(badge)) fail(mod.id, 'badge de module manquant');
  mod.lessons.forEach((lesson, li) => {
    const where = `${mod.id}/leçon ${li}`;
    const scenes = lesson.content.filter((b) => b.type === 'scene');
    if (!scenes.length) fail(where, 'aucune scène animée');
    if (lesson.content.some((b) => b.type === 'diagram')) fail(where, 'bloc "diagram" ASCII interdit, utiliser une scène');
    scenes.forEach((s) => {
      const sw = `${where}/${s.id}`;
      if (!s.id || sceneIds.has(s.id)) fail(sw, 'id de scène absent ou en double');
      sceneIds.add(s.id);
      const nodeIds = new Set((s.nodes || []).map((n) => n.id));
      (s.links || []).forEach((l) => { if (!nodeIds.has(l.from) || !nodeIds.has(l.to)) fail(sw, `lien vers un nœud inconnu (${l.from} → ${l.to})`); });
      if (!s.steps || s.steps.length < 2) fail(sw, 'au moins 2 étapes');
      (s.steps || []).forEach((st, si) => {
        LEVELS.forEach((lv) => { if (!st.text || !st.text[lv]) fail(`${sw}/étape ${si}`, `texte "${lv}" manquant`); });
        (st.actions || []).forEach((a) => {
          const refs = [].concat(a.node || [], a.nodes || [], a.path || [], a.from || [], a.to && typeof a.to === 'string' ? a.to : [], a.a || [], a.b || []);
          refs.forEach((r) => { if (!nodeIds.has(r)) fail(`${sw}/étape ${si}`, `action "${a.do}" vers un nœud inconnu "${r}"`); });
        });
      });
      if (s.quiz) {
        const q = s.quiz;
        if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) fail(sw, 'mini-défi : bonne réponse invalide');
        if (!q.explanation) fail(sw, 'mini-défi : explication manquante');
      }
    });
  });
}

if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) de contenu :\n  - ` + errors.join('\n  - '));
  process.exit(1);
}

/* ───────── Outputs ───────── */
const bank = {
  modules: modules.map((m) => ({
    id: m.id, title: m.title, icon: m.icon, tier: m.tier, required: m.requiredModules || [],
    lessons: m.lessons.length,
    quiz: m.quiz.map((q, i) => ({ id: `${m.id}:q${i}`, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation })),
  })),
  scenes: {},
  badges: meta.BADGES.map((b) => b.id),
  moduleBadges: meta.MODULE_BADGES,
};

const publicModules = modules.map((m) => ({
  ...m,
  quiz: undefined,
  quizCount: m.quiz.length,
  lessons: m.lessons.map((lesson, li) => ({
    ...lesson,
    content: lesson.content.map((block) => {
      if (block.type !== 'scene' || !block.quiz) return block;
      bank.scenes[block.id] = { module: m.id, lesson: li, correct: block.quiz.correct, explanation: block.quiz.explanation };
      const { correct, explanation, ...quiz } = block.quiz;
      return { ...block, quiz };
    }),
  })),
}));

const data = {
  LEVELS: meta.LEVELS,
  BADGES: meta.BADGES,
  MODULE_BADGES: meta.MODULE_BADGES,
  TIERS: meta.TIERS,
  MODULES: publicModules,
};

const stats = `${modules.length} modules, ${modules.reduce((s, m) => s + m.lessons.length, 0)} leçons, ${sceneIds.size} scènes, ${bank.modules.reduce((s, m) => s + m.quiz.length, 0)} questions`;
if (CHECK_ONLY) {
  console.log(`✓ Contenu valide : ${stats}`);
  process.exit(0);
}
const header = '/* Généré par tools/build-content.mjs depuis content/source — ne pas modifier à la main. */\n';
fs.writeFileSync(path.join(ROOT, 'web', 'data.js'), `${header}window.ITData = ${JSON.stringify(data)};\n`);
fs.mkdirSync(path.join(ROOT, 'backend', 'content'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'backend', 'content', 'bank.json'), JSON.stringify(bank, null, 1));
console.log(`✓ web/data.js et backend/content/bank.json générés : ${stats}`);
