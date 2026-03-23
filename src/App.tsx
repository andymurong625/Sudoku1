import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Pause, AlertCircle, ChevronLeft, HelpCircle } from 'lucide-react';
import { generateGame, Difficulty, Board, isValid } from './sudokuLogic';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [board, setBoard] = useState<Board>([]);
  const [initialBoard, setInitialBoard] = useState<Board>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [showMistakeAnim, setShowMistakeAnim] = useState(false);
  const [hintedCell, setHintedCell] = useState<[number, number] | null>(null);
  const [isMarkMode, setIsMarkMode] = useState(false);
  const [notes, setNotes] = useState<number[][][]>(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])));
  const [isHintActive, setIsHintActive] = useState(false);

  // Load game from localStorage on mount
  useEffect(() => {
    const savedGame = localStorage.getItem('sudoku-save');
    if (savedGame) {
      try {
        const data = JSON.parse(savedGame);
        setGameState(data.gameState);
        setDifficulty(data.difficulty);
        setBoard(data.board);
        setInitialBoard(data.initialBoard);
        setSolution(data.solution);
        setTimer(data.timer);
        setMistakes(data.mistakes);
        setIsPaused(true); // Pause on load for better UX
      } catch (e) {
        console.error('Failed to load saved game', e);
      }
    }
  }, []);

  // Save game to localStorage whenever state changes
  useEffect(() => {
    if (gameState === 'playing') {
      const saveData = {
        gameState,
        difficulty,
        board,
        initialBoard,
        solution,
        timer,
        mistakes
      };
      localStorage.setItem('sudoku-save', JSON.stringify(saveData));
    } else if (gameState === 'won' || gameState === 'lost' || gameState === 'menu') {
      localStorage.removeItem('sudoku-save');
    }
  }, [gameState, difficulty, board, initialBoard, solution, timer, mistakes]);

  const startGame = (diff: Difficulty) => {
    const { initial, solution } = generateGame(diff);
    setBoard(initial.map(row => [...row]));
    setInitialBoard(initial.map(row => [...row]));
    setSolution(solution);
    setDifficulty(diff);
    setGameState('playing');
    setTimer(0);
    setMistakes(0);
    setIsPaused(false);
    setSelectedCell(null);
    setHintedCell(null);
    setIsHintActive(false);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])));
  };

  const toggleHint = () => {
    if (gameState !== 'playing' || isPaused) return;

    if (!isHintActive) {
      // Find a random empty cell to hint
      const emptyCells: [number, number][] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === null) {
            emptyCells.push([r, c]);
          }
        }
      }

      if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        setHintedCell(randomCell);
        setSelectedCell(randomCell);
        setIsHintActive(true);
      }
    } else {
      setIsHintActive(false);
      setHintedCell(null);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && !isPaused) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameState !== 'playing' || isPaused) return;
    if (initialBoard[row][col] !== null) {
      setSelectedCell([row, col]);
      return;
    }
    setSelectedCell([row, col]);
  };

  const handleNumberInput = useCallback((num: number, forceMark?: boolean) => {
    if (!selectedCell || gameState !== 'playing' || isPaused) return;
    const [row, col] = selectedCell;

    if (initialBoard[row][col] !== null) return;
    if (board[row][col] !== null) return;

    const useMark = forceMark !== undefined ? forceMark : isMarkMode;

    if (useMark) {
      const newNotes = [...notes];
      const cellNotes = newNotes[row][col];
      if (cellNotes.includes(num)) {
        newNotes[row][col] = cellNotes.filter(n => n !== num);
      } else {
        newNotes[row][col] = [...cellNotes, num].sort();
      }
      setNotes(newNotes);
      return;
    }

    if (solution[row][col] === num) {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = num;
      setBoard(newBoard);

      // Clear notes for this cell and related cells
      const newNotes = [...notes];
      newNotes[row][col] = [];
      // Optional: remove this number from notes in same row/col/box
      setNotes(newNotes);

      // Check if won
      const isWon = newBoard.every((r, ri) => r.every((c, ci) => c === solution[ri][ci]));
      if (isWon) {
        setGameState('won');
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setShowMistakeAnim(true);
      setTimeout(() => setShowMistakeAnim(false), 500);

      if (newMistakes >= 10) {
        setGameState('lost');
      }
    }
  }, [selectedCell, board, solution, initialBoard, gameState, isPaused, mistakes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // In this version, we only allow correct inputs, so backspace isn't needed for correct cells
      } else if (e.key.startsWith('Arrow')) {
        if (!selectedCell) {
          setSelectedCell([0, 0]);
          return;
        }
        const [r, c] = selectedCell;
        if (e.key === 'ArrowUp') setSelectedCell([Math.max(0, r - 1), c]);
        if (e.key === 'ArrowDown') setSelectedCell([Math.min(8, r + 1), c]);
        if (e.key === 'ArrowLeft') setSelectedCell([r, Math.max(0, c - 1)]);
        if (e.key === 'ArrowRight') setSelectedCell([r, Math.min(8, c + 1)]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberInput, selectedCell]);

  const getAutoHighlightNumber = () => {
    if (!selectedCell) return null;
    const [row, col] = selectedCell;
    if (board[row][col] !== null) return null;

    // Check row
    const rowCells = board[row];
    const missingInRow = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !rowCells.includes(n));
    if (missingInRow.length === 1) return missingInRow[0];

    // Check col
    const colCells = board.map(r => r[col]);
    const missingInCol = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !colCells.includes(n));
    if (missingInCol.length === 1) return missingInCol[0];

    // Check box
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    const boxCells = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        boxCells.push(board[startRow + i][startCol + j]);
      }
    }
    const missingInBox = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !boxCells.includes(n));
    if (missingInBox.length === 1) return missingInBox[0];

    return null;
  };

  const renderCell = (row: number, col: number) => {
    const value = board[row][col];
    const isInitial = initialBoard[row][col] !== null;
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;
    const isHinted = hintedCell?.[0] === row && hintedCell?.[1] === col;
    const cellNotes = notes[row][col];

    // Highlight related cells
    const isRelated = selectedCell && (
      selectedCell[0] === row ||
      selectedCell[1] === col ||
      (Math.floor(selectedCell[0] / 3) === Math.floor(row / 3) && Math.floor(selectedCell[1] / 3) === Math.floor(col / 3))
    );

    const isSameValue = selectedCell && value !== null && board[selectedCell[0]][selectedCell[1]] === value;

    let bgColor = 'bg-white';
    if (isSelected) bgColor = 'bg-indigo-200';
    else if (isHinted) bgColor = 'bg-amber-100 animate-pulse';
    else if (isSameValue) bgColor = 'bg-indigo-100';
    else if (isRelated) bgColor = 'bg-slate-50';

    return (
      <div
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        className={`
          relative flex items-center justify-center text-xl sm:text-2xl font-medium cursor-pointer
          transition-colors duration-100 aspect-square
          ${bgColor}
          ${isInitial ? 'text-slate-900 font-bold' : 'text-indigo-600'}
        `}
      >
        {value !== null ? (
          value
        ) : (isHintActive && (isSelected || isHinted)) ? (
          <span className="text-amber-500 opacity-50">{solution[row][col]}</span>
        ) : (
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <div key={n} className="flex items-center justify-center text-[10px] sm:text-[13px] font-semibold leading-none text-slate-500">
                {cellNotes.includes(n) ? n : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {gameState === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center space-y-8 pt-12"
            >
              <div className="text-center space-y-2">
                <h1 className="text-5xl font-bold tracking-tight text-indigo-600">Sudoku</h1>
                <p className="text-slate-500 italic">Master your mind, one cell at a time.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => startGame(diff)}
                    className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{diff}</h3>
                        <p className="text-sm text-slate-500">
                          {diff === 'Easy' && 'Perfect for beginners'}
                          {diff === 'Medium' && 'A solid challenge'}
                          {diff === 'Hard' && 'For Sudoku masters'}
                        </p>
                      </div>
                      <Play className="w-5 h-5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setGameState('menu')}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Mistakes</p>
                    <p className={`text-lg font-mono font-bold ${mistakes > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                      {mistakes}/10
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Difficulty</p>
                    <p className="text-lg font-bold text-indigo-600">{difficulty}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Timer</p>
                    <p className="text-lg font-mono font-bold text-slate-700">{formatTime(timer)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </button>
              </div>

              <div className="relative aspect-square w-full max-w-[500px] mx-auto bg-slate-400 rounded-xl shadow-xl overflow-hidden border-2 border-slate-400">
                <div className="grid grid-cols-3 grid-rows-3 gap-1 h-full">
                  {[0, 1, 2].map(br => (
                    [0, 1, 2].map(bc => (
                      <div key={`block-${br}-${bc}`} className="grid grid-cols-3 grid-rows-3 gap-px bg-slate-200">
                        {[0, 1, 2].map(ir => (
                          [0, 1, 2].map(ic => renderCell(br * 3 + ir, bc * 3 + ic))
                        ))}
                      </div>
                    ))
                  ))}
                </div>

                <AnimatePresence>
                  {isPaused && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
                    >
                      <Pause className="w-12 h-12 text-indigo-500" />
                      <h2 className="text-2xl font-bold">Game Paused</h2>
                      <button
                        onClick={() => setIsPaused(false)}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Resume Game
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showMistakeAnim && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                    >
                      <div className="bg-rose-500/20 p-8 rounded-full">
                        <AlertCircle className="w-24 h-24 text-rose-500" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-4 max-w-[500px] mx-auto">
                <div className="grid grid-cols-9 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const isAutoHighlighted = getAutoHighlightNumber() === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleNumberInput(num, false)}
                        className={`
                          aspect-square flex items-center justify-center rounded-lg shadow-sm border transition-all active:scale-95 text-xl font-bold
                          ${isAutoHighlighted 
                            ? 'bg-amber-100 border-amber-400 text-amber-700 ring-2 ring-amber-200' 
                            : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300'}
                        `}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {isMarkMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-9 gap-2 overflow-hidden"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                        const isMarked = selectedCell && notes[selectedCell[0]][selectedCell[1]].includes(num);
                        return (
                          <button
                            key={`mark-${num}`}
                            onClick={() => handleNumberInput(num, true)}
                            className={`
                              aspect-square flex items-center justify-center rounded-lg border transition-all active:scale-95 text-sm font-medium
                              ${isMarked 
                                ? 'bg-indigo-100 border-indigo-400 text-indigo-700 ring-1 ring-indigo-200' 
                                : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}
                            `}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-center items-center space-x-4 pt-4">
                <button
                  onClick={() => setIsMarkMode(!isMarkMode)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all font-medium ${
                    isMarkMode 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Mark</span>
                </button>
                <button
                  onClick={toggleHint}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all font-medium ${
                    isHintActive 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Hint</span>
                </button>
                <button
                  onClick={() => startGame(difficulty)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-500 border border-slate-200 rounded-full hover:border-indigo-300 transition-all font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'lost' && (
            <motion.div
              key="lost"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center space-y-8 pt-12"
            >
              <div className="relative">
                <AlertCircle className="w-32 h-32 text-rose-500" />
                <div className="absolute -top-4 -right-4 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  GAME OVER
                </div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold">Too Many Mistakes</h2>
                <p className="text-slate-500">Don't give up! Every mistake is a lesson.</p>
              </div>

              <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
                <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Time</p>
                  <p className="text-2xl font-mono font-bold text-slate-700">{formatTime(timer)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Mistakes</p>
                  <p className="text-2xl font-mono font-bold text-rose-500">{mistakes}</p>
                </div>
              </div>

              <button
                onClick={() => setGameState('menu')}
                className="w-full max-w-xs py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {gameState === 'won' && (
            <motion.div
              key="won"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center space-y-8 pt-12"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Trophy className="w-32 h-32 text-amber-400" />
                </motion.div>
                <div className="absolute -top-4 -right-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  EXCELLENT
                </div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold">Puzzle Solved!</h2>
                <p className="text-slate-500">You completed the {difficulty} challenge.</p>
              </div>

              <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
                <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Time</p>
                  <p className="text-2xl font-mono font-bold text-slate-700">{formatTime(timer)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Mistakes</p>
                  <p className="text-2xl font-mono font-bold text-slate-700">{mistakes}</p>
                </div>
              </div>

              <div className="flex flex-col w-full max-w-xs space-y-4">
                <button
                  onClick={() => startGame(difficulty)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Next Level
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
