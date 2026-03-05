// --- STATE MANAGEMENT ---
let originalBoard = Array(9).fill(null).map(() => Array(9).fill(0));
let currentBoard = Array(9).fill(null).map(() => Array(9).fill(0));
let isSolving = false;
let isCorrectionMode = false;

// DOM Elements
const gridContainer = document.getElementById('sudoku-grid');
const inputs = []; // Flat array of all input elements 0-80

// --- INITIALIZATION ---
function initBoard() {
    gridContainer.innerHTML = '';
    inputs.length = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const input = document.createElement('input');
            input.type = 'text';
            // Use generic input pattern but strictly manage via JS
            input.inputMode = 'numeric';
            input.maxLength = 1;
            input.className = 'cell';
            input.dataset.row = r;
            input.dataset.col = c;

            // Add grid classes for 3x3 horizontal borders
            if (r === 2 || r === 5) {
                input.classList.add(`row-${r + 1}`);
            }

            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeyDown);

            gridContainer.appendChild(input);
            inputs.push(input);
        }
    }
}

// --- INPUT SANITIZATION ---
function handleInput(e) {
    if (isSolving) {
        e.preventDefault();
        return;
    }

    const input = e.target;
    let val = input.value;
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);

    // Sanitize: allow only 1-9
    if (!/^[1-9]$/.test(val)) {
        input.value = '';
        currentBoard[r][c] = 0;
        if (isCorrectionMode) originalBoard[r][c] = 0;
    } else {
        currentBoard[r][c] = parseInt(val);
        if (isCorrectionMode) originalBoard[r][c] = parseInt(val);
    }

    // Clear invalid highlights when user edits
    clearInvalidHighlights();
}

function handleKeyDown(e) {
    if (isSolving) return;

    const input = e.target;
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);

    // Arrow key navigation
    if (e.key === 'ArrowUp' && r > 0) {
        inputs[(r - 1) * 9 + c].focus();
        e.preventDefault();
    } else if (e.key === 'ArrowDown' && r < 8) {
        inputs[(r + 1) * 9 + c].focus();
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' && c > 0) {
        inputs[r * 9 + (c - 1)].focus();
        e.preventDefault();
    } else if (e.key === 'ArrowRight' && c < 8) {
        inputs[r * 9 + (c + 1)].focus();
        e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        input.value = '';
        currentBoard[r][c] = 0;
        if (isCorrectionMode) originalBoard[r][c] = 0;
        clearInvalidHighlights();
    }
}

// --- RENDERING ---
function renderBoard() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const input = inputs[r * 9 + c];
            const val = currentBoard[r][c];

            input.value = val === 0 ? '' : val;

            // Manage locked state
            if (originalBoard[r][c] !== 0) {
                input.classList.add('original');
                input.readOnly = isCorrectionMode ? false : true;
            } else {
                input.classList.remove('original');
                input.readOnly = false;
            }
        }
    }
}

function updateCellDOM(r, c, val, stateClass) {
    const input = inputs[r * 9 + c];
    input.value = val === 0 ? '' : val;
    input.className = 'cell'; // reset classes

    // Restore layout classes
    if (r === 2 || r === 5) input.classList.add(`row-${r + 1}`);
    if (originalBoard[r][c] !== 0) input.classList.add('original');

    // Add visual state class (solving, invalid, etc.)
    if (stateClass) {
        input.classList.add(stateClass);
    }
}

// --- VALIDATION ENGINE ---
function isRowValid(board, row, num) {
    for (let c = 0; c < 9; c++) {
        if (board[row][c] === num) return false;
    }
    return true;
}

function isColumnValid(board, col, num) {
    for (let r = 0; r < 9; r++) {
        if (board[r][col] === num) return false;
    }
    return true;
}

function isBoxValid(board, row, col, num) {
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

function isValidPlacement(board, row, col, num) {
    // Check locally before placing to handle existing duplicates correctly
    const temp = board[row][col];
    board[row][col] = 0; // Temp clear

    const valid = isRowValid(board, row, num) &&
        isColumnValid(board, col, num) &&
        isBoxValid(board, row, col, num);

    board[row][col] = temp; // Restore
    return valid;
}

function isBoardValid(board) {
    let isValid = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const num = board[r][c];
            if (num !== 0) {
                if (!isValidPlacement(board, r, c, num)) {
                    isValid = false;
                    inputs[r * 9 + c].classList.add('invalid');
                }
            }
        }
    }
    return isValid;
}

function clearInvalidHighlights() {
    inputs.forEach(input => input.classList.remove('invalid', 'solving'));
}

// --- SUDOKU SOLVER ENGINE ---
function findEmptyCell(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                return [r, c];
            }
        }
    }
    return null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function solveSudoku(board, visualize = false) {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) return true; // Solved

    const [row, col] = emptyCell;

    for (let num = 1; num <= 9; num++) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;

            if (visualize) {
                updateCellDOM(row, col, num, 'solving');
                // Create async delay for AI-like visualization
                await sleep(40);
            }

            if (await solveSudoku(board, visualize)) {
                if (visualize) {
                    // Lock visuals back to standard upon completion trackback
                    updateCellDOM(row, col, num, '');
                }
                return true;
            }

            // Backtrack
            board[row][col] = 0;
            if (visualize) {
                updateCellDOM(row, col, 0, 'invalid');
                await sleep(20);
                updateCellDOM(row, col, 0, '');
            }
        }
    }
    return false; // Trigger backtrack
}

// Fast synchronous solver for puzzle generation
function solveSudokuFast(board) {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) return true;

    const [row, col] = emptyCell;

    for (let num = 1; num <= 9; num++) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudokuFast(board)) return true;
            board[row][col] = 0;
        }
    }
    return false; // Trigger backtrack
}

// --- PUZZLE GENERATOR ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function fillBox(board, rowStart, colStart) {
    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(nums);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            board[rowStart + r][colStart + c] = nums[idx++];
        }
    }
}

function removeKDigits(board, count) {
    while (count > 0) {
        let cellId = Math.floor(Math.random() * 81);
        let row = Math.floor(cellId / 9);
        let col = cellId % 9;

        if (board[row][col] !== 0) {
            board[row][col] = 0;
            count--;
        }
    }
}

function generatePuzzle(difficulty) {
    // 1. Clear board
    currentBoard = Array(9).fill(null).map(() => Array(9).fill(0));

    // 2. Fill diagonal 3x3 boxes (no collision possible)
    for (let i = 0; i < 9; i += 3) {
        fillBox(currentBoard, i, i);
    }

    // 3. Solve the rest to output a valid board
    solveSudokuFast(currentBoard);

    // 4. Punch holes based on difficulty
    let cellsToRemove = 40; // Default medium
    if (difficulty === 'easy') cellsToRemove = 30;
    else if (difficulty === 'hard') cellsToRemove = 55;

    removeKDigits(currentBoard, cellsToRemove);

    // 5. Commit state
    originalBoard = JSON.parse(JSON.stringify(currentBoard));
    isCorrectionMode = false;
    renderBoard();

    const capDiff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    showToast(`Generated a ${capDiff} puzzle!`, 'success');
}

// --- PERSISTENCE LAYER ---
function saveBoard() {
    if (isSolving) return;

    const data = {
        originalBoard,
        currentBoard,
        timestamp: new Date().getTime(),
        difficulty: document.getElementById('select-difficulty').value
    };
    localStorage.setItem('sudokuPuzzleApp', JSON.stringify(data));
    showToast('Progress saved successfully!', 'success');
}

function loadBoard() {
    if (isSolving) return false;

    const saveData = localStorage.getItem('sudokuPuzzleApp');
    if (saveData) {
        try {
            const data = JSON.parse(saveData);
            originalBoard = data.originalBoard;
            currentBoard = data.currentBoard;
            if (data.difficulty) {
                document.getElementById('select-difficulty').value = data.difficulty;
            }
            isCorrectionMode = false;
            clearInvalidHighlights();
            renderBoard();
            showToast('Progress loaded!', 'success');
            return true;
        } catch (e) {
            console.error('Failed to parse save', e);
        }
    }
    showToast('No saved progress found.', 'error');
    return false;
}

function clearSavedBoard() {
    localStorage.removeItem('sudokuPuzzleApp');
}

// --- USER ACTION HANDLERS ---
async function handleSolveClick() {
    clearInvalidHighlights();

    if (isCorrectionMode) {
        isCorrectionMode = false;
        renderBoard(); // Locks the original cells
    }

    const isEmpty = currentBoard.every(row => row.every(cell => cell === 0));
    if (isEmpty) {
        showToast('Board is empty. Generate a puzzle first.', 'error');
        return;
    }

    if (!findEmptyCell(currentBoard) && isBoardValid(currentBoard)) {
        showToast('Puzzle already solved!', 'info');
        return;
    }

    if (!isBoardValid(currentBoard)) {
        showToast('Invalid entries found. Fix them before solving.', 'error');
        return;
    }

    setUILocked(true);
    showToast('AI Model Solving...', 'info');

    const boardCopy = JSON.parse(JSON.stringify(currentBoard));
    const isSolvable = await solveSudoku(boardCopy, true);

    if (isSolvable) {
        currentBoard = boardCopy;
        renderBoard();
        showToast('Puzzle solved successfully!', 'success');
    } else {
        showToast('This puzzle has no valid solution.', 'error');
    }

    setUILocked(false);
}

function handleValidateClick() {
    clearInvalidHighlights();

    const isEmpty = currentBoard.every(row => row.every(cell => cell === 0));
    if (isEmpty) {
        showToast('Board is empty. Nothing to validate.', 'error');
        return;
    }

    const isValid = isBoardValid(currentBoard);
    if (isValid) {
        showToast('Visual state is valid. Good job so far!', 'success');
    } else {
        showToast('Invalid entries found in the red cells.', 'error');
    }
}

function handleGenerateClick() {
    const difficulty = document.getElementById('select-difficulty').value;
    generatePuzzle(difficulty);
    clearInvalidHighlights();
}

function handleResetClick() {
    currentBoard = JSON.parse(JSON.stringify(originalBoard));
    clearInvalidHighlights();
    renderBoard();
    showToast('Board reset to original state.', 'info');
}

function handleClearClick() {
    originalBoard = Array(9).fill(null).map(() => Array(9).fill(0));
    currentBoard = Array(9).fill(null).map(() => Array(9).fill(0));
    isCorrectionMode = false;
    clearInvalidHighlights();
    renderBoard();
    showToast('Board cleared!', 'info');
}

function setUILocked(locked) {
    isSolving = locked;
    document.querySelectorAll('.ui-interactive').forEach(el => el.disabled = locked);
    document.querySelectorAll('.cell').forEach(cell => {
        if (!cell.classList.contains('original')) {
            cell.readOnly = locked;
        }
    });
}

// --- UI FEEDBACK (TOASTS) ---
function showToast(message, type = 'info') {
    const d = document.createElement('div');
    d.className = `toast ${type}`;
    d.innerHTML = message;

    const area = document.getElementById('notification-area');
    area.appendChild(d);

    // Force reflow for animation
    void d.offsetWidth;
    d.classList.add('show');

    setTimeout(() => {
        d.classList.remove('show');
        d.addEventListener('transitionend', () => {
            if (area.contains(d)) area.removeChild(d);
        });
    }, 3500);
}

// --- BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', () => {
    initBoard();

    // Bind Controls
    document.getElementById('btn-solve').addEventListener('click', handleSolveClick);
    document.getElementById('btn-validate').addEventListener('click', handleValidateClick);
    document.getElementById('btn-generate').addEventListener('click', handleGenerateClick);
    document.getElementById('btn-reset').addEventListener('click', handleResetClick);
    document.getElementById('btn-clear').addEventListener('click', handleClearClick);
    document.getElementById('btn-save').addEventListener('click', saveBoard);
    document.getElementById('btn-load').addEventListener('click', loadBoard);

    // Auto load progress
    const saveData = localStorage.getItem('sudokuPuzzleApp');
    if (saveData) {
        loadBoard();
    }

    // Image Upload Feature
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('btn-cancel-upload').addEventListener('click', closeImagePreview);
    document.getElementById('btn-confirm-upload').addEventListener('click', processConfirmedImage);
});

// --- IMAGE RECOGNITION MODULE ---
let currentUploadedImage = null;

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        showToast('Invalid image format. Please upload PNG or JPG.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        currentUploadedImage = event.target.result;
        document.getElementById('preview-image').src = currentUploadedImage;
        document.getElementById('image-preview-modal').classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // clear input to allow re-uploading the same file if needed
    e.target.value = '';
}

function closeImagePreview() {
    document.getElementById('image-preview-modal').classList.add('hidden');
    currentUploadedImage = null;
}

async function processConfirmedImage() {
    if (!currentUploadedImage) return;

    closeImagePreview();
    setUILocked(true);
    showToast('Processing image... Please wait.', 'info');

    try {
        const startTime = Date.now();
        const newBoard = await ImageRecognitionEngine.process(currentUploadedImage);

        const isEmpty = newBoard.every(row => row.every(cell => cell === 0));
        if (isEmpty) {
            showToast('Unable to detect Sudoku grid or numbers.', 'error');
        } else {
            currentBoard = newBoard;
            originalBoard = JSON.parse(JSON.stringify(newBoard));
            isCorrectionMode = true; // Enter Correction Mode
            clearInvalidHighlights();
            renderBoard();
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
            showToast(`Puzzle extracted in ${timeTaken}s! Check for OCR mistakes.`, 'success');
        }
    } catch (err) {
        console.error("OCR Error:", err);
        if (err.message === 'TIMEOUT') {
            showToast('Image processing timed out<br>Try a clearer image', 'error');
        } else if (err.message === 'GRID_NOT_DETECTED') {
            showToast('Sudoku grid not detected', 'error');
        } else {
            showToast('Failed to process image.', 'error');
        }
    }

    setUILocked(false);
}

class ImageRecognitionEngine {
    static async process(imageSrc) {
        return Promise.race([
            this._runPipeline(imageSrc),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 120000))
        ]);
    }

    static async _runPipeline(imageSrc) {
        const image = new Image();
        image.src = imageSrc;
        await new Promise(r => image.onload = r);

        // STEP 1 — IMAGE NORMALIZATION
        const w = image.width;
        const h = image.height;
        const maxDimension = 1000;
        const scale = Math.min(1.0, maxDimension / Math.max(w, h));
        const workW = Math.floor(w * scale);
        const workH = Math.floor(h * scale);

        const workCanvas = document.createElement('canvas');
        workCanvas.width = workW;
        workCanvas.height = workH;
        const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
        workCtx.fillStyle = 'white';
        workCtx.fillRect(0, 0, workW, workH);
        workCtx.drawImage(image, 0, 0, workW, workH);

        const imgData = workCtx.getImageData(0, 0, workW, workH);
        const data = imgData.data;

        // STEP 2 — GRAYSCALE CONVERSION
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = gray;
        }

        // STEP 3 — ADAPTIVE THRESHOLDING
        const THRESHOLD = 120;
        for (let i = 0; i < data.length; i += 4) {
            const val = data[i] > THRESHOLD ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val; // white=255, black=0
        }
        workCtx.putImageData(imgData, 0, 0);

        // STEP 4 — GRID BOUNDARY DETECTION
        let rowCounts = new Int32Array(workH);
        let colCounts = new Int32Array(workW);
        for (let y = 0; y < workH; y++) {
            for (let x = 0; x < workW; x++) {
                if (data[(y * workW + x) * 4] === 0) {
                    rowCounts[y]++;
                    colCounts[x]++;
                }
            }
        }

        let minX = workW, maxX = 0;
        let minY = workH, maxY = 0;
        for (let y = 0; y < workH; y++) { if (rowCounts[y] > workW * 0.05) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }
        for (let x = 0; x < workW; x++) { if (colCounts[x] > workH * 0.05) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }

        const rectW = maxX - minX;
        const rectH = maxY - minY;
        if (rectW <= 0 || rectH <= 0) throw new Error('GRID_NOT_DETECTED');

        const aspect = rectW / rectH;
        if (aspect < 0.7 || aspect > 1.3) throw new Error('GRID_NOT_DETECTED');

        // STEP 5 — PERSPECTIVE NORMALIZATION
        let tl = { x: minX, y: minY }, tr = { x: maxX, y: minY }, bl = { x: minX, y: maxY }, br = { x: maxX, y: maxY };
        let min_sum = Infinity, max_sum = -Infinity, min_diff = Infinity, max_diff = -Infinity;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (data[(y * workW + x) * 4] === 0) {
                    const sum = x + y;
                    const diff = x - y;
                    if (sum < min_sum) { min_sum = sum; tl = { x, y }; }
                    if (sum > max_sum) { max_sum = sum; br = { x, y }; }
                    if (diff > max_diff) { max_diff = diff; tr = { x, y }; }
                    if (diff < min_diff) { min_diff = diff; bl = { x, y }; }
                }
            }
        }

        const corners = { tl, tr, bl, br };

        // Debug
        workCtx.strokeStyle = 'red';
        workCtx.lineWidth = 4;
        workCtx.strokeRect(minX, minY, rectW, rectH);

        workCtx.fillStyle = 'blue';
        [tl, tr, bl, br].forEach(p => {
            workCtx.beginPath();
            workCtx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            workCtx.fill();
        });

        const finalSize = 450;
        const gridCanvas = this._applyPerspectiveTransform(imgData, workW, workH, corners, finalSize);
        const gridCtx = gridCanvas.getContext('2d', { willReadFrequently: true });

        // STEP 6 — GRID SEGMENTATION
        const cellWidth = finalSize / 9; // 50
        const cellHeight = finalSize / 9; // 50
        const cellsToProcess = [];

        // STEP 7 — CELL CLEANING
        const cropMargin = 0.15; // 15% margins
        const cropX = Math.floor(cellWidth * cropMargin);
        const cropY = Math.floor(cellHeight * cropMargin);
        const cw = Math.floor(cellWidth - cropX * 2);
        const ch = Math.floor(cellHeight - cropY * 2);

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                gridCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                gridCtx.lineWidth = 2;
                gridCtx.strokeRect(c * cellWidth + cropX, r * cellHeight + cropY, cw, ch);

                const cellCanvas = document.createElement('canvas');
                cellCanvas.width = cw;
                cellCanvas.height = ch;
                const cellCtx = cellCanvas.getContext('2d', { willReadFrequently: true });

                cellCtx.drawImage(
                    gridCanvas,
                    c * cellWidth + cropX, r * cellHeight + cropY,
                    cw, ch,
                    0, 0, cw, ch
                );

                // STEP 8 — EMPTY CELL DETECTION
                const cellData = cellCtx.getImageData(0, 0, cw, ch).data;
                let darkPixels = 0;
                for (let i = 0; i < cellData.length; i += 4) {
                    if (cellData[i] < 128) darkPixels++;
                }
                const darkPixelRatio = darkPixels / (cw * ch);

                if (darkPixelRatio >= 0.03) {
                    cellsToProcess.push({ row: r, col: c, canvas: cellCanvas });
                }
            }
        }

        this._showDebugCanvas(workCanvas, gridCanvas);

        // STEP 9 — OCR RECOGNITION
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
            tessedit_char_whitelist: '123456789',
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR,
        });

        const newBoard = Array(9).fill(null).map(() => Array(9).fill(0));

        const ocrPromises = cellsToProcess.map(async (cell) => {
            const result = await worker.recognize(cell.canvas);
            let text = result.data.text;

            // STEP 10 — OCR SANITIZATION
            text = text.replace(/\s+/g, '').replace(/[^1-9]/g, '');
            let value = text.length > 0 ? parseInt(text[0]) : 0;
            if (value >= 1 && value <= 9) {
                newBoard[cell.row][cell.col] = value;
            } else {
                newBoard[cell.row][cell.col] = 0;
            }
        });

        await Promise.all(ocrPromises);
        await worker.terminate();

        // STEP 11 — BOARD RECONSTRUCTION
        return newBoard;
    }

    static _showDebugCanvas(canvas1, canvas2) {
        const overlay = document.createElement('div');
        overlay.id = 'debug-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '10px';
        overlay.style.left = '10px';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.gap = '10px';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        overlay.style.padding = '10px';
        overlay.style.borderRadius = '8px';
        overlay.style.pointerEvents = 'none';

        const c1 = document.createElement('canvas');
        c1.width = 250;
        c1.height = 250 * (canvas1.height / canvas1.width);
        c1.getContext('2d').drawImage(canvas1, 0, 0, c1.width, c1.height);

        const c2 = document.createElement('canvas');
        c2.width = 250;
        c2.height = 250 * (canvas2.height / canvas2.width);
        c2.getContext('2d').drawImage(canvas2, 0, 0, c2.width, c2.height);

        overlay.appendChild(c1);
        overlay.appendChild(c2);

        const existing = document.getElementById('debug-overlay');
        if (existing) existing.remove();

        document.body.appendChild(overlay);

        setTimeout(() => {
            if (document.body.contains(overlay)) {
                overlay.remove();
            }
        }, 5000);
    }

    static _applyPerspectiveTransform(imgData, w, h, corners, outSize) {
        const outCanvas = document.createElement('canvas');
        outCanvas.width = outSize;
        outCanvas.height = outSize;
        const outCtx = outCanvas.getContext('2d');
        const outData = outCtx.createImageData(outSize, outSize);

        for (let y = 0; y < outSize; y++) {
            for (let x = 0; x < outSize; x++) {
                const rx = x / outSize;
                const ry = y / outSize;

                const topX = corners.tl.x + (corners.tr.x - corners.tl.x) * rx;
                const topY = corners.tl.y + (corners.tr.y - corners.tl.y) * rx;

                const botX = corners.bl.x + (corners.br.x - corners.bl.x) * rx;
                const botY = corners.bl.y + (corners.br.y - corners.bl.y) * rx;

                const srcX = topX + (botX - topX) * ry;
                const srcY = topY + (botY - topY) * ry;

                const sx = Math.floor(srcX);
                const sy = Math.floor(srcY);
                if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                    const srcIdx = (sy * w + sx) * 4;
                    const dstIdx = (y * outSize + x) * 4;
                    outData.data[dstIdx] = imgData.data[srcIdx];
                    outData.data[dstIdx + 1] = imgData.data[srcIdx + 1];
                    outData.data[dstIdx + 2] = imgData.data[srcIdx + 2];
                    outData.data[dstIdx + 3] = 255;
                }
            }
        }
        outCtx.putImageData(outData, 0, 0);
        return outCanvas;
    }
}
