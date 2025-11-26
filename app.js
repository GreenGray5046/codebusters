let currentPlayer = null;
let gameInterval = null;

// Load game state on startup
loadGameState();

async function loadGameState() {
    try {
        const response = await fetch('/api/game');
        const game = await response.json();
        
        document.getElementById('ciphertext').textContent = game.ciphertext;
        document.getElementById('hint').textContent = `💡 Hint: ${game.hint}`;
        document.getElementById('playerCount').textContent = game.players.length;
        
        updatePlayersList(game.players);
        updateGameStatus(game);
        
        // Show/hide game section based on player status
        if (currentPlayer) {
            const playerInGame = game.players.find(p => p.id === currentPlayer.id);
            if (!playerInGame) {
                // Player was removed (probably new game)
                currentPlayer = null;
                document.getElementById('gameSection').classList.add('hidden');
                document.getElementById('playerName').disabled = false;
                document.querySelector('.join-section button').disabled = false;
            }
        }
        
    } catch (error) {
        console.error('Failed to load game:', error);
        document.getElementById('ciphertext').textContent = 'Error loading game. Please refresh.';
    }
}

function updatePlayersList(players) {
    const container = document.getElementById('players-list');
    
    if (players.length === 0) {
        container.innerHTML = '<p>No players yet. Be the first to join!</p>';
        return;
    }
    
    container.innerHTML = players.map(player => `
        <div class="player-item ${player.solved ? 'solved' : ''}">
            <span class="player-name">${player.name}</span>
            ${player.solved ? '<span class="winner-badge">🎉 Winner!</span>' : ''}
        </div>
    `).join('');
}

function updateGameStatus(game) {
    const statusDiv = document.getElementById('gameStatus');
    
    if (game.solved) {
        statusDiv.innerHTML = `
            <div class="solved-status">
                🏆 Solved by: <strong>${game.winner}</strong>
            </div>
        `;
        statusDiv.className = 'game-status solved';
    } else {
        statusDiv.innerHTML = `
            <div class="active-status">
                ⏱️ Game active - First to solve wins!
            </div>
        `;
        statusDiv.className = 'game-status active';
    }
}

async function joinGame() {
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    if (playerName.length < 2 || playerName.length > 20) {
        alert('Name must be between 2 and 20 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentPlayer = { id: result.playerId, name: playerName };
            document.getElementById('gameSection').classList.remove('hidden');
            document.getElementById('playerName').disabled = true;
            document.querySelector('.join-section button').disabled = true;
            document.getElementById('playerName').value = playerName;
            loadGameState();
            
            // Start auto-refresh
            if (!gameInterval) {
                gameInterval = setInterval(loadGameState, 3000);
            }
        } else {
            alert(result.message);
        }
        
    } catch (error) {
        console.error('Failed to join game:', error);
        alert('Failed to join game. Please try again.');
    }
}

async function submitSolution() {
    if (!currentPlayer) return;
    
    const solution = document.getElementById('solution').value.trim();
    
    if (!solution) {
        alert('Please enter your solution');
        return;
    }
    
    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                playerId: currentPlayer.id, 
                solution: solution 
            })
        });
        
        const result = await response.json();
        const resultDiv = document.getElementById('result');
        
        if (result.correct) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    ${result.message}
                </div>
            `;
            resultDiv.className = 'result success';
            
            if (result.winner === currentPlayer.name) {
                // Celebrate winner!
                setTimeout(() => {
                    loadGameState();
                }, 2000);
            }
        } else {
            resultDiv.innerHTML = `
                <div class="error-message">
                    ${result.message}
                </div>
            `;
            resultDiv.className = 'result error';
        }
        
        // Refresh game state to show updates
        setTimeout(loadGameState, 1000);
        
    } catch (error) {
        console.error('Failed to submit solution:', error);
        alert('Failed to submit solution. Please try again.');
    }
}

async function newGame() {
    if (!confirm('Start a new game with a new random quote? Current players will be reset.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/newgame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reset player state
            currentPlayer = null;
            document.getElementById('gameSection').classList.add('hidden');
            document.getElementById('playerName').disabled = false;
            document.querySelector('.join-section button').disabled = false;
            document.getElementById('solution').value = '';
            document.getElementById('result').innerHTML = '';
            
            loadGameState();
        }
        
    } catch (error) {
        console.error('Failed to start new game:', error);
        alert('Failed to start new game. Please try again.');
    }
}

// Auto-refresh game state every 5 seconds if player is in game
setInterval(() => {
    if (currentPlayer) {
        loadGameState();
    }
}, 5000);