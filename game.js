// Motor do MMORPG - HR Prints 3D

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Redimensionamento Dinâmico HD
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- SINTETIZADOR DE ÁUDIO / EFEITOS SONOROS (Web Audio API) ---
const AudioCTX = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (AudioCTX.state === 'suspended') AudioCTX.resume();
    const osc = AudioCTX.createOscillator();
    const gain = AudioCTX.createGain();
    osc.connect(gain);
    gain.connect(AudioCTX.destination);

    if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, AudioCTX.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, AudioCTX.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, AudioCTX.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, AudioCTX.currentTime + 0.15);
        osc.start();
        osc.stop(AudioCTX.currentTime + 0.15);
    } else if (type === 'craft') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, AudioCTX.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, AudioCTX.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, AudioCTX.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, AudioCTX.currentTime + 0.2);
        osc.start();
        osc.stop(AudioCTX.currentTime + 0.2);
    }
}

// --- ESTADO DO JOGADOR & SALVAMENTO (LocalStorage/Nuvem) ---
let player = JSON.parse(localStorage.getItem('hr_player_save')) || {
    x: 1000,
    y: 1000,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    speed: 4,
    filamento: 12,
    level: 1,
    biome: 'Floresta de Polímeros'
};

function saveGame() {
    localStorage.setItem('hr_player_save', JSON.stringify(player));
}
setInterval(saveGame, 5000); // Salvamento automático a cada 5s

// --- SISTEMA DE DIAS E AMBIENTE DINÂMICO ---
let gameTime = 0; // 0 a 2400 (ciclo de dia e noite)
let dayCount = 1;

function updateWorldTime() {
    gameTime = (gameTime + 1) % 2400;
    if (gameTime === 0) dayCount++;

    document.getElementById('day-txt').innerText = dayCount;
    let timeLabel = 'Manhã';
    if (gameTime > 600 && gameTime <= 1200) timeLabel = 'Tarde';
    else if (gameTime > 1200 && gameTime <= 1800) timeLabel = 'Noite';
    else if (gameTime > 1800) timeLabel = 'Madrugada';
    document.getElementById('time-txt').innerText = timeLabel;
}

// --- IA NEURAL/BEHAVIORAL DOS MOBS (Monstros Autônomos) ---
class Mob {
    constructor(x, y, type, color, size) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.size = size;
        this.hp = 50;
        this.state = 'idle'; // idle, wander, chase, attack
        this.targetX = x;
        this.targetY = y;
        this.decisionTimer = 0;
    }

    update() {
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

        // Lógica de Tomada de Decisão (IA)
        if (distToPlayer < 180) {
            this.state = 'chase';
        } else if (Date.now() > this.decisionTimer) {
            this.state = Math.random() > 0.4 ? 'wander' : 'idle';
            if (this.state === 'wander') {
                this.targetX = this.x + (Math.random() * 200 - 100);
                this.targetY = this.y + (Math.random() * 200 - 100);
            }
            this.decisionTimer = Date.now() + Math.floor(Math.random() * 3000) + 1000;
        }

        // Execução do Movimento
        if (this.state === 'chase') {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 2.2;
            this.y += Math.sin(angle) * 2.2;

            if (distToPlayer < 30 && Math.random() < 0.03) {
                player.hp = Math.max(0, player.hp - 5);
                playSound('hit');
                updateHUD();
            }
        } else if (this.state === 'wander') {
            const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
            this.x += Math.cos(angle) * 0.8;
            this.y += Math.sin(angle) * 0.8;
        }
    }

    draw(camX, camY) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y - camY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Barra de Vida do Mob
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - camX - 15, this.y - camY - this.size - 10, 30, 4);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - camX - 15, this.y - camY - this.size - 10, (this.hp / 50) * 30, 4);
    }
}

// Instanciando Monstros Variados
const mobs = [
    new Mob(800, 900, 'Golem de Resina', '#8e44ad', 16),
    new Mob(1200, 1100, 'Slime de Filamento', '#e67e22', 12),
    new Mob(950, 1300, 'Dragão Extrusor', '#c0392b', 22)
];

// --- CONTROLES TECLADO E TOUCH ---
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Botoes Touch (Mobile)
function setupTouchButton(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
}
setupTouchButton('btn-up', 'w');
setupTouchButton('btn-left', 'a');
setupTouchButton('btn-down', 's');
setupTouchButton('btn-right', 'd');

document.getElementById('btn-action')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    attack();
});

// --- MECÂNICA DE IMPRESSÃO 3D & CRAFTING ---
function craftItem() {
    if (player.filamento >= 5) {
        player.filamento -= 5;
        player.hp = Math.min(player.maxHp, player.hp + 30);
        playSound('craft');
        alert('🖨️ Peça impressa em 3D com sucesso! Vida restaurada.');
        updateHUD();
    } else {
        alert('⚠️ Filamento insuficiente! Derrote monstros para obter mais.');
    }
}

function attack() {
    playSound('hit');
    mobs.forEach(mob => {
        const dist = Math.hypot(player.x - mob.x, player.y - mob.y);
        if (dist < 60) {
            mob.hp -= 25;
            if (mob.hp <= 0) {
                player.filamento += 5;
                mob.hp = 50;
                mob.x = player.x + (Math.random() * 400 - 200);
                mob.y = player.y + (Math.random() * 400 - 200);
            }
        }
    });
    updateHUD();
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space') attack();
});

// --- HUD & INTERFACE ---
function updateHUD() {
    document.getElementById('hp-bar').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('hp-txt').innerText = `${player.hp}/${player.maxHp}`;
    document.getElementById('mp-bar').style.width = `${(player.mp / player.maxMp) * 100}%`;
    document.getElementById('mp-txt').innerText = `${player.mp}/${player.maxMp}`;
}

// --- LOOP PRINCIPAL DE GAMEPLAY ---
function gameLoop() {
    // 1. Atualizar posição do jogador
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;

    updateWorldTime();

    // Camera centralizada no Player
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;

    // 2. Limpar Tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Renderizar Chão / Biomas (Grade Pixel Art Dinâmica)
    const tileSize = 64;
    const startX = Math.floor(camX / tileSize) * tileSize;
    const startY = Math.floor(camY / tileSize) * tileSize;

    for (let x = startX; x < camX + canvas.width + tileSize; x += tileSize) {
        for (let y = startY; y < camY + canvas.height + tileSize; y += tileSize) {
            // Cor alternada simulando tiles HD
            const isAlt = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
            ctx.fillStyle = isAlt ? '#27ae60' : '#2ecc71';
            ctx.fillRect(x - camX, y - camY, tileSize, tileSize);
        }
    }

    // 4. Renderizar e Atualizar Mobs
    mobs.forEach(mob => {
        mob.update();
        mob.draw(camX, camY);
    });

    // 5. Renderizar Player (Estilo Pixel Hero)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Overlay de Luz Noturna Dinâmica
    if (gameTime > 1200) {
        const nightAlpha = gameTime > 1800 ? 0.6 : 0.35;
        ctx.fillStyle = `rgba(10, 15, 35, ${nightAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(gameLoop);
}

// Inicializar Jogo
updateHUD();
gameLoop();