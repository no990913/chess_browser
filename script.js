const canvas = document.getElementById('chessboard');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const moveSound = document.getElementById('moveSound');

let SQUARE_SIZE = canvas.width / 8;

const PIECE_UNICODE = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

let board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    [ '', '', '', '', '', '', '', '' ],
    [ '', '', '', '', '', '', '', '' ],
    [ '', '', '', '', '', '', '', '' ],
    [ '', '', '', '', '', '', '', '' ],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
];
let turn = 'w'; // 'w' for white (player), 'b' for black (random AI)
let dragging = false;
let dragPiece = null;
let dragStart = null;
let dragPos = null;
let validMoves = [];
let animationFrame;

// Responsive canvas
window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    let size = Math.min(window.innerWidth * 0.96, 480);
    canvas.width = canvas.height = size;
    SQUARE_SIZE = canvas.width / 8;
    drawBoard();
}
resizeCanvas();

function isWhite(piece) { return piece && piece === piece.toUpperCase(); }
function isBlack(piece) { return piece && piece.toLowerCase(); }

function drawBoard() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let y=0; y<8; y++) {
        for (let x=0; x<8; x++) {
            // Board squares
            ctx.fillStyle = (x + y) % 2 == 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(x*SQUARE_SIZE, y*SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);

            // Highlight valid moves
            if (validMoves && validMoves.some(m => m.x === x && m.y === y)) {
                ctx.fillStyle = 'rgba(80,220,120,0.5)';
                ctx.beginPath();
                ctx.arc(
                    x*SQUARE_SIZE + SQUARE_SIZE/2,
                    y*SQUARE_SIZE + SQUARE_SIZE/2,
                    SQUARE_SIZE/4, 0, Math.PI*2
                );
                ctx.fill();
            }

            // Draw pieces
            let piece = board[y][x];
            if (piece && !(dragging && dragStart && dragStart.x === x && dragStart.y === y)) {
                ctx.font = SQUARE_SIZE * 0.8 + "px serif";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isWhite(piece) ? "#222" : "#222";
                ctx.fillText(PIECE_UNICODE[piece], x*SQUARE_SIZE + SQUARE_SIZE/2, y*SQUARE_SIZE + SQUARE_SIZE/2);
            }
        }
    }
    // Draw dragging piece
    if (dragging && dragPiece && dragPos) {
        ctx.globalAlpha = 0.85;
        ctx.font = SQUARE_SIZE * 0.8 + "px serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isWhite(dragPiece) ? "#222" : "#222";
        ctx.fillText(
            PIECE_UNICODE[dragPiece],
            dragPos.x, dragPos.y
        );
        ctx.globalAlpha = 1.0;
    }
}

// Get valid moves for a piece at position (x, y)
function getValidMoves(x, y) {
    let moves = [];
    let piece = board[y][x];
    if (!piece) return moves;
    let color = isWhite(piece) ? 'w' : 'b';
    let directions, nx, ny;
    switch (piece.toUpperCase()) {
        case 'P':
            let dir = color==='w'?-1:1;
            ny = y + dir;
            // Forward
            if (ny>=0 && ny<8 && board[ny][x]==='') {
                moves.push({x:x, y:ny});
                // Double move from start
                if ((color==='w' && y==6) || (color==='b' && y==1)) {
                    let ny2 = y + 2*dir;
                    if (board[ny2][x]==='' && board[ny][x]==='') moves.push({x:x,y:ny2});
                }
            }
            // Captures
            for (let dx of [-1,1]) {
                nx = x+dx;
                if (nx>=0 && nx<8 && ny>=0 && ny<8 && board[ny][nx] && isWhite(board[ny][nx])!==isWhite(piece)) {
                    moves.push({x:nx, y:ny});
                }
            }
            break;
        case 'N':
            for (let [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) {
                nx = x+dx; ny = y+dy;
                if (nx>=0 && nx<8 && ny>=0 && ny<8 && (!board[ny][nx] || isWhite(board[ny][nx])!==isWhite(piece))) {
                    moves.push({x:nx, y:ny});
                }
            }
            break;
        case 'B':
            for (let [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                for (let i=1; i<8; i++) {
                    nx = x+dx*i; ny = y+dy*i;
                    if (nx<0||nx>=8||ny<0||ny>=8) break;
                    if (!board[ny][nx]) moves.push({x:nx,y:ny});
                    else {
                        if (isWhite(board[ny][nx])!==isWhite(piece)) moves.push({x:nx,y:ny});
                        break;
                    }
                }
            }
            break;
        case 'R':
            for (let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                for (let i=1; i<8; i++) {
                    nx = x+dx*i; ny = y+dy*i;
                    if (nx<0||nx>=8||ny<0||ny>=8) break;
                    if (!board[ny][nx]) moves.push({x:nx,y:ny});
                    else {
                        if (isWhite(board[ny][nx])!==isWhite(piece)) moves.push({x:nx,y:ny});
                        break;
                    }
                }
            }
            break;
        case 'Q':
            for (let [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]) {
                for (let i=1; i<8; i++) {
                    nx = x+dx*i; ny = y+dy*i;
                    if (nx<0||nx>=8||ny<0||ny>=8) break;
                    if (!board[ny][nx]) moves.push({x:nx,y:ny});
                    else {
                        if (isWhite(board[ny][nx])!==isWhite(piece)) moves.push({x:nx,y:ny});
                        break;
                    }
                }
            }
            break;
        case 'K':
            for (let dx=-1; dx<=1; dx++) {
                for (let dy=-1; dy<=1; dy++) {
                    if (dx===0 && dy===0) continue;
                    nx = x+dx; ny = y+dy;
                    if (nx>=0&&nx<8&&ny>=0&&ny<8&&(!board[ny][nx]||isWhite(board[ny][nx])!==isWhite(piece))) {
                        moves.push({x:nx, y:ny});
                    }
                }
            }
            break;
    }
    // Filter out moves that land on own piece
    moves = moves.filter(m => {
        let dest = board[m.y][m.x];
        if (!dest) return true;
        return isWhite(piece) !== isWhite(dest);
    });
    return moves;
}

function movePiece(fromX, fromY, toX, toY, color) {
    let piece = board[fromY][fromX];
    if (!piece) return false;
    if (color === 'w' && !isWhite(piece)) return false;
    if (color === 'b' && !isBlack(piece)) return false;
    let moves = getValidMoves(fromX, fromY);
    for (let m of moves) {
        if (m.x === toX && m.y === toY) {
            board[toY][toX] = piece;
            board[fromY][fromX] = '';
            playMoveSound();
            return true;
        }
    }
    return false;
}

// Sound
function playMoveSound() {
    moveSound.currentTime = 0;
    moveSound.play();
}

// Drag & drop (mouse)
canvas.addEventListener('mousedown', (e) => {
    if (turn !== 'w') return;
    let {x, y} = getMouseSquare(e);
    if (isWhite(board[y][x])) {
        dragging = true;
        dragPiece = board[y][x];
        dragStart = {x, y};
        dragPos = {x: x*SQUARE_SIZE + SQUARE_SIZE/2, y: y*SQUARE_SIZE + SQUARE_SIZE/2};
        validMoves = getValidMoves(x, y);
        drawBoard();
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (dragging && dragPiece) {
        let rect = canvas.getBoundingClientRect();
        dragPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        drawBoard();
    }
});
canvas.addEventListener('mouseup', (e) => {
    if (!dragging || !dragPiece) return;
    let {x, y} = getMouseSquare(e);
    if (movePiece(dragStart.x, dragStart.y, x, y, 'w')) {
        turn = 'b';
        validMoves = [];
        dragging = false;
        dragPiece = null;
        dragStart = null;
        dragPos = null;
        drawBoard();
        setTimeout(randomBlackMove, 600);
    } else {
        dragging = false;
        dragPiece = null;
        dragStart = null;
        dragPos = null;
        validMoves = [];
        drawBoard();
    }
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    if (turn !== 'w') return;
    e.preventDefault();
    let {x, y} = getTouchSquare(e.touches[0]);
    if (isWhite(board[y][x])) {
        dragging = true;
        dragPiece = board[y][x];
        dragStart = {x, y};
        dragPos = {x: x*SQUARE_SIZE + SQUARE_SIZE/2, y: y*SQUARE_SIZE + SQUARE_SIZE/2};
        validMoves = getValidMoves(x, y);
        drawBoard();
    }
});
canvas.addEventListener('touchmove', (e) => {
    if (dragging && dragPiece) {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let t = e.touches[0];
        dragPos = {
            x: t.clientX - rect.left,
            y: t.clientY - rect.top
        };
        drawBoard();
    }
});
canvas.addEventListener('touchend', (e) => {
    if (!dragging || !dragPiece) return;
    e.preventDefault();
    let {x, y} = getTouchSquare(e.changedTouches[0]);
    if (movePiece(dragStart.x, dragStart.y, x, y, 'w')) {
        turn = 'b';
        validMoves = [];
        dragging = false;
        dragPiece = null;
        dragStart = null;
        dragPos = null;
        drawBoard();
        setTimeout(randomBlackMove, 600);
    } else {
        dragging = false;
        dragPiece = null;
        dragStart = null;
        dragPos = null;
        validMoves = [];
        drawBoard();
    }
});

function getMouseSquare(e) {
    let rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;
    let x = Math.floor(mx / SQUARE_SIZE);
    let y = Math.floor(my / SQUARE_SIZE);
    return {x, y};
}
function getTouchSquare(touch) {
    let rect = canvas.getBoundingClientRect();
    let mx = touch.clientX - rect.left;
    let my = touch.clientY - rect.top;
    let x = Math.floor(mx / SQUARE_SIZE);
    let y = Math.floor(my / SQUARE_SIZE);
    return {x, y};
}

function randomBlackMove() {
    let moves = [];
    for (let y=0; y<8; y++) {
        for (let x=0; x<8; x++) {
            let piece = board[y][x];
            if (isBlack(piece)) {
                let pieceMoves = getValidMoves(x, y);
                for (let m of pieceMoves) {
                    moves.push({fromX:x,fromY:y,toX:m.x,toY:m.y});
                }
            }
        }
    }
    if (moves.length === 0) {
        info.textContent = "Game over: White wins! (Black has no moves)";
        return;
    }
    let move = moves[Math.floor(Math.random()*moves.length)];
    movePiece(move.fromX, move.fromY, move.toX, move.toY, 'b');
    turn = 'w';
    drawBoard();
    info.textContent = '';
}

drawBoard();