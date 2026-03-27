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

export type Hint = {
  row: number;
  col: number;
  value: number;
  reason: string;
};

/**
 * Finds a logical hint for the current board state, including advanced techniques.
 */
export function getHint(board: Board): Hint | null {
  // Helper to get candidates for all cells
  const getCellCandidates = (b: Board) => {
    const candidates: number[][][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === null) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(b, r, c, num)) candidates[r][c].push(num);
          }
        }
      }
    }
    return candidates;
  };

  const candidates = getCellCandidates(board);

  // 1. Check for Naked Singles (唯一余数法)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null && candidates[r][c].length === 1) {
        return {
          row: r,
          col: c,
          value: candidates[r][c][0],
          reason: `唯一余数法：该单元格在当前行列宫限制下，只能填入数字 ${candidates[r][c][0]}。`
        };
      }
    }
  }

  // 2. Check for Hidden Singles (排除法)
  // Boxes
  for (let box = 0; box < 9; box++) {
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let num = 1; num <= 9; num++) {
      const possibleCells: [number, number][] = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startRow + i;
          const c = startCol + j;
          if (board[r][c] === null && candidates[r][c].includes(num)) {
            possibleCells.push([r, c]);
          }
        }
      }
      if (possibleCells.length === 1) {
        return {
          row: possibleCells[0][0],
          col: possibleCells[0][1],
          value: num,
          reason: `宫内排除法：在第 ${box + 1} 个宫内，数字 ${num} 只能填入这个位置。`
        };
      }
    }
  }

  // Rows & Cols
  for (let i = 0; i < 9; i++) {
    for (let num = 1; num <= 9; num++) {
      // Row
      const rowCells = [];
      for (let c = 0; c < 9; c++) {
        if (board[i][c] === null && candidates[i][c].includes(num)) rowCells.push(c);
      }
      if (rowCells.length === 1) {
        return { row: i, col: rowCells[0], value: num, reason: `行排除法：在第 ${i + 1} 行中，数字 ${num} 只能填入这个位置。` };
      }

      // Col
      const colCells = [];
      for (let r = 0; r < 9; r++) {
        if (board[r][i] === null && candidates[r][i].includes(num)) colCells.push(r);
      }
      if (colCells.length === 1) {
        return { row: colCells[0], col: i, value: num, reason: `列排除法：在第 ${i + 1} 列中，数字 ${num} 只能填入这个位置。` };
      }
    }
  }

  // 3. Pointing Pairs (区块排除法)
  for (let box = 0; box < 9; box++) {
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let num = 1; num <= 9; num++) {
      const positions: [number, number][] = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startRow + i;
          const c = startCol + j;
          if (board[r][c] === null && candidates[r][c].includes(num)) positions.push([r, c]);
        }
      }

      if (positions.length >= 2 && positions.length <= 3) {
        const sameRow = positions.every(p => p[0] === positions[0][0]);
        const sameCol = positions.every(p => p[1] === positions[0][1]);

        if (sameRow) {
          const r = positions[0][0];
          for (let c = 0; c < 9; c++) {
            if (Math.floor(c / 3) !== Math.floor(startCol / 3) && board[r][c] === null && candidates[r][c].includes(num)) {
              // This is a Pointing Pair!
              return {
                row: positions[0][0],
                col: positions[0][1],
                value: num,
                reason: `区块排除法：在第 ${box + 1} 宫内，数字 ${num} 只能出现在第 ${r + 1} 行。因此，该行其他宫格的 ${num} 都可以排除，这有助于锁定目标。`
              };
            }
          }
        }

        if (sameCol) {
          const c = positions[0][1];
          for (let r = 0; r < 9; r++) {
            if (Math.floor(r / 3) !== Math.floor(startRow / 3) && board[r][c] === null && candidates[r][c].includes(num)) {
              return {
                row: positions[0][0],
                col: positions[0][1],
                value: num,
                reason: `区块排除法：在第 ${box + 1} 宫内，数字 ${num} 只能出现在第 ${c + 1} 列。因此，该列其他宫格的 ${num} 都可以排除，这有助于锁定目标。`
              };
            }
          }
        }
      }
    }
  }

  // 4. Naked Pairs (显性数对)
  for (let i = 0; i < 9; i++) {
    // Row
    const rowPairs = [];
    for (let c = 0; c < 9; c++) {
      if (board[i][c] === null && candidates[i][c].length === 2) rowPairs.push({ col: c, cand: candidates[i][c] });
    }
    for (let p1 = 0; p1 < rowPairs.length; p1++) {
      for (let p2 = p1 + 1; p2 < rowPairs.length; p2++) {
        if (rowPairs[p1].cand[0] === rowPairs[p2].cand[0] && rowPairs[p1].cand[1] === rowPairs[p2].cand[1]) {
          const c1 = rowPairs[p1].col;
          const c2 = rowPairs[p2].col;
          const cands = rowPairs[p1].cand;
          for (let c = 0; c < 9; c++) {
            if (c !== c1 && c !== c2 && board[i][c] === null && (candidates[i][c].includes(cands[0]) || candidates[i][c].includes(cands[1]))) {
              return {
                row: i,
                col: c1,
                value: cands[0],
                reason: `显性数对：第 ${i + 1} 行中，有两个格子只能填入 ${cands[0]} 或 ${cands[1]}。因此，该行其他格子的这两个数字都可以排除，从而缩小范围。`
              };
            }
          }
        }
      }
    }
  }

  return null;
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

/**
 * Serializes a board to a string of digits (0 for null).
 */
export function serializeBoard(board: Board): string {
  return board.flat().map(cell => cell === null ? '0' : cell.toString()).join('');
}

/**
 * Deserializes a string of digits back into a Board.
 */
export function deserializeBoard(data: string): Board {
  const board: Board = [];
  for (let i = 0; i < 9; i++) {
    const row: (number | null)[] = [];
    for (let j = 0; j < 9; j++) {
      const val = parseInt(data[i * 9 + j]);
      row.push(val === 0 ? null : val);
    }
    board.push(row);
  }
  return board;
}
