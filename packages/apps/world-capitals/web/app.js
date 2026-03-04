(function () {
  'use strict';

  /* ═══════════════════════════════════════════
     DATA — 20 pays / capitales
     ═══════════════════════════════════════════ */
  var DATA = [
    ['France', 'Paris'],
    ['Allemagne', 'Berlin'],
    ['Espagne', 'Madrid'],
    ['Italie', 'Rome'],
    ['Portugal', 'Lisbonne'],
    ['Royaume-Uni', 'Londres'],
    ['Japon', 'Tokyo'],
    ['Chine', 'Pékin'],
    ['Brésil', 'Brasília'],
    ['Canada', 'Ottawa'],
    ['Australie', 'Canberra'],
    ['Inde', 'New Delhi'],
    ['Russie', 'Moscou'],
    ['Mexique', 'Mexico'],
    ['Argentine', 'Buenos Aires'],
    ['Égypte', 'Le Caire'],
    ['Maroc', 'Rabat'],
    ['Turquie', 'Ankara'],
    ['Corée du Sud', 'Séoul'],
    ['Thaïlande', 'Bangkok']
  ];

  var NB_QUESTIONS = 10;

  /* ═══════════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════════ */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════ */
  var State = {
    questions: [],   // [[country, capital], …]
    idx: 0,
    score: 0,
    input: '',
    feedback: '',    // '' | '✅ …' | '❌ …'
    feedbackOk: false,
    done: false,
    locked: false    // while feedback is shown
  };

  /* ═══════════════════════════════════════════
     RENDERING
     ═══════════════════════════════════════════ */
  function render() {
    var root = document.getElementById('app');
    if (!root) return;

    if (State.done) {
      root.innerHTML =
        '<div class="wc-header"><h1>🌍 Capitales du Monde</h1></div>' +
        '<div class="wc-card wc-center">' +
          '<h2>Score final : ' + State.score + ' / ' + State.questions.length + '</h2>' +
          '<p class="wc-sub">' + getScoreMessage(State.score, State.questions.length) + '</p>' +
          '<button class="wc-btn" id="btn-replay">Rejouer</button>' +
        '</div>';
      document.getElementById('btn-replay').addEventListener('click', restart);
      return;
    }

    var q = State.questions[State.idx];
    var country = escHtml(q[0]);
    var num = State.idx + 1;
    var total = State.questions.length;

    var feedbackHtml = '';
    if (State.feedback) {
      feedbackHtml = '<p class="wc-feedback ' + (State.feedbackOk ? 'wc-ok' : 'wc-wrong') + '">' + escHtml(State.feedback) + '</p>';
    }

    root.innerHTML =
      '<div class="wc-header">' +
        '<h1>🌍 Capitales du Monde</h1>' +
        '<span class="wc-badge">' + State.score + ' pts</span>' +
      '</div>' +
      '<div class="wc-progress"><div class="wc-progress-bar" style="width:' + Math.round((num / total) * 100) + '%"></div></div>' +
      '<div class="wc-card wc-center">' +
        '<p class="wc-sub">Question ' + num + ' / ' + total + '</p>' +
        '<h2 class="wc-question">Quelle est la capitale de <strong>' + country + '</strong> ?</h2>' +
        '<div class="wc-form">' +
          '<input id="wc-input" class="wc-input" type="text" placeholder="Votre réponse…" autocomplete="off" ' + (State.locked ? 'disabled' : '') + ' />' +
          '<button class="wc-btn" id="btn-validate" ' + (State.locked ? 'disabled' : '') + '>Valider</button>' +
        '</div>' +
        feedbackHtml +
      '</div>';

    var inp = document.getElementById('wc-input');
    if (inp) {
      inp.value = State.input;
      inp.addEventListener('input', function (e) { State.input = e.target.value; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !State.locked) check(); });
      if (!State.locked) inp.focus();
    }
    var btn = document.getElementById('btn-validate');
    if (btn) btn.addEventListener('click', function () { if (!State.locked) check(); });
  }

  function getScoreMessage(score, total) {
    var pct = score / total;
    if (pct === 1) return 'Parfait ! Vous êtes un expert en géographie ! 🎉';
    if (pct >= 0.8) return 'Excellent ! Très bonne connaissance des capitales ! 🌟';
    if (pct >= 0.6) return 'Bien joué ! Continuez à apprendre ! 👍';
    if (pct >= 0.4) return 'Pas mal, mais il reste des progrès à faire ! 📚';
    return 'Continuez à réviser vos capitales ! 💪';
  }

  /* ═══════════════════════════════════════════
     GAME LOGIC
     ═══════════════════════════════════════════ */
  function check() {
    if (State.locked || State.done) return;
    State.locked = true;

    var userAnswer = State.input.trim().toLowerCase();
    var correct = State.questions[State.idx][1].toLowerCase();

    if (userAnswer === correct) {
      State.score++;
      State.feedback = '✅ Correct !';
      State.feedbackOk = true;
    } else {
      State.feedback = '❌ C\'était ' + State.questions[State.idx][1];
      State.feedbackOk = false;
    }
    render();

    setTimeout(function () {
      State.feedback = '';
      State.input = '';
      State.locked = false;
      if (State.idx + 1 < State.questions.length) {
        State.idx++;
      } else {
        State.done = true;
      }
      render();
    }, 1500);
  }

  function restart() {
    State.questions = shuffle(DATA).slice(0, NB_QUESTIONS);
    State.idx = 0;
    State.score = 0;
    State.input = '';
    State.feedback = '';
    State.feedbackOk = false;
    State.done = false;
    State.locked = false;
    render();
  }

  /* ═══════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    restart();
  });
})();
