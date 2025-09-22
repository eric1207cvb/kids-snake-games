// 遊戲變數
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// 遊戲設定
let gridSize = 30; // 中等格子，增加遊戲範圍
let tileCountX = 25; // 更大的遊戲區域
let tileCountY = 18;

// 設定畫布大小
function resizeCanvas() {
    // 簡化版本，固定大小
    canvas.width = tileCountX * gridSize;
    canvas.height = tileCountY * gridSize;
}

let snake = [{x: 12, y: 9}]; // 中央開始位置
let food = {};
let powerUps = [];
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let gamePaused = false;
let gameSpeed = 180;
let speedEffect = 0;
let activeEffects = [];
let combo = 0;
let comboTimer = 0;
let perfectMoves = 0;
let lastDirection = null;
let survivalTime = 0;
let bonusMultiplier = 1;
let lives = 3; // 恢復3條命系統
let invulnerable = 0;
let maxLives = 5; // 最多5條命
let fruitsEaten = 0; // 吃掉的果子數量
let level = 1; // 遊戲等級

// 魔法果子類型
const powerUpTypes = [
    {
        type: 'speed',
        emoji: '⚡',
        name: '加速果子',
        color: '#FFFF00',
        effect: () => {
            gameSpeed = 100;
            speedEffect = 300;
            showEffect('⚡ 加速中！', '#FFFF00');
        }
    },
    {
        type: 'slow',
        emoji: '🐌',
        name: '減速果子',
        color: '#00FF00',
        effect: () => {
            gameSpeed = 300;
            speedEffect = 300;
            showEffect('🐌 減速中！', '#00FF00');
        }
    },
    {
        type: 'grow',
        emoji: '📏',
        name: '變長果子',
        color: '#FF00FF',
        effect: () => {
            for (let i = 0; i < 3; i++) {
                snake.push({...snake[snake.length - 1]});
            }
            showEffect('📏 蛇變長了！', '#FF00FF');
        }
    },
    {
        type: 'life',
        emoji: '❤️',
        name: '生命果子',
        color: '#FF1493',
        effect: () => {
            if (lives < maxLives) {
                lives++;
                showEffect('❤️ 獲得生命！', '#FF1493');
            } else {
                score += 200;
                showEffect('❤️ 生命已滿！+200分', '#FF1493');
            }
        }
    },
    {
        type: 'shrink',
        emoji: '✂️',
        name: '變短果子',
        color: '#FF8000',
        effect: () => {
            if (snake.length > 3) {
                snake.splice(-2, 2);
                showEffect('✂️ 蛇變短了！', '#FF8000');
            }
        }
    },
    {
        type: 'bonus',
        emoji: '💎',
        name: '鑽石果子',
        color: '#00FFFF',
        effect: () => {
            score += 100;
            showEffect('💎 獲得100分！', '#00FFFF');
        }
    },
    {
        type: 'rainbow',
        emoji: '🌈',
        name: '彩虹果子',
        color: '#8A2BE2',
        effect: () => {
            activeEffects.push({
                type: 'rainbow',
                duration: 500,
                colors: ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#0080FF', '#8000FF']
            });
            bonusMultiplier = 2;
            setTimeout(() => { bonusMultiplier = 1; }, 5000);
            showEffect('🌈 彩虹模式！雙倍分數', '#8A2BE2');
        }
    },
    {
        type: 'shield',
        emoji: '🛡️',
        name: '護盾果子',
        color: '#4169E1',
        effect: () => {
            invulnerable = 300; // 5秒無敵
            showEffect('🛡️ 無敵模式！', '#4169E1');
        }
    },
    {
        type: 'teleport',
        emoji: '🌀',
        name: '傳送果子',
        color: '#FF69B4',
        effect: () => {
            // 隨機傳送到安全位置
            let newX, newY, safe = false;
            let attempts = 0;
            do {
                newX = Math.floor(Math.random() * tileCountX);
                newY = Math.floor(Math.random() * tileCountY);
                safe = true;
                
                // 檢查是否安全
                for (let segment of snake.slice(1)) {
                    if (segment.x === newX && segment.y === newY) {
                        safe = false;
                        break;
                    }
                }
                attempts++;
            } while (!safe && attempts < 50);
            
            if (safe) {
                snake[0].x = newX;
                snake[0].y = newY;
                showEffect('🌀 傳送成功！', '#FF69B4');
            }
        }
    }
];

// 初始化遊戲
function initGame() {
    resizeCanvas();
    highScoreElement.textContent = highScore;
    generateFood();
    drawGame();
}

// 生成食物
function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY)
    };
    
    // 確保食物不會生成在蛇身上
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
}

// 生成魔法果子 - 增加出現機率和數量
function generatePowerUp() {
    if (Math.random() < 0.4 && powerUps.length < 3) {
        const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const powerUp = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY),
            type: powerUpType.type,
            emoji: powerUpType.emoji,
            color: powerUpType.color,
            effect: powerUpType.effect,
            lifeTime: 300
        };
        
        // 確保不會生成在蛇身上或食物上
        let validPosition = true;
        for (let segment of snake) {
            if (segment.x === powerUp.x && segment.y === powerUp.y) {
                validPosition = false;
                break;
            }
        }
        
        if (food.x === powerUp.x && food.y === powerUp.y) {
            validPosition = false;
        }
        
        if (validPosition) {
            powerUps.push(powerUp);
        }
    }
}

// 顯示效果文字 - 使用隊列系統避免重疊
let textQueue = [];
let currentTextIndex = 0;

function showEffect(text, color) {
    // 添加到文字隊列
    textQueue.push({
        text: text,
        color: color,
        id: currentTextIndex++
    });
    
    // 如果隊列太長，移除舊的
    if (textQueue.length > 3) {
        textQueue.shift();
    }
    
    // 清除舊的文字效果
    activeEffects = activeEffects.filter(effect => effect.type !== 'text');
    
    // 重新排列所有文字
    textQueue.forEach((textItem, index) => {
        activeEffects.push({
            type: 'text',
            text: textItem.text,
            color: textItem.color,
            duration: 120,
            y: canvas.height / 2 - 80 + (index * 40), // 每行間隔40像素
            id: textItem.id
        });
    });
}

// 繪製遊戲
function drawGame() {
    // 清除畫布
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 檢查是否有彩虹效果
    const rainbowEffect = activeEffects.find(effect => effect.type === 'rainbow');
    
    // 繪製蛇身
    for (let i = 1; i < snake.length; i++) {
        const segment = snake[i];
        if (rainbowEffect) {
            ctx.fillStyle = rainbowEffect.colors[i % rainbowEffect.colors.length];
        } else {
            ctx.fillStyle = '#27ae60';
        }
        ctx.fillRect(segment.x * gridSize + 2, segment.y * gridSize + 2, gridSize - 4, gridSize - 4);
    }
    
    // 繪製蛇頭（無敵時閃爍）
    if (invulnerable > 0 && Math.floor(invulnerable / 10) % 2 === 0) {
        ctx.fillStyle = '#FFFFFF';
    } else if (rainbowEffect) {
        ctx.fillStyle = rainbowEffect.colors[0];
    } else {
        ctx.fillStyle = '#2ecc71';
    }
    ctx.fillRect(snake[0].x * gridSize + 2, snake[0].y * gridSize + 2, gridSize - 4, gridSize - 4);
    
    // 無敵護盾效果
    if (invulnerable > 0) {
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 3;
        ctx.strokeRect(snake[0].x * gridSize, snake[0].y * gridSize, gridSize, gridSize);
    }
    
    // 繪製食物
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
    
    // 繪製魔法果子
    for (let powerUp of powerUps) {
        ctx.fillStyle = powerUp.color;
        ctx.fillRect(powerUp.x * gridSize + 2, powerUp.y * gridSize + 2, gridSize - 4, gridSize - 4);
        
        // 繪製表情符號
        ctx.fillStyle = '#000000';
        ctx.font = `${gridSize - 20}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
            powerUp.emoji, 
            powerUp.x * gridSize + gridSize / 2, 
            powerUp.y * gridSize + gridSize / 2 + 8
        );
    }
    
    // 繪製效果文字
    for (let effect of activeEffects) {
        if (effect.type === 'text') {
            ctx.fillStyle = effect.color;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(effect.text, canvas.width / 2, effect.y);
        }
    }
    
    // 顯示遊戲狀態資訊
    ctx.textAlign = 'left';
    ctx.font = '16px Arial';
    
    // 顯示生命
    ctx.fillStyle = '#FF1493';
    let heartsDisplay = '❤️'.repeat(lives);
    ctx.fillText(`生命: ${heartsDisplay}`, 10, canvas.height - 60);
    
    // 顯示等級
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`等級: ${level}`, 10, canvas.height - 40);
    
    // 顯示升級進度
    ctx.fillStyle = '#00FF00';
    let progressToNext = fruitsEaten % 5;
    ctx.fillText(`升級進度: ${progressToNext}/5`, 10, canvas.height - 20);
    
    // 顯示無敵狀態
    if (invulnerable > 0) {
        ctx.fillStyle = '#4169E1';
        ctx.fillText(`🛡️ 無敵 ${Math.ceil(invulnerable/60)}秒`, canvas.width - 120, canvas.height - 20);
    }
}

// 移動蛇
function moveSnake() {
    if (!gameRunning || gamePaused) return;
    
    let head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    // 穿牆功能
    if (head.x < 0) {
        head.x = tileCountX - 1;
    } else if (head.x >= tileCountX) {
        head.x = 0;
    }
    
    if (head.y < 0) {
        head.y = tileCountY - 1;
    } else if (head.y >= tileCountY) {
        head.y = 0;
    }
    
    // 檢查是否撞到自己
    if (checkSelfCollision(head)) {
        if (invulnerable > 0) {
            showEffect('🛡️ 無敵保護！', '#4169E1');
        } else if (lives > 1) {
            // 還有生命，扣除一條命但保持分數
            lives--;
            invulnerable = 180; // 3秒無敵時間
            showEffect(`💔 失去生命！剩餘${lives}條命`, '#FF0000');
            
            // 蛇縮短一些作為懲罰
            if (snake.length > 3) {
                snake.splice(-2, 2);
            }
            
            // 重置蛇到安全位置但保持分數
            snake = [{x: 12, y: 9}]; // 重置為只有一節
            dx = 0;
            dy = 0;
        } else {
            // 沒有生命了，完全重新開始
            showEffect('💀 遊戲結束！重新開始', '#FF0000');
            setTimeout(() => {
                resetGame();
                startGame();
            }, 1500);
            return;
        }
    }
    
    snake.unshift(head);
    
    // 檢查是否吃到食物
    let ateFood = false;
    if (head.x === food.x && head.y === food.y) {
        ateFood = true;
        score += 10 * level; // 等級越高分數越多
        fruitsEaten++;
        scoreElement.textContent = score;
        
        // 每吃5個果子升一級
        if (fruitsEaten % 5 === 0) {
            level++;
            gameSpeed = Math.max(80, gameSpeed - 15); // 速度加快
            showEffect(`🎉 升級！等級${level}`, '#FFD700');
        }
        
        generateFood();
        generatePowerUp();
        
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
    }
    
    // 如果沒吃到食物，移除尾巴（這樣蛇才不會一直變長）
    if (!ateFood) {
        snake.pop();
    }
    
    // 檢查是否吃到魔法果子
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (head.x === powerUp.x && head.y === powerUp.y) {
            powerUp.effect();
            
            // 不同果子不同分數
            let points = 20;
            switch(powerUp.type) {
                case 'bonus': points = 100; break;
                case 'rainbow': points = 50; break;
                case 'life': points = 75; break;
                case 'shield': points = 60; break;
                case 'teleport': points = 40; break;
                case 'grow': points = 30; break;
                default: points = 25; break;
            }
            
            score += Math.floor(points * bonusMultiplier);
            scoreElement.textContent = score;
            powerUps.splice(i, 1);
        }
    }
    
    // 更新魔法果子
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].lifeTime--;
        if (powerUps[i].lifeTime <= 0) {
            powerUps.splice(i, 1);
        }
    }
    
    // 更新效果
    if (invulnerable > 0) {
        invulnerable--;
    }
    
    if (speedEffect > 0) {
        speedEffect--;
        if (speedEffect === 0) {
            gameSpeed = Math.max(80, 180 - (level - 1) * 15); // 根據等級調整基礎速度
        }
    }
    
    // 更新文字效果，當文字消失時從隊列中移除
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        activeEffects[i].duration--;
        if (activeEffects[i].duration <= 0) {
            if (activeEffects[i].type === 'text') {
                // 從文字隊列中移除對應的文字
                textQueue = textQueue.filter(item => item.id !== activeEffects[i].id);
            }
            activeEffects.splice(i, 1);
        }
    }
    
    drawGame();
}

// 檢查是否撞到自己
function checkSelfCollision(head) {
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;
        }
    }
    return false;
}

// 遊戲結束
function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
}

// 重置遊戲 - 完全重新開始
function resetGame() {
    snake = [{x: 12, y: 9}]; // 回到中央
    dx = 0;
    dy = 0;
    score = 0; // 分數歸零
    scoreElement.textContent = score;
    gameRunning = false;
    gamePaused = false;
    gameSpeed = 180;
    speedEffect = 0;
    powerUps = []; // 清除所有魔法果子
    activeEffects = [];
    textQueue = []; // 清除文字隊列
    currentTextIndex = 0;
    combo = 0; // 重置連擊
    comboTimer = 0;
    perfectMoves = 0;
    survivalTime = 0;
    bonusMultiplier = 1;
    lives = 3; // 重新開始有3條命
    invulnerable = 0;
    fruitsEaten = 0; // 重置果子計數
    level = 1; // 重置等級
    gameOverElement.style.display = 'none';
    generateFood();
    drawGame();
}

// 開始遊戲
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        dx = 1;
        dy = 0;
    }
}

// 暫停遊戲
function pauseGame() {
    gamePaused = !gamePaused;
}

// 鍵盤控制
document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    if (!gameRunning) return;
    
    changeDirection(key);
});

// 統一的方向控制函數
function changeDirection(direction) {
    if (!gameRunning) return;
    
    switch(direction) {
        case 'ArrowUp':
        case 'up':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
        case 'down':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
        case 'left':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
        case 'right':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
}

// 觸控支援 - 滑動手勢
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// 監聽觸控開始
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: false });

// 監聽觸控結束
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning) return;
    
    const touch = e.changedTouches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    
    handleSwipe();
}, { passive: false });

// 防止觸控滾動
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// 處理滑動手勢
function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30; // 最小滑動距離
    
    // 判斷滑動方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑動
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                changeDirection('right');
            } else {
                changeDirection('left');
            }
        }
    } else {
        // 垂直滑動
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                changeDirection('down');
            } else {
                changeDirection('up');
            }
        }
    }
}

// 按鈕事件
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);

// 遊戲循環
function gameLoop() {
    moveSnake();
    setTimeout(gameLoop, gameSpeed);
}

// 檢測設備類型並顯示適當的控制
function detectDevice() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    
    if (isTouchDevice || isSmallScreen) {
        document.getElementById('virtualControls').style.display = 'block';
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    detectDevice();
    setTimeout(() => {
        initGame();
    }, 100);
});

// 視窗大小改變時重新檢測
window.addEventListener('resize', detectDevice);

// 初始化並開始遊戲循環
initGame();
gameLoop();