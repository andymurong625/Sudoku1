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
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
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
 * Removes numbers from a full board based on difficulty.
 */
export function generateGame(difficulty: Difficulty): { initial: Board; solution: number[][] } {
  const fullBoard = generateFullBoard();
  const gameBoard: Board = fullBoard.map(row => [...row]);
  
  let attempts = 0;
  let count = 0;
  
  switch (difficulty) {
    case 'Easy': count = 35; break;
    case 'Medium': count = 45; break;
    case 'Hard': count = 55; break;
  }

  while (attempts < count) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (gameBoard[row][col] !== null) {
      gameBoard[row][col] = null;
      attempts++;
    }
  }

  return { initial: gameBoard, solution: fullBoard };
}
