/* ============================================================
   МОДУЛЬ 1: ПОЯВА БЛОКІВ ПРИ СКРОЛІ (IntersectionObserver)
   Спостерігаємо за кожним елементом з класом .reveal;
   коли він на ~15% з'являється у в'юпорті — додаємо .is-visible,
   що запускає CSS-перехід (opacity + translateY).
============================================================ */
(function initScrollReveal(){
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // анімуємо лише один раз
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => observer.observe(el));
})();

/* ============================================================
   МОДУЛЬ 2: АНІМАЦІЯ ЧИСЕЛ ТА ШКАЛ У СТАТИСТИЦІ
   Коли картка/рядок стає видимим — "прокручуємо" число від 0
   до цільового значення і заповнюємо смужку прогресу.
============================================================ */
(function initCounters(){
  // допоміжна функція плавної анімації числа
  function animateValue(el, target, duration){
    const start = 0;
    const isFloat = target % 1 !== 0;
    const startTime = performance.now();

    function step(now){
      const progress = Math.min((now - startTime) / duration, 1);
      // easing "ease-out" для приємнішого фінішу
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const numberBlocks = document.querySelectorAll('.stat-card .num[data-count]');
  const bars = document.querySelectorAll('.bar-fill, .track-fill');

  // окремий спостерігач: коли секція статистики з'являється,
  // запускаємо анімацію чисел і шкал одночасно
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      numberBlocks.forEach(block => {
        const valueEl = block.querySelector('.value');
        const target = parseFloat(block.dataset.count);
        animateValue(valueEl, target, 1200);
      });

      bars.forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });

      statsObserver.disconnect();
    });
  }, { threshold: 0.2 });

  const statsSection = document.getElementById('stats');
  const reliabilitySection = document.getElementById('reliability');
  if (statsSection) statsObserver.observe(statsSection);
  if (reliabilitySection) statsObserver.observe(reliabilitySection);
})();

/* ============================================================
   МОДУЛЬ 3: HERO-СПІДОМЕТР
   Заповнюємо коло SVG та прокручуємо число до 52 км/год,
   щойно сторінка завантажилась.
============================================================ */
(function initHeroGauge(){
  const fill = document.getElementById('gaugeFill');
  const numEl = document.getElementById('gaugeNum');
  const circumference = 2 * Math.PI * 110; // довжина кола радіусом 110
  const targetSpeed = 52;
  const targetOffset = circumference - (circumference * (targetSpeed / 100));

  window.addEventListener('load', () => {
    // невелика затримка, щоб transition встиг "підхопитись"
    setTimeout(() => {
      fill.style.strokeDashoffset = targetOffset;
    }, 300);

    const start = performance.now();
    function step(now){
      const progress = Math.min((now - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      numEl.textContent = Math.round(targetSpeed * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
})();

/* ============================================================
   МОДУЛЬ 4: 2D ГРА "УНИКАЙ ТРАФІКУ"
   Проста аркадна гра на <canvas>:
   - гравець керує машиною, що рухається по 3 смугах;
   - зустрічні авто з'являються згори і рухаються вниз;
   - зіткнення завершує гру, очки нараховуються за час виживання.
============================================================ */
(function initGame(){
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreVal = document.getElementById('scoreVal');
  const hint = document.getElementById('gameHint');
  const restartBtn = document.getElementById('restartBtn');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  const LANES = 3;                       // кількість смуг руху
  const laneWidth = canvas.width / LANES;
  const carW = 40, carH = 66;            // розміри машинки гравця
  const obstacleW = 40, obstacleH = 66;

  // стан гри зберігаємо в одному об'єкті, щоб легко скидати рестартом
  let state;

  function resetState(){
    state = {
      lane: 1,                 // поточна смуга гравця (0,1,2)
      obstacles: [],           // масив перешкод {lane, y}
      speed: 2.4,               // швидкість руху перешкод (px/frame)
      spawnTimer: 0,
      spawnEvery: 70,           // кожні N кадрів — нова перешкода
      score: 0,
      frame: 0,
      running: false,
      gameOver: false
    };
  }
  resetState();

  function laneCenterX(lane){
    return lane * laneWidth + laneWidth / 2;
  }

  // -------- малювання одного кадру --------
  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // розмітка смуг (пунктирні лінії між ними)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    for (let i = 1; i < LANES; i++){
      const x = i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // перешкоди (зустрічні авто) — червоні прямокутники зі скругленням
    ctx.fillStyle = '#e8543e';
    state.obstacles.forEach(ob => {
      drawCar(laneCenterX(ob.lane), ob.y, obstacleW, obstacleH, '#e8543e');
    });

    // машина гравця — жовта, завжди внизу екрана
    drawCar(laneCenterX(state.lane), canvas.height - 70, carW, carH, '#f2c43d');
  }

  // проста "машинка" у вигляді прямокутника зі скругленими кутами + вікна
  function drawCar(cx, cy, w, h, color){
    const x = cx - w / 2;
    const y = cy - h / 2;
    const r = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();

    // "лобове скло" для візуального орієнтиру напрямку руху
    ctx.fillStyle = 'rgba(20,22,26,0.55)';
    ctx.fillRect(x + 6, y + 10, w - 12, 14);
  }

  // -------- ігровий цикл --------
  function update(){
    if (!state.running) return;

    state.frame++;

    // спавн нових перешкод через рівні проміжки часу
    state.spawnTimer++;
    if (state.spawnTimer >= state.spawnEvery){
      state.spawnTimer = 0;
      const lane = Math.floor(Math.random() * LANES);
      state.obstacles.push({ lane, y: -obstacleH });
    }

    // рух перешкод вниз + перевірка зіткнень
    state.obstacles.forEach(ob => { ob.y += state.speed; });

    const playerY = canvas.height - 70;
    state.obstacles.forEach(ob => {
      const sameLane = ob.lane === state.lane;
      const overlapY = Math.abs(ob.y - playerY) < (obstacleH + carH) / 2 - 14;
      if (sameLane && overlapY){
        endGame();
      }
    });

    // прибираємо перешкоди, що вийшли за межі екрана, і додаємо очки
    const before = state.obstacles.length;
    state.obstacles = state.obstacles.filter(ob => ob.y < canvas.height + obstacleH);
    const passed = before - state.obstacles.length;
    if (passed > 0){
      state.score += passed * 10;
    }

    // плавне зростання складності
    if (state.frame % 300 === 0){
      state.speed += 0.4;
      state.spawnEvery = Math.max(35, state.spawnEvery - 4);
    }

    // очки також повільно ростуть з часом виживання
    if (state.frame % 10 === 0) state.score += 1;
    scoreVal.textContent = state.score;
  }

  function loop(){
    update();
    draw();
    if (state.running) requestAnimationFrame(loop);
  }

  function startGame(){
    resetState();
    state.running = true;
    hint.textContent = 'Керуй стрілками ← →';
    scoreVal.textContent = '0';
    requestAnimationFrame(loop);
  }

  function endGame(){
    state.running = false;
    state.gameOver = true;
    hint.textContent = 'Зіткнення! Очки: ' + state.score + ' — натисни «Рестарт»';
  }

  function moveLeft(){
    if (!state.running) return;
    state.lane = Math.max(0, state.lane - 1);
  }
  function moveRight(){
    if (!state.running) return;
    state.lane = Math.min(LANES - 1, state.lane + 1);
  }

  // -------- керування --------
  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft','a','A'].includes(e.key)) moveLeft();
    if (['ArrowRight','d','D'].includes(e.key)) moveRight();
  });

  canvas.addEventListener('click', () => {
    if (!state.running) startGame();
  });

  btnLeft.addEventListener('click', moveLeft);
  btnRight.addEventListener('click', moveRight);
  restartBtn.addEventListener('click', startGame);

  // початковий кадр (порожня траса) до першого запуску
  draw();
})();