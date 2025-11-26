// Cache for game state and quotes
const gameState = {
    currentGame: null,
    players: [],
    maxPlayers: 8
};

// Common English words for frequency analysis
const COMMON_WORDS = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HIS', 'HAS', 'HAD', 'HOW', 'MAN', 'ITS', 'WHO', 'WHEN', 'WHERE', 'WHAT', 'WHY'];

function aristocratCipher(text) {
    // Create a random substitution cipher
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let shuffled = alphabet.split('').sort(() => Math.random() - 0.5);
    
    const cipherMap = {};
    const reverseMap = {};
    
    for (let i = 0; i < alphabet.length; i++) {
        cipherMap[alphabet[i]] = shuffled[i];
        reverseMap[shuffled[i]] = alphabet[i];
    }
    
    let encrypted = '';
    for (let char of text.toUpperCase()) {
        if (alphabet.includes(char)) {
            encrypted += cipherMap[char];
        } else {
            encrypted += char;
        }
    }
    
    return {
        ciphertext: encrypted,
        mapping: cipherMap,
        solution: text.toUpperCase()
    };
}

async function getRandomQuote() {
    try {
        // Get random pages from WikiQuote
        const randomResponse = await fetch('https://en.wikiquote.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*');
        const randomData = await randomResponse.json();
        
        const pages = randomData.query.random;
        const validPages = [];
        
        // Try to get quotes from random pages
        for (const page of pages) {
            try {
                const title = encodeURIComponent(page.title);
                const quoteResponse = await fetch(`https://en.wikiquote.org/w/api.php?action=parse&page=${title}&prop=text&format=json&origin=*`);
                const quoteData = await quoteResponse.json();
                
                if (quoteData.parse && quoteData.parse.text) {
                    const text = quoteData.parse.text['*'];
                    // Extract text content (simplified)
                    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
                    
                    if (sentences.length > 0) {
                        // Find a suitable sentence (not too short, not too long)
                        const suitable = sentences.find(s => {
                            const words = s.trim().split(/\s+/);
                            return words.length >= 5 && words.length <= 15;
                        });
                        
                        if (suitable) {
                            const finalQuote = suitable.trim().replace(/\[\d+\]/g, '').substring(0, 100);
                            if (finalQuote.length >= 20) {
                                return finalQuote;
                            }
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Fallback quotes if WikiQuote fails
        const fallbackQuotes = [
            "THE ONLY TRUE WISDOM IS IN KNOWING YOU KNOW NOTHING",
            "THE UNEXAMINED LIFE IS NOT WORTH LIVING",
            "I THINK THEREFORE I AM",
            "KNOWLEDGE IS POWER",
            "TO BE OR NOT TO BE THAT IS THE QUESTION",
            "ALL THAT GLITTERS IS NOT GOLD",
            "A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP"
        ];
        
        return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        
    } catch (error) {
        console.error('Failed to fetch quote:', error);
        return "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
    }
}

function generateHint(ciphertext, mapping) {
    const words = ciphertext.split(' ');
    const possibleWords = words.filter(word => word.length <= 3 && /^[A-Z]+$/.test(word));
    
    if (possibleWords.length > 0) {
        const word = possibleWords[Math.floor(Math.random() * possibleWords.length)];
        const commonMatch = COMMON_WORDS.find(w => w.length === word.length);
        if (commonMatch) {
            return `The word "${word}" might be "${commonMatch}"`;
        }
    }
    
    // Fallback hint
    const letters = Object.keys(mapping).filter(l => Math.random() < 0.3);
    if (letters.length > 0) {
        const letter = letters[0];
        return `The letter ${mapping[letter]} represents ${letter}`;
    }
    
    return "Look for common English words and patterns";
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Handle API endpoints
    if (url.pathname.startsWith('/api/')) {
        return handleAPI(request, url);
    }
    
    // Serve static files
    return context.env.ASSETS.fetch(request);
}

async function handleAPI(request, url) {
    const path = url.pathname;
    
    if (path === '/api/game' && request.method === 'GET') {
        if (!gameState.currentGame) {
            const quote = await getRandomQuote();
            const cipher = aristocratCipher(quote);
            
            gameState.currentGame = {
                id: Date.now().toString(),
                ciphertext: cipher.ciphertext,
                solution: cipher.solution,
                mapping: cipher.mapping,
                hint: generateHint(cipher.ciphertext, cipher.mapping),
                startTime: Date.now(),
                solved: false,
                winner: null
            };
        }
        
        return new Response(JSON.stringify({
            ...gameState.currentGame,
            players: gameState.players,
            maxPlayers: gameState.maxPlayers,
            status: gameState.currentGame.solved ? 'solved' : 'active'
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    if (path === '/api/join' && request.method === 'POST') {
        const { playerName } = await request.json();
        
        if (gameState.players.length >= gameState.maxPlayers) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Game is full'
            }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        if (gameState.players.find(p => p.name === playerName)) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Name already taken'
            }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const player = {
            id: Math.random().toString(36).substr(2, 9),
            name: playerName,
            joinTime: Date.now(),
            solved: false
        };
        
        gameState.players.push(player);
        
        return new Response(JSON.stringify({
            success: true,
            message: `Player ${playerName} joined the game`,
            playerId: player.id
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    if (path === '/api/submit' && request.method === 'POST') {
        const { playerId, solution } = await request.json();
        
        if (!gameState.currentGame) {
            return new Response(JSON.stringify({
                success: false,
                message: 'No active game'
            }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Player not found'
            }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const normalizedSolution = solution.toUpperCase().trim();
        const normalizedCorrect = gameState.currentGame.solution.toUpperCase().trim();
        
        const isCorrect = normalizedSolution === normalizedCorrect;
        
        if (isCorrect && !gameState.currentGame.solved) {
            gameState.currentGame.solved = true;
            gameState.currentGame.winner = player.name;
            gameState.currentGame.solveTime = Date.now();
            player.solved = true;
        }
        
        return new Response(JSON.stringify({
            success: true,
            correct: isCorrect,
            alreadySolved: gameState.currentGame.solved && gameState.currentGame.winner !== player.name,
            winner: gameState.currentGame.winner,
            message: isCorrect ? 
                (gameState.currentGame.winner === player.name ? '🎉 Correct! You solved it first!' : 'Correct, but someone solved it faster!') :
                'Incorrect solution. Try again!'
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    if (path === '/api/newgame' && request.method === 'POST') {
        // Reset for new game
        gameState.currentGame = null;
        gameState.players = gameState.players.filter(p => p.solved);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'New game started'
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    return new Response('Not found', { status: 404 });
}
