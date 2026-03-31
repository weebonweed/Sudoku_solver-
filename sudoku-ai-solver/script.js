/**
 * SUDOKU AI SOLVER - FULL INTEGRATED ENGINE
 * Features: Puzzle Generation, OpenCV.js Grid Detection, MRV Backtracking
 */

// --- STATE MANAGEMENT ---
let originalBoard = Array(9).fill(null).map(() => Array(9).fill(0));
let currentBoard = Array(9).fill(null).map(() => Array(9).fill(0));
let isSolving = false;
let isCorrectionMode = false;
let timerInterval = null;
let secondsElapsed = 0;

const gridContainer = document.getElementById('sudoku-grid');
const inputs = []; 

// --- INITIALIZATION ---
function initBoard() {
    gridContainer.innerHTML = '';
    inputs.length = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = 1;
            input.className = 'cell';
            input.dataset.row = r;
            input.dataset.col = c;

            // Add bold borders for 3x3 visibility
            if (r === 2 || r === 5) input.classList.add(`row-${r + 1}`);

            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeyDown);
            
            input.readOnly = true
            gridContainer.appendChild(input);
            inputs.push(input);
        }
    }
}

// --- INPUT & NAVIGATION ---
function handleInput(e) {
    if (isSolving) return;
    const input = e.target;
    let val = input.value;
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);

    if (!/^[1-9]$/.test(val)) {
        input.value = '';
        currentBoard[r][c] = 0;
        if (isCorrectionMode) originalBoard[r][c] = 0;
    } else {
        currentBoard[r][c] = parseInt(val);
        if (isCorrectionMode) originalBoard[r][c] = parseInt(val);
    }
    clearInvalidHighlights();
}

function handleKeyDown(e) {
    if (isSolving) return;
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);

    const keys = {
        'ArrowUp': (r > 0) ? (r - 1) * 9 + c : null,
        'ArrowDown': (r < 8) ? (r + 1) * 9 + c : null,
        'ArrowLeft': (c > 0) ? r * 9 + (c - 1) : null,
        'ArrowRight': (c < 8) ? r * 9 + (c + 1) : null
    };

    if (keys[e.key] !== null) {
        inputs[keys[e.key]].focus();
        e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        currentBoard[r][c] = 0;
        if (isCorrectionMode) originalBoard[r][c] = 0;
        clearInvalidHighlights();
    }
}

// --- RENDERING ---
function renderBoard() {
    const gridEl = document.getElementById('sudoku-grid');
    
    // Add 'locked' class visually when rendering a new puzzle
    gridEl.classList.add('locked');

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const input = inputs[r * 9 + c];
            const val = currentBoard[r][c];
            input.value = val === 0 ? '' : val;

            if (originalBoard[r][c] !== 0) {
                input.classList.add('original');
                input.readOnly = true; // Permanent lock for clues
            } else {
                input.classList.remove('original');
                input.readOnly = true; // <--- CHANGE THIS TO TRUE (Locks empty boxes)
            }
        }
    }
}
function updateCellDOM(r, c, val, stateClass) {
    const input = inputs[r * 9 + c];
    input.value = val === 0 ? '' : val;
    input.className = 'cell';
    if (r === 2 || r === 5) input.classList.add(`row-${r + 1}`);
    if (originalBoard[r][c] !== 0) input.classList.add('original');
    if (stateClass) input.classList.add(stateClass);
}

// --- PUZZLE GENERATION LOGIC ---
async function generatePuzzle(difficulty = 'medium') {
    setUILocked(true);
    showToast(`Generating ${difficulty} puzzle...`, 'info');
    
    // Reset state
    currentBoard = Array(9).fill(0).map(() => Array(9).fill(0));
    originalBoard = Array(9).fill(0).map(() => Array(9).fill(0));
    
    // 1. Fill diagonal 3x3 boxes (independent, prevents conflicts)
    for (let i = 0; i < 9; i += 3) {
        fillBox(i, i);
    }
    
    // 2. Solve the rest of the board silently
    await solveSudoku(currentBoard, false);
    
    // 3. Poke holes based on difficulty
    const holes = { 'easy': 30, 'medium': 50, 'hard': 60 }[difficulty];
    pokeHoles(holes);
    
    // 4. Set as the new original board
    originalBoard = JSON.parse(JSON.stringify(currentBoard));
    isCorrectionMode = false;
    renderBoard();
    
    setUILocked(false);
    showToast('New Puzzle Ready!', 'success');
}

function fillBox(row, col) {
    let num;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            do {
                num = Math.floor(Math.random() * 9) + 1;
            } while (!isSafeInBox(row, col, num));
            currentBoard[row + i][col + j] = num;
        }
    }
}

function isSafeInBox(rowStart, colStart, num) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (currentBoard[rowStart + i][colStart + j] === num) return false;
        }
    }
    return true;
}

function pokeHoles(count) {
    while (count > 0) {
        let cell = Math.floor(Math.random() * 81);
        let r = Math.floor(cell / 9);
        let c = cell % 9;
        if (currentBoard[r][c] !== 0) {
            currentBoard[r][c] = 0;
            count--;
        }
    }
}

// --- SOLVER & HEURISTICS ---
function getCandidates(board, row, col) {
    const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 0; i < 9; i++) {
        candidates.delete(board[row][i]);
        candidates.delete(board[i][col]);
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            candidates.delete(board[startRow + r][startCol + c]);
        }
    }
    return Array.from(candidates);
}

function findBestEmptyCell(board) {
    let bestCell = null;
    let minCandidates = 10;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                const candidates = getCandidates(board, r, c);
                if (candidates.length < minCandidates) {
                    minCandidates = candidates.length;
                    bestCell = [r, c, candidates];
                }
                if (minCandidates === 1) return bestCell;
            }
        }
    }
    return bestCell;
}

async function solveSudoku(board, visualize = false) {
    const cellData = findBestEmptyCell(board);
    if (!cellData) return true;

    const [row, col, candidates] = cellData;

    // Shuffle candidates for variety in generation
    if (!visualize) candidates.sort(() => Math.random() - 0.5);

    for (let num of candidates) {
        board[row][col] = num;
        if (visualize) {
            updateCellDOM(row, col, num, 'solving');
            await new Promise(r => setTimeout(r, 20));
        }

        if (await solveSudoku(board, visualize)) return true;

        board[row][col] = 0;
        if (visualize) {
            updateCellDOM(row, col, 0, 'invalid');
            await new Promise(r => setTimeout(r, 10));
        }
    }
    return false;
}

function validateManualInput() {
    clearInvalidHighlights(); // Remove old red highlights
    let errorsFound = 0;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = currentBoard[r][c];
            
            // Only validate cells that aren't empty
            if (val !== 0) {
                // Temporarily remove the number to see if it's "Safe" to put there
                currentBoard[r][c] = 0;
                
                const candidates = getCandidates(currentBoard, r, c);
                
                // If the number you typed isn't in the list of "allowed" numbers
                if (!candidates.includes(val)) {
                    inputs[r * 9 + c].classList.add('invalid');
                    errorsFound++;
                }
                
                // Put the number back
                currentBoard[r][c] = val;
            }
        }
    }

    if (errorsFound > 0) {
        showToast(`Found ${errorsFound} mistake(s). Check the red cells!`, 'error');
    } else {
        const isComplete = currentBoard.every(row => row.every(cell => cell !== 0));
        if (isComplete) {
            stopTimer();
            showToast('Perfect! You solved it!', 'success');
        } else {
            showToast('Everything looks correct so far. Keep going!', 'success');
        }
    }
}


function clearInvalidHighlights() {
    inputs.forEach(input => input.classList.remove('invalid', 'solving'));
}

// --- OPENCV.JS IMAGE ENGINE ---
class ImageRecognitionEngine {
    static async process(imageSrc) {
        if (typeof cv === 'undefined' || !cv.Mat) throw new Error("OpenCV.js loading...");
        return this._runPipeline(imageSrc);
    }

    static async _runPipeline(imageSrc) {
        const img = await this._loadImage(imageSrc);
        let src = cv.imread(img);
        let gray = new cv.Mat(), thresh = new cv.Mat();
        
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

        let contours = new cv.MatVector(), hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let biggest = null, maxArea = 0;
        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i), area = cv.contourArea(cnt);
            if (area > 1000) {
                let approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.02 * cv.arcLength(cnt, true), true);
                if (approx.rows === 4 && area > maxArea) {
                    biggest = approx; maxArea = area;
                }
            }
        }

        if (!biggest) {
            this._cleanup([src, gray, thresh, contours, hierarchy]);
            throw new Error('GRID_NOT_FOUND');
        }

        const warped = this._warpHelper(src, biggest);
        const resultBoard = await this._extractDigits(warped);
        this._cleanup([src, gray, thresh, contours, hierarchy, biggest, warped]);
        return resultBoard;
    }

    static _warpHelper(src, biggest) {
        let pts = [];
        for (let i = 0; i < 4; i++) pts.push({ x: biggest.data32S[i * 2], y: biggest.data32S[i * 2 + 1] });
        pts.sort((a, b) => a.y - b.y);
        let top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
        let bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
        
        let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [top[0].x, top[0].y, top[1].x, top[1].y, bottom[1].x, bottom[1].y, bottom[0].x, bottom[0].y]);
        let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 450, 0, 450, 450, 0, 450]);
        let M = cv.getPerspectiveTransform(srcCoords, dstCoords), warped = new cv.Mat();
        cv.warpPerspective(src, warped, M, new cv.Size(450, 450));
        srcCoords.delete(); dstCoords.delete(); M.delete();
        return warped;
    }

    static async _extractDigits(warped) {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({ tessedit_char_whitelist: '123456789', tessedit_pageseg_mode: '10' });

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 50;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                let rect = new cv.Rect(c * 50 + 6, r * 50 + 6, 38, 38);
                let cellMat = warped.roi(rect);
                cv.imshow(canvas, cellMat);
                const { data: { text } } = await worker.recognize(canvas);
                const digit = parseInt(text.trim());
                if (!isNaN(digit)) board[r][c] = digit;
                cellMat.delete();
            }
        }
        await worker.terminate();
        return board;
    }

    static _loadImage(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; }); }
    static _cleanup(mats) { mats.forEach(m => { if (m) m.delete(); }); }
}

// --- BUTTON HANDLERS ---
// --- PASTE THIS NEW FUNCTION ---
function toggleBoardLock(isLocked) {
    inputs.forEach((input, index) => {
        const r = Math.floor(index / 9);
        const c = index % 9;
        
        // If it's a blank space, unlock it only if isLocked is false
        if (originalBoard[r][c] === 0) {
            input.readOnly = isLocked;
        }
    });

    // Disable New Game/Scan while playing to prevent accidental resets
    document.getElementById('btn-generate').disabled = !isLocked;
    const uploadBtn = document.getElementById('image-upload').parentElement;
    if (uploadBtn) uploadBtn.style.opacity = isLocked ? "1" : "0.5";
}

function startTimer(reset = false) {
    if (reset) {
        stopTimer();
        secondsElapsed = 0;
        document.getElementById('timer-display').textContent = "00:00";
    }
    
    // If timer is already running, don't start another one
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (secondsElapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').textContent = `${mins}:${secs}`;
    }, 1000);
}


function stopTimer() { if (timerInterval) clearInterval(timerInterval); }

function saveGame() {
    localStorage.setItem('sudoku_save', JSON.stringify({
        currentBoard, originalBoard, secondsElapsed
    }));
    showToast('Progress Saved!', 'success');
}

function loadGame() {
    const saved = localStorage.getItem('sudoku_save');
    if (!saved) return showToast('No save found', 'error');
    const data = JSON.parse(saved);
    currentBoard = data.currentBoard;
    originalBoard = data.originalBoard;
    secondsElapsed = data.secondsElapsed;
    renderBoard();
    startTimer();
    showToast('Loaded!', 'success');
}

function handleSolveClick() {
    // 1. Create a "Snapshot" of the board as it looks right now (with your numbers)
    const boardToSolve = JSON.parse(JSON.stringify(currentBoard));

    // 2. Try to solve starting from your current progress
    if (solveSudoku(boardToSolve)) {
        currentBoard = boardToSolve; // Update the game with the AI's solution
        
        stopTimer(); // Stop the clock since the game is over
        renderBoard(); // Draw the new numbers on the screen
        
        // 3. Lock everything so the user can't edit the AI's solution
        inputs.forEach(input => input.readOnly = true);
        
        showToast("AI has completed the puzzle!", "success");
    } else {
        // 4. This runs if your manual entries made the puzzle logically impossible
        showToast("Cannot solve! You have a mistake in your entries.", "error");
        
        // Optional: Trigger your validation function to show them where the error is
        validateManualInput(); 
    }
}

async function processConfirmedImage() {
    const previewImg = document.getElementById('preview-image').src;
    document.getElementById('image-preview-modal').classList.add('hidden');
    setUILocked(true);
    showToast('Scanning Sudoku...', 'info');
    try {
        const newBoard = await ImageRecognitionEngine.process(previewImg);
        currentBoard = newBoard;
        originalBoard = JSON.parse(JSON.stringify(newBoard));
        isCorrectionMode = true; 
        renderBoard();
        showToast('Success! Review and solve.', 'success');
    } catch (err) {
        showToast('Grid not found. Try a clearer photo.', 'error');
    }
    setUILocked(false);
}

function setUILocked(locked) {
    isSolving = locked;
    document.querySelectorAll('.btn').forEach(el => el.disabled = locked);
}

function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type} show`;
    t.innerHTML = msg;
    document.getElementById('notification-area').appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 3000);
}



// --- BOOTSTRAP ---
// --- BOOTSTRAP & EVENT LISTENERS ---
window.addEventListener('DOMContentLoaded', () => {
    initBoard();

    // 1. Generate Button
    document.getElementById('btn-generate').addEventListener('click', () => generatePuzzle('medium'));

    // 2. Solve Button
    document.getElementById('btn-solve').addEventListener('click', handleSolveClick);

    // 3. Image Upload (The Hidden Input)
    const imageUpload = document.getElementById('image-upload');
    const previewModal = document.getElementById('image-preview-modal');
    const previewImage = document.getElementById('preview-image');

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImage.src = event.target.result;
                previewModal.classList.remove('hidden'); // Show the modal
            };
            reader.readAsDataURL(file);
        }
    });

    // 4. Confirm Scan (The button inside the modal)
    document.getElementById('btn-confirm-upload').addEventListener('click', processConfirmedImage);
});
window.addEventListener('DOMContentLoaded', () => {
    initBoard();
    
    // Updated Generate with Timer
    document.getElementById('btn-generate').addEventListener('click', () => {
        const diff = document.getElementById('difficulty-level').value;
        generatePuzzle(diff);
        startTimer();
    });

    document.getElementById('btn-solve').addEventListener('click', () => {
        stopTimer();
        handleSolveClick();
    });

    // New Control Listeners
    document.getElementById('btn-validate').addEventListener('click', validateManualInput);
    document.getElementById('btn-save').addEventListener('click', saveGame);
    document.getElementById('btn-load').addEventListener('click', loadGame);
    
    // Keep your existing image upload listeners below...
    // Inside window.addEventListener('DOMContentLoaded', ...)
    
});
// --- REPLACE THESE LISTENERS AT THE BOTTOM ---
window.addEventListener('DOMContentLoaded', () => {
    initBoard();

    // Generate Puzzle (Locks the board after creating)
    document.getElementById('btn-generate').addEventListener('click', () => {
    const diff = document.getElementById('difficulty-level').value;
    generatePuzzle(diff);
    
    // Reset the Start Button so it can be clicked again
    const startBtn = document.getElementById('btn-start-timer');
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Clock & Unlock';
    
    stopTimer();
    document.getElementById('timer-display').textContent = "00:00";
});

    // Start Clock Button (Unlocks the board)
    document.getElementById('btn-start-timer').addEventListener('click', () => {
    const isBoardEmpty = currentBoard.flat().every(cell => cell === 0);
    if (isBoardEmpty) {
        showToast("Generate or Scan a puzzle first!", "error");
        return;
    }

    // 1. Start Clock
    startTimer(false); 

    // 2. Visual Unlock
    document.getElementById('sudoku-grid').classList.remove('locked');

    // 3. Functional Unlock: Only unlock cells that are NOT part of the original clues
    inputs.forEach((input, index) => {
        const r = Math.floor(index / 9);
        const c = index % 9;
        if (originalBoard[r][c] === 0) {
            input.readOnly = false; // <--- THIS UNLOCKS THE PLAYER BOXES
        }
    });

    // 4. Update Button State
    const startBtn = document.getElementById('btn-start-timer');
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-lock-open"></i> Playing...';
    document.getElementById('btn-pause-timer').disabled = false;
});
// --- PART B: PAUSE & HIDE LISTENER ---
const pauseBtn = document.getElementById('btn-pause-timer');
const gridEl = document.getElementById('sudoku-grid');

pauseBtn.addEventListener('click', () => {
    // Check if we are currently "Playing" or "Paused" based on button text
    const isPaused = pauseBtn.innerHTML.includes("Resume");

    if (!isPaused) {
        // --- ACTION: PAUSE ---
        stopTimer();
        gridEl.classList.add('blur-board'); // Apply the CSS blur
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        showToast("Game Paused - Board Hidden", "info");
    } else {
        // --- ACTION: RESUME ---
        startTimer(false); // Resume clock without resetting to zero
        gridEl.classList.remove('blur-board'); // Remove the CSS blur
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        showToast("Game Resumed", "success");
    }
});
    // ... (Keep your Solve, Validate, Save, Load, and Image listeners)
});
