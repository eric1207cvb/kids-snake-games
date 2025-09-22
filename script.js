// 遊戲變數
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// 遊戲設定
let gridSize = 20;
let tileCountX, tileCountY;

// 設定畫布大小
function resizeCanvas() {
    const isFullscreen = document.body.classList.contains('fullscreen');
    
    // 獲取可用螢幕空間
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    
    // 為UI元素預留空間 - 減少預留空間讓遊戲更大
    const reservedHeight = isFullscreen ? 60 : 120; // 按鈕和說明文字空間
    const reservedWidth = 20; // 左右邊距
    
    const usableWidth = availableWidth - reservedWidth;
    const usableHeight = availableHeight - reservedHeight;
    
    // 根據螢幕大小動態調整格子大小，確保小朋友容易看清
    if (availableWidth < 600) {
        // 手機螢幕 - 大格子
        gridSize = Math.max(35, Math.min(45, usableWidth / 10));
    } else if (availableWidth < 1200) {
        // 平板螢幕 - 更大格子
        gridSize = Math.max(45, Math.min(55, usableWidth / 14));
    } else {
        // 桌面螢幕 - 超大格子，適合小朋友
        gridSize = Math.max(50, Math.min(70, usableWidth / 18));
    }
    
    // 確保格子大小是整數
    gridSize = Math.floor(gridSize);
    
    // 計算最佳的遊戲區域大小
    const maxTilesX = Math.floor(usableWidth / gridSize);
    const maxTilesY = Math.floor(usableHeight / gridSize);
    
    // 設定合理的最小和最大格子數量 - 減少格子數量讓每個格子更大
    tileCountX = Math.max(10, Math.min(maxTilesX, 20));
    tileCountY = Math.max(8, Math.min(maxTilesY, 16));
    
    // 調整畫布大小以符合格子
    canvas.width = tileCountX * gridSize;
    canvas.height = tileCountY * gridSize;
    
    // 確保畫布不會超出螢幕
    if (canvas.width > usableWidth) {
        tileCountX = Math.floor(usableWidth / gridSize);
        canvas.width = tileCountX * gridSize;
    }
    
    if (canvas.height > usableHeight) {
        tileCountY = Math.floor(usableHeight / gridSize);
        canvas.height = tileCountY * gridSize;
    }
    
    // 更新CSS以居中顯示和響應式 - 讓遊戲佔用更多空間
    canvas.style.maxWidth = '98vw';
    canvas.style.maxHeight = isFullscreen ? '90vh' : '80vh';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    
    console.log(`螢幕: ${availableWidth}x${availableHeight}, 格子大小: ${gridSize}, 遊戲區域: ${tileCountX}x${tileCountY}`);
}

let snake = [
    {x: 15, y: 15}
];
let food = {};
let powerUps = []; // 魔法果子陣列
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
let lives = 3;
let invulnerable = 0;
let maxLives = 9;

// 初始化遊戲
function initGame() {
    resizeCanvas();
    highScoreElement.textContent = highScore;
    generateFood();
    drawGame();
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延遲一點確保所有元素都載入完成
    setTimeout(() => {
        resizeCanvas();
        drawGame();
    }, 100);
});

// 全螢幕功能
function toggleFullscreen() {
    document.body.classList.toggle('fullscreen');
    resizeCanvas();
    drawGame();
}

// 魔法果子類型
const powerUpTypes = [
    {
        type: 'speed',
        emoji: '⚡',
        name: '加速果子',
        color: '#FFFF00',
        effect: () => {
            gameSpeed = 100; // 變快
            speedEffect = 300; // 持續5秒 (300 frames)
            showEffect('⚡ 加速中！', '#FFFF00');
        }
    },
    {
        type: 'slow',
        emoji: '🐌',
        name: '減速果子',
        color: '#00FF00',
        effect: () => {
            gameSpeed = 300; // 變慢
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
            // 讓蛇立即變長3節
            for (let i = 0; i < 3; i++) {
                snake.push({...snake[snake.length - 1]});
            }
            showEffect('📏 蛇變長了！', '#FF00FF');
        }
    },
    {
        type: 'shrink',
        emoji: '✂️',
        name: '變短果子',
        color: '#FF8000',
        effect: () => {
            // 讓蛇變短，但至少保留3節
            if (snake.length > 5) {
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
            // 彩虹效果：蛇會變成彩色
            activeEffects.push({
                type: 'rainbow',
                duration: 500,
                colors: ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#0080FF', '#8000FF']
            });
            showEffect('🌈 彩虹模式！', '#8A2BE2');
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
                    // 生命已滿，給予大量分數獎勵
                    score += 200;
                    showEffect('❤️ 生命已滿！+200分', '#FF1493');
                }
            }
        },
        {
            type: 'shield',
            emoji: '🛡️',
            name: '護盾果子',
            color: '#4169E1',
            effect: () => {
                invulnerable = 600; // 10秒無敵時間
                showEffect('🛡️ 無敵模式！', '#4169E1');
            }
        },
        {
            type: 'revive',
            emoji: '🔄',
            name: '復活果子',
            color: '#32CD32',
            effect: () => {
                // 立即復活效果，即使撞到自己也不會死
                invulnerable = 180; // 3秒無敵
                lives = Math.min(maxLives, lives + 2); // 額外獲得2條命
                showEffect('🔄 復活之力！+2命', '#32CD32');
            }
        }
    }
];

// 生成食物
function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY)
    };
    
    // 確保食物不會生成在蛇身上或魔法果子上
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
    
    for (let powerUp of powerUps) {
        if (powerUp.x === food.x && powerUp.y === food.y) {
            generateFood();
            return;
        }
    }
}

// 生成魔法果子
function generatePowerUp() {
    // 20% 機率生成魔法果子
    if (Math.random() < 0.2 && powerUps.length < 2) {
        const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const powerUp = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY),
            type: powerUpType.type,
            emoji: powerUpType.emoji,
            color: powerUpType.color,
            effect: powerUpType.effect,
            lifeTime: 600 // 10秒後消失
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

// 顯示效果文字
function showEffect(text, color) {
    activeEffects.push({
        type: 'text',
        text: text,
        color: color,
        duration: 120, // 2秒
        y: canvas.height / 2 - 50
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
            // 彩虹效果：每節不同顏色
            ctx.fillStyle = rainbowEffect.colors[i % rainbowEffect.colors.length];
        } else {
            ctx.fillStyle = '#27ae60';
        }
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
    }
    
    // 繪製蛇頭（無敵時閃爍）
    if (invulnerable > 0 && Math.floor(invulnerable / 10) % 2 === 0) {
        // 無敵時閃爍效果
        ctx.fillStyle = '#FFFFFF';
    } else if (rainbowEffect) {
        ctx.fillStyle = rainbowEffect.colors[0];
    } else {
        ctx.fillStyle = '#2ecc71';
    }
    ctx.fillRect(snake[0].x * gridSize + 1, snake[0].y * gridSize + 1, gridSize - 2, gridSize - 2);
    
    // 無敵護盾效果
    if (invulnerable > 0) {
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 3;
        ctx.strokeRect(snake[0].x * gridSize - 2, snake[0].y * gridSize - 2, gridSize + 4, gridSize + 4);
    }
    
    // 繪製食物
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(food.x * gridSize + 1, food.y * gridSize + 1, gridSize - 2, gridSize - 2);
    
    // 繪製魔法果子
    for (let powerUp of powerUps) {
        ctx.fillStyle = powerUp.color;
        ctx.fillRect(powerUp.x * gridSize + 1, powerUp.y * gridSize + 1, gridSize - 2, gridSize - 2);
        
        // 繪製表情符號
        ctx.fillStyle = '#000000';
        ctx.font = `${gridSize - 8}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
            powerUp.emoji, 
            powerUp.x * gridSize + gridSize / 2, 
            powerUp.y * gridSize + gridSize / 2 + 5
        );
        
        // 閃爍效果
        if (powerUp.lifeTime < 120 && Math.floor(powerUp.lifeTime / 10) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(powerUp.x * gridSize + 1, powerUp.y * gridSize + 1, gridSize - 2, gridSize - 2);
        }
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
    let yPos = canvas.height - 60;
    
    // 速度狀態
    if (speedEffect > 0) {
        ctx.fillStyle = gameSpeed < 180 ? '#FFFF00' : '#00FF00';
        const statusText = gameSpeed < 180 ? '⚡ 加速中' : '🐌 減速中';
        ctx.fillText(statusText, 10, yPos);
        yPos += 20;
    }
    
    // 連擊顯示
    if (combo > 1) {
        ctx.fillStyle = '#FF4500';
        ctx.fillText(`🔥 ${combo}連擊`, 10, yPos);
        yPos += 20;
    }
    
    // 倍數獎勵
    if (bonusMultiplier > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`✨ ${bonusMultiplier}x倍數`, 10, yPos);
        yPos += 20;
    }
    
    // 完美移動進度
    if (perfectMoves > 0) {
        ctx.fillStyle = '#00FF7F';
        ctx.fillText(`🎯 完美移動 ${perfectMoves}/5`, 10, yPos);
        yPos += 20;
    }
    
    // 生命顯示
    ctx.fillStyle = lives > 1 ? '#FF1493' : '#FF0000';
    let heartsDisplay = '❤️'.repeat(lives);
    if (lives < maxLives) {
        heartsDisplay += '🤍'.repeat(maxLives - lives);
    }
    ctx.fillText(`生命: ${heartsDisplay}`, 10, yPos);
    
    // 無敵狀態
    if (invulnerable > 0) {
        ctx.fillStyle = '#4169E1';
        ctx.fillText(`🛡️ 無敵 ${Math.ceil(invulnerable/60)}秒`, 10, yPos + 20);
    }
}

// 移動蛇
function moveSnake() {
    if (!gameRunning || gamePaused) return;
    
    let head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    // 穿牆功能 - 如果超出邊界就從另一邊出現
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
            // 無敵狀態，不會死亡
            showEffect('🛡️ 無敵保護！', '#4169E1');
        } else if (lives > 1) {
            // 還有生命，扣除一條命
            lives--;
            invulnerable = 120; // 2秒無敵時間
            showEffect(`💔 失去生命！剩餘${lives}條命`, '#FF0000');
            
            // 蛇縮短一些作為懲罰
            if (snake.length > 3) {
                snake.splice(-2, 2);
            }
        } else {
            // 沒有生命了，遊戲結束
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // 檢查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        let points = calculateFoodPoints();
        score += points;
        scoreElement.textContent = score;
        
        // 連擊系統
        combo++;
        comboTimer = 300; // 5秒連擊時間
        
        generateFood();
        generatePowerUp(); // 有機會生成魔法果子
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
    } else {
        snake.pop();
    }
    
    // 檢查是否吃到魔法果子
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (head.x === powerUp.x && head.y === powerUp.y) {
            powerUp.effect(); // 執行魔法效果
            let powerUpPoints = calculatePowerUpPoints(powerUp.type);
            score += powerUpPoints;
            combo++;
            comboTimer = 300;
            powerUps.splice(i, 1); // 移除已吃的魔法果子
        }
    }
    
    // 更新魔法果子
    updatePowerUps();
    
    // 更新效果
    updateEffects();
    
    drawGame();
}

// 更新魔法果子
function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].lifeTime--;
        if (powerUps[i].lifeTime <= 0) {
            powerUps.splice(i, 1); // 移除過期的魔法果子
        }
    }
}

// 計算食物分數
function calculateFoodPoints() {
    let basePoints = 10;
    let totalPoints = basePoints;
    
    // 連擊加分
    if (combo > 1) {
        let comboBonus = Math.min(combo * 5, 50); // 最多50分連擊獎勵
        totalPoints += comboBonus;
        showEffect(`🔥 ${combo}連擊！+${comboBonus}分`, '#FF4500');
    }
    
    // 蛇長度加分
    if (snake.length >= 10) {
        let lengthBonus = Math.floor(snake.length / 5) * 5;
        totalPoints += lengthBonus;
        showEffect(`📏 長蛇獎勵！+${lengthBonus}分`, '#9932CC');
    }
    
    // 速度加分
    if (gameSpeed < 180) {
        totalPoints += 15;
        showEffect(`⚡ 高速獎勵！+15分`, '#FFD700');
    }
    
    // 完美移動獎勵（沒有多餘轉向）
    perfectMoves++;
    if (perfectMoves >= 5) {
        totalPoints += 25;
        showEffect(`🎯 完美移動！+25分`, '#00FF7F');
        perfectMoves = 0;
    }
    
    // 倍數獎勵
    totalPoints = Math.floor(totalPoints * bonusMultiplier);
    
    if (totalPoints > basePoints) {
        showEffect(`總獲得：${totalPoints}分！`, '#FFFFFF');
    }
    
    return totalPoints;
}

// 計算魔法果子分數
function calculatePowerUpPoints(type) {
    let basePoints = 20;
    let bonusPoints = 0;
    
    switch(type) {
        case 'speed':
            bonusPoints = 30;
            break;
        case 'slow':
            bonusPoints = 25;
            break;
        case 'grow':
            bonusPoints = 40;
            break;
        case 'shrink':
            bonusPoints = 35;
            break;
        case 'bonus':
            bonusPoints = 100;
            break;
        case 'rainbow':
            bonusPoints = 50;
            bonusMultiplier = 2; // 雙倍分數5秒
            setTimeout(() => { bonusMultiplier = 1; }, 5000);
            break;
        case 'life':
            bonusPoints = lives < maxLives ? 75 : 200;
            break;
        case 'shield':
            bonusPoints = 100;
            break;
        case 'revive':
            bonusPoints = 150;
            break;
    }
    
    // 連擊額外獎勵
    if (combo > 3) {
        bonusPoints += combo * 10;
        showEffect(`🌟 超級連擊！額外+${combo * 10}分`, '#FF1493');
    }
    
    return basePoints + bonusPoints;
}

// 更新效果
function updateEffects() {
    // 更新生存時間
    survivalTime++;
    
    // 每30秒生存獎勵
    if (survivalTime % 1800 === 0) { // 30秒 * 60fps
        let survivalBonus = Math.floor(survivalTime / 1800) * 50;
        score += survivalBonus;
        showEffect(`⏰ 生存獎勵！+${survivalBonus}分`, '#32CD32');
    }
    
    // 更新連擊計時器
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            if (combo > 5) {
                let comboFinalBonus = combo * 20;
                score += comboFinalBonus;
                showEffect(`🎊 連擊結束獎勵！+${comboFinalBonus}分`, '#FF69B4');
            }
            combo = 0;
        }
    }
    
    // 更新無敵狀態
    if (invulnerable > 0) {
        invulnerable--;
    }
    
    // 更新速度效果
    if (speedEffect > 0) {
        speedEffect--;
        if (speedEffect === 0) {
            gameSpeed = 180; // 恢復正常速度
        }
    }
    
    // 更新其他效果
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        activeEffects[i].duration--;
        if (activeEffects[i].duration <= 0) {
            activeEffects.splice(i, 1);
        }
    }
}

// 檢查是否撞到自己（移除撞牆檢查，因為現在可以穿牆）
function checkSelfCollision(head) {
    // 只檢查撞到自己
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

// 重置遊戲
function resetGame() {
    // 讓蛇從畫布中央開始，適合更大的遊戲區域
    snake = [{x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2)}];
    dx = 0;
    dy = 0;
    score = 0;
    scoreElement.textContent = score;
    gameRunning = false;
    gamePaused = false;
    gameSpeed = 180;
    speedEffect = 0;
    powerUps = [];
    activeEffects = [];
    combo = 0;
    comboTimer = 0;
    perfectMoves = 0;
    lastDirection = null;
    survivalTime = 0;
    bonusMultiplier = 1;
    lives = 3;
    invulnerable = 0;
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
    
    // F鍵切換全螢幕
    if (key === 'f' || key === 'F') {
        toggleFullscreen();
        return;
    }
    
    if (!gameRunning) return;
    
    let newDirection = null;
    
    // 防止蛇反向移動
    if (key === 'ArrowUp' && dy !== 1) {
        dx = 0;
        dy = -1;
        newDirection = 'up';
    } else if (key === 'ArrowDown' && dy !== -1) {
        dx = 0;
        dy = 1;
        newDirection = 'down';
    } else if (key === 'ArrowLeft' && dx !== 1) {
        dx = -1;
        dy = 0;
        newDirection = 'left';
    } else if (key === 'ArrowRight' && dx !== -1) {
        dx = 1;
        dy = 0;
        newDirection = 'right';
    }
    
    // 檢查是否為不必要的轉向
    if (newDirection && newDirection === lastDirection) {
        perfectMoves = Math.max(0, perfectMoves - 1); // 重複按鍵懲罰
    }
    
    if (newDirection) {
        lastDirection = newDirection;
    }
});

// 按鈕事件
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

// 視窗大小改變時重新調整畫布
window.addEventListener('resize', () => {
    resizeCanvas();
    drawGame();
});

// 觸控支援
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning) return;
    
    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // 最小滑動距離
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑動
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && dx !== -1) {
                // 向右滑動
                dx = 1;
                dy = 0;
                lastDirection = 'right';
            } else if (deltaX < 0 && dx !== 1) {
                // 向左滑動
                dx = -1;
                dy = 0;
                lastDirection = 'left';
            }
        }
    } else {
        // 垂直滑動
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && dy !== -1) {
                // 向下滑動
                dx = 0;
                dy = 1;
                lastDirection = 'down';
            } else if (deltaY < 0 && dy !== 1) {
                // 向上滑動
                dx = 0;
                dy = -1;
                lastDirection = 'up';
            }
        }
    }
});

// 防止觸控時的預設行為
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
});

// 遊戲循環 - 動態速度
function gameLoop() {
    moveSnake();
    setTimeout(gameLoop, gameSpeed);
}

// 開始遊戲循環
gameLoop();

// 初始化遊戲
initGame();