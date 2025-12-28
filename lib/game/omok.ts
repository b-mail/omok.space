export type Player = "black" | "white";
export type CellValue = Player | null;

export function checkWin(
  board: CellValue[][],
  x: number,
  y: number,
  player: Player
): boolean {
  const directions = [
    [1, 0], // Horizontal
    [0, 1], // Vertical
    [1, 1], // Diagonal \
    [1, -1], // Diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // Check forward
    let nx = x + dx;
    let ny = y + dy;
    while (isValid(nx, ny) && board[ny][nx] === player) {
      count++;
      nx += dx;
      ny += dy;
    }

    // Check backward
    nx = x - dx;
    ny = y - dy;
    while (isValid(nx, ny) && board[ny][nx] === player) {
      count++;
      nx -= dx;
      ny -= dy;
    }

    if (count >= 5) return true;
  }

  return false;
}

export function isValid(x: number, y: number): boolean {
  return x >= 0 && x < 15 && y >= 0 && y < 15;
}

export function isBanMove(
  _board: CellValue[][],
  _x: number,
  _y: number
): boolean {
  void _board;
  void _x;
  void _y;
  // Simple 3-3 check (placeholder or basic implementation)
  // For now, return false as 3-3 check is complex, but we export the signature
  return false;
}

export class OmokGame {
  board: CellValue[][];
  size: number = 15;
  currentPlayer: Player = "black";
  winner: Player | null = null;
  moves: { x: number; y: number; player: Player }[] = [];

  constructor(size: number = 15) {
    this.size = size;
    this.board = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));
  }

  placeStone(x: number, y: number): boolean {
    if (this.winner || this.board[y][x] !== null) return false;

    if (this.currentPlayer === "black" && isBanMove(this.board, x, y))
      return false;

    this.board[y][x] = this.currentPlayer;
    this.moves.push({ x, y, player: this.currentPlayer });

    if (checkWin(this.board, x, y, this.currentPlayer)) {
      this.winner = this.currentPlayer;
    } else {
      this.currentPlayer = this.currentPlayer === "black" ? "white" : "black";
    }

    return true;
  }
}
