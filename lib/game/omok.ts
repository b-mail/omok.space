export type Player = "black" | "white";
export type CellValue = Player | null;

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

    // Todo: Add 3-3 Ban check for Black here

    this.board[y][x] = this.currentPlayer;
    this.moves.push({ x, y, player: this.currentPlayer });

    if (this.checkWin(x, y)) {
      this.winner = this.currentPlayer;
    } else {
      this.currentPlayer = this.currentPlayer === "black" ? "white" : "black";
    }

    return true;
  }

  checkWin(x: number, y: number): boolean {
    const directions = [
      [1, 0], // Horizontal
      [0, 1], // Vertical
      [1, 1], // Diagonal \
      [1, -1], // Diagonal /
    ];

    const player = this.board[y][x];
    if (!player) return false;

    for (const [dx, dy] of directions) {
      let count = 1;

      // Check forward
      let nx = x + dx;
      let ny = y + dy;
      while (this.isValid(nx, ny) && this.board[ny][nx] === player) {
        count++;
        nx += dx;
        ny += dy;
      }

      // Check backward
      nx = x - dx;
      ny = y - dy;
      while (this.isValid(nx, ny) && this.board[ny][nx] === player) {
        count++;
        nx -= dx;
        ny -= dy;
      }

      if (count >= 5) return true;
    }

    return false;
  }

  isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }
}
