const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthBar = document.getElementById('health-bar');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const uiLayer = document.getElementById('ui-layer');

// Caricamento Immagini con gestione errori
let playerReady = false;
let enemyReady = false;
let cloudReady = false;

const playerImg = new Image();
playerImg.onload = () => playerReady = true;
playerImg.src = 'aereo giocatore.png';

const enemyImg = new Image();
enemyImg.onload = () => enemyReady = true;
enemyImg.src = 'aereo nemico.png';

const cloudImg = new Image();
cloudImg.onload = () => cloudReady = true;
cloudImg.src = 'nuvole.png';

let missileReady = false;
const missileImg = new Image();
missileImg.onload = () => missileReady = true;
missileImg.src = 'missile.png';

let seaReady = false;
const seaImg = new Image();
seaImg.onload = () => seaReady = true;
seaImg.src = 'mare.png';

let explosionReady = false;
const explosionImg = new Image();
explosionImg.onload = () => explosionReady = true;
explosionImg.src = 'esplosione.png';

// Logica di Gioco
let gameState = 'START';
let score = 0;
let player = { x: 100, y: 300, w: 160, h: 50, speed: 2, health: 100, lastFire: 0, rotation: 0 };
let enemies = [];
let bullets = [];
let enemyBullets = [];
let clouds = [];
let keys = {};
let touchData = { active: false, dx: 0, dy: 0 };
let seaOffsetX = 0;
let seaOffsetY = 0;

// Variabili per animazione esplosione
let explosion = null; // { x, y, startTime }

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameState === 'START') player.y = canvas.height / 2;
}
window.addEventListener('resize', resize);
resize();

// Nascondi UI layer durante la schermata iniziale
uiLayer.classList.add('hidden');

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

startBtn.onclick = () => {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    uiLayer.classList.remove('hidden');
    gameState = 'PLAYING';
    score = 0;
    player.health = 100;
    player.x = 100;
    player.y = canvas.height / 2;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    explosion = null;
    scoreEl.innerText = score;
    healthBar.style.width = "100%";
};

restartBtn.onclick = () => {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    uiLayer.classList.remove('hidden');
    gameState = 'PLAYING';
    score = 0;
    player.health = 100;
    player.x = 100;
    player.y = canvas.height / 2;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    explosion = null;
    scoreEl.innerText = score;
    healthBar.style.width = "100%";
};

// Joystick Mobile
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
if(joystickZone) {
    joystickZone.addEventListener('touchstart', (e) => { touchData.active = true; handleTouch(e.touches[0]); });
    window.addEventListener('touchmove', (e) => { if(touchData.active) { e.preventDefault(); handleTouch(e.touches[0]); } }, { passive: false });
    window.addEventListener('touchend', () => {
        touchData.active = false; touchData.dx = 0; touchData.dy = 0;
        joystickKnob.style.transform = `translate(-50%, -50%)`;
    });
}

function handleTouch(t) {
    const rect = joystickZone.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rect.width/2);
    const angle = Math.atan2(dy, dx);
    touchData.dx = (Math.cos(angle) * dist) / (rect.width/2);
    touchData.dy = (Math.sin(angle) * dist) / (rect.width/2);
    joystickKnob.style.transform = `translate(calc(-50% + ${touchData.dx*50}px), calc(-50% + ${touchData.dy*50}px))`;
}

const fireBtn = document.getElementById('fire-btn');
if(fireBtn) {
    fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['Space'] = true; });
    fireBtn.addEventListener('touchend', () => { keys['Space'] = false; });
}

function update() {
    // Gestisci lo stato esplosione
    if (gameState === 'EXPLOSION') {
        const elapsed = Date.now() - explosion.startTime;
        if (elapsed > 1500) {
            gameState = 'GAMEOVER';
            gameOverScreen.classList.remove('hidden');
            finalScoreEl.innerText = score;
        }
        return;
    }

    if (gameState !== 'PLAYING') return;

    let mvX = touchData.dx || (keys['ArrowRight'] || keys['KeyD'] ? 1 : keys['ArrowLeft'] || keys['KeyA'] ? -1 : 0);
    let mvY = touchData.dy || (keys['ArrowDown'] || keys['KeyS'] ? 1 : keys['ArrowUp'] || keys['KeyW'] ? -1 : 0);

    // Aggiorna rotazione basata su movimento orizzontale e verticale
    let rotationX = 0;
    let rotationY = 0;

    // Rotazione per movimento orizzontale (invertita)
    if (mvX > 0) {
        rotationX = 5 * (Math.PI / 180); // Avanti: inclina verso l'alto
    } else if (mvX < 0) {
        rotationX = -5 * (Math.PI / 180); // Indietro: inclina verso il basso
    }

    // Rotazione per movimento verticale
    if (mvY < 0) {
        rotationY = -15 * (Math.PI / 180); // Su: leggera inclinazione
    } else if (mvY > 0) {
        rotationY = 15 * (Math.PI / 180); // Giù: leggera inclinazione
    }

    player.rotation = rotationX + rotationY;

    player.x += mvX * player.speed;
    player.y += mvY * player.speed;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

    // Aggiorna scrolling orizzontale del mare
    seaOffsetX -= 2;
    if (seaOffsetX < -canvas.width) seaOffsetX += canvas.width;

    // Parallax verticale: disabled - il mare rimane fisso verticalmente
    // seaOffsetY rimane 0 per mantenere il mare statico in verticale

    const now = Date.now();
    if ((keys['Space'] || keys['Enter']) && now - player.lastFire > 300) {
        bullets.push({ x: player.x + player.w - 10, y: player.y + player.h/2, vx: canvas.width / 200 });
        player.lastFire = now;
    }

    bullets.forEach((b, i) => {
        b.x += b.vx;
        if (b.x > canvas.width) bullets.splice(i, 1);
    });

    // Nemici (Neri)
    if (Math.random() < 0.006) {
        const newEnemyY = 60 + Math.random() * (canvas.height - 120);
        const newEnemy = {
            x: canvas.width + 150,
            y: newEnemyY,
            w: 160, h: 50, speed: 4 + (score/3750),
            lastFire: 0
        };

        // Verifica se il nuovo nemico si sovrappone con gli esistenti
        const canSpawn = !enemies.some(e =>
            Math.abs(newEnemy.y - e.y) < (newEnemy.h + e.h) + 30
        );

        if (canSpawn) {
            enemies.push(newEnemy);
        }
    }

    enemies.forEach((e, i) => {
        e.x -= e.speed;
        
        // Nemici sparano orizzontalmente se sono davanti al giocatore
        const enemyNow = Date.now();
        if (enemyNow - e.lastFire > 800 && e.x > player.x) {
            enemyBullets.push({ x: e.x, y: e.y + e.h / 2, vx: -(canvas.width / 250), vy: 0 });
            e.lastFire = enemyNow;
        }
        
        bullets.forEach((b, bi) => {
            if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                enemies.splice(i, 1);
                bullets.splice(bi, 1);
                score += 100;
                scoreEl.innerText = score;
            }
        });
        // Collisione tra giocatore (centrato) e nemico
        const playerLeft = player.x - player.w / 2;
        const playerRight = player.x + player.w / 2;
        const playerTop = player.y - player.h / 2;
        const playerBottom = player.y + player.h / 2;
        
        if (playerLeft < e.x + e.w && playerRight > e.x &&
            playerTop < e.y + e.h && playerBottom > e.y) {
            // Centro esatto tra i due riquadri
            const collisionX = (playerLeft + playerRight + e.x + e.x + e.w) / 4;
            const collisionY = (playerTop + playerBottom + e.y + e.y + e.h) / 4;
            explosion = { x: collisionX, y: collisionY, startTime: Date.now() };
            gameState = 'EXPLOSION';
            enemies.splice(i, 1);
        }
        if (e.x < -200) enemies.splice(i, 1);
    });
    
    // Aggiorna proiettili nemici
    enemyBullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
            enemyBullets.splice(i, 1);
        }
    });
    
    // Collisioni proiettili nemici con giocatore
    enemyBullets.forEach((b, bi) => {
        if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
            enemyBullets.splice(bi, 1);
            player.health -= 10;
            healthBar.style.width = player.health + "%";
        }
    });

    if (Math.random() < 0.005) {
        clouds.push({
            x: canvas.width + 300,
            y: Math.random() * canvas.height,
            s: 0.5 + Math.random(),
            layer: Math.random() < 0.5 ? 0 : 2
        });
    }
    clouds.forEach((c, i) => { c.x -= c.s * 4; if (c.x < -400) clouds.splice(i, 1); });
}

function draw() {
    // Cielo con gradiente (da azzurro intenso sotto a chiaro sopra)
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#1e40af'); // Blu scuro
    gradient.addColorStop(1, '#93c5fd'); // Azzurro chiaro
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Disegno Mare
    if (seaReady) {
        const seaHeight = 150;
        const seaY = canvas.height - seaHeight - 5 + seaOffsetY;

        // Disegna il mare ripetuto orizzontalmente
        for (let i = -2; i < 3; i++) {
            ctx.drawImage(seaImg, seaOffsetX + i * canvas.width, seaY, canvas.width, seaHeight);
        }
    }

    const drawCloud = (c) => {
        if (cloudReady) {
            ctx.drawImage(cloudImg, c.x, c.y, 300 * c.s, 120 * c.s);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.arc(c.x, c.y, 60 * c.s, 0, Math.PI*2); ctx.fill();
        }
    };

    // Nuvole Background (Layer 0)
    clouds.forEach(c => { if (c.layer === 0) drawCloud(c); });

    if (gameState === 'PLAYING') {
        // Proiettili Giocatore (Missili)
        bullets.forEach(b => {
            if (missileReady) {
                ctx.drawImage(missileImg, b.x, b.y, 80, 20);
            } else {
                ctx.fillStyle = '#f87171';
                ctx.fillRect(b.x, b.y, 80, 20);
            }
        });
        
        // Proiettili Nemici
        enemyBullets.forEach(b => {
            if (missileReady) {
                ctx.save();
                ctx.translate(b.x + 40, b.y + 10);
                const angle = Math.atan2(b.vy, b.vx);
                ctx.rotate(angle);
                ctx.drawImage(missileImg, -40, -10, 80, 20);
                ctx.restore();
            } else {
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(b.x, b.y, 80, 20);
            }
        });

        // Disegno Giocatore (con rotazione)
        if (playerReady) {
            ctx.save();
            ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
            ctx.rotate(player.rotation);
            ctx.drawImage(playerImg, -player.w / 2, -player.h / 2, player.w, player.h);
            ctx.restore();
        }

        // Disegno Nemici (Neri)
        enemies.forEach(e => {
            if (enemyReady) {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.drawImage(enemyImg, 0, 0, e.w, e.h);
                ctx.restore();
            }
        });
    }

    // Nuvole Foreground (Layer 2)
    clouds.forEach(c => { if (c.layer === 2) drawCloud(c); });

    // Disegna esplosione se in corso (solo per i primi 1.5 secondi)
    if (gameState === 'EXPLOSION' && explosion) {
        const elapsed = Date.now() - explosion.startTime;
        if (elapsed < 650) {
            const progress = elapsed / 1500; // 0 a 1 in 1.5 secondi
            
            // Easing elastico (easeOutElastic)
            let easeProgress;
            if (progress === 0) {
                easeProgress = 0;
            } else if (progress === 1) {
                easeProgress = 1;
            } else {
                const c5 = (2 * Math.PI) / 4.5;
                easeProgress = Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c5) + 1;
            }
            
            // Animazione: da 30px a 100px
            const size = 30 + (100 - 30) * easeProgress;
            
            if (explosionReady) {
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.drawImage(explosionImg, explosion.x - size / 2, explosion.y - size / 2, size, size);
                ctx.restore();
            } else {
                // Fallback: cerchio giallo/arancione
                ctx.save();
                ctx.fillStyle = 'rgba(255, 100, 0, 1)';
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    requestAnimationFrame(() => { update(); draw(); });
}

draw();
