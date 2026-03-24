/**
 * Sudoku logic for generating and solving 9x9 boards.
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Board = (number | null)[][];

/**
 * Checks if placing a number at board[row][col] is valid.
 */
export function isValid(board: Board, row: number, col: number, num: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) return false;
  }

  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }

  return true;
}

/**
 * Solves the Sudoku board using backtracking.
 */
export function solveSudoku(board: Board): boolean {
  const emptyCell = findEmptyCell(board);
  if (!emptyCell) return true;

  const [row, col] = emptyCell;
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (solveSudoku(board)) return true;
      board[row][col] = null;
    }
  }
  return false;
}

function findEmptyCell(board: Board): [number, number] | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) return [r, c];
    }
  }
  return null;
}

/**
 * Counts the number of solutions for a given board, up to a limit.
 */
export function countSolutions(board: Board, limit: number = 2): number {
  const emptyCell = findEmptyCell(board);
  if (!emptyCell) return 1;

  const [row, col] = emptyCell;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, limit);
      board[row][col] = null;
      if (count >= limit) return count;
    }
  }
  return count;
}

/**
 * Generates a full valid Sudoku board.
 */
export function generateFullBoard(): number[][] {
  const board: Board = Array.from({ length: 9 }, () => Array(9).fill(null));

  // Fill diagonal boxes first to speed up generation
  for (let i = 0; i < 9; i += 3) {
    fillBox(board, i, i);
  }

  solveSudoku(board);
  return board as number[][];
}

function fillBox(board: Board, row: number, col: number) {
  let num;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      do {
        num = Math.floor(Math.random() * 9) + 1;
      } while (!isUnusedInBox(board, row, col, num));
      board[row + i][col + j] = num;
    }
  }
}

function isUnusedInBox(board: Board, rowStart: number, colStart: number, num: number) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[rowStart + i][colStart + j] === num) return false;
    }
  }
  return true;
}

/**
 * Removes numbers from a full board based on difficulty while ensuring a unique solution.
 */
export function generateGame(difficulty: Difficulty): { initial: Board; solution: number[][] } {
  const fullBoard = generateFullBoard();
  const gameBoard: Board = fullBoard.map(row => [...row]);

  let count = 0;
  switch (difficulty) {
    case 'Easy': count = 35; break;
    case 'Medium': count = 45; break;
    case 'Hard': count = 55; break;
  }

  // Create a list of all cell coordinates and shuffle them
  const cells: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c]);
    }
  }

  // Shuffle cells
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= count) break;

    const temp = gameBoard[r][c];
    gameBoard[r][c] = null;

    // Check if unique solution
    // We pass a copy to countSolutions to avoid mutating gameBoard
    const boardCopy = gameBoard.map(row => [...row]);
    if (countSolutions(boardCopy) === 1) {
      removed++;
    } else {
      gameBoard[r][c] = temp;
    }
  }

  return { initial: gameBoard, solution: fullBoard };
}
