const None = 0;   // 00 000
const King = 1;   // 00 001
const Pawn = 2;   // 00 010
const Knight = 3; // 00 011
const Bishop = 4; // 00 100
const Rook = 5;   // 00 101
const Queen = 6;  // 00 110
const White = 8;  // 01 000
const Black = 16; // 10 000

/*  Board Structure:
 *  [7-0][7-1][7-2][7-3][7-4][7-5][7-6][7-7]
 *  [6-0][6-1][6-2][6-3][6-4][6-5][6-6][6-7]
 *  [5-0][5-1][5-2][5-3][5-4][5-5][5-6][5-7]
 *  [4-0][4-1][4-2][4-3][4-4][4-5][4-6][4-7]
 *  [3-0][3-1][3-2][3-3][3-4][3-5][3-6][3-7]
 *  [2-0][2-1][2-2][2-3][2-4][2-5][2-6][2-7]
 *  [1-0][1-1][1-2][1-3][1-4][1-5][1-6][1-7]
 *  [0-0][0-1][0-2][0-3][0-4][0-5][0-6][0-7]
*/

export function createBoardState(type, fen) {
    var boardState;
    switch (type) {
        case "empty":
            boardState = new Array(8);
            for (let i = 0; i < 8; i++) {
                boardState[i] = new Array(8);
            }
            break;
        case "start":
            boardState = new Array(8);
            for (let i = 0; i < 8; i++) {
                if (i === 0) {
                    boardState[i] = [Rook | White, Knight | White, Bishop | White, Queen | White, King | White, Bishop | White, Knight | White, Rook | White];
                } else if (i === 1) {
                    boardState[i] = new Array(8).fill(Pawn | White);
                } else if (i === 6) {
                    boardState[i] = new Array(8).fill(Pawn | Black);
                } else if (i === 7) {
                    boardState[i] = [Rook | Black, Knight | Black, Bishop | Black, Queen | Black, King | Black, Bishop | Black, Knight | Black, Rook | Black];
                } else {
                    boardState[i] = new Array(8).fill(None);
                }
            }
            break;
        default:
            break;
    }
    return boardState;
}

// maybe impelement with a hashmap
export async function translateBoardToFen(board, piece, turn, castling, enPassant, halfMove, fullMove) {
    let fen = "";
    for (let i = 7; i >= 0; i--) {
        for (let j = 0; j < 8; j++) {
            switch (board[i][j]) {
                case None:
                    let blankSpaces = 0;
                    while (board[i][j] === None && j < 8) {
                        blankSpaces++;
                        j++;
                    }
                    j--;
                    fen += blankSpaces.toString();
                    break;
                case King | White:
                    fen += "K";
                    break;
                case Pawn | White:
                    fen += "P";
                    break;
                case Knight | White:
                    fen += "N";
                    break;
                case Bishop | White:
                    fen += "B";
                    break;
                case Rook | White:
                    fen += "R";
                    break;
                case Queen | White:
                    fen += "Q";
                    break;
                case King | Black:
                    fen += "k";
                    break;
                case Pawn | Black:
                    fen += "p";
                    break;
                case Knight | Black:
                    fen += "n";
                    break;
                case Bishop | Black:
                    fen += "b";
                    break;
                case Rook | Black:
                    fen += "r";
                    break;
                case Queen | Black:
                    fen += "q";
                    break;
            }
        }
        if (i !== 0) {
            fen += "/";
        }
    }

    // check previous move's color, if white, then black's turn, else white's turn
    // if (piece.charAt(0) === "w") {
    //     fen += " b";
    // } else {
    //     fen += " w";
    // }

    // // check castling
    // if (null) {

    // }

    // // check en passant
    // if (null) {

    // }

    // console.log(fen)
    // console.log(board)
    return fen;
}

export async function isSquareThreatened(byColor, board, col, row) {
    let colorCheck;
    // set colorCheck to be the bit representation of the color of the piece that is threatening the square
    // check if square is threatened by a pawn
    // console.log("pawns")
    if (byColor === White) {
        colorCheck = 8; // white
        if (row - 1 >= 0 && col + 1 < 8 && board[row-1][col+1] === (colorCheck | Pawn)) {
            return true;
        } else if (row - 1 >= 0 && col - 1 >= 0 && board[row-1][col-1] === (colorCheck | Pawn)) {
            return true;
        }
    } else {
        colorCheck = 16; // black
        if (row + 1 < 8 && col + 1 < 8 && board[row+1][col+1] === (colorCheck | Pawn)) {
            return true;
        } else if (row + 1 < 8 && col - 1 >= 0 && board[row+1][col-1] === (colorCheck | Pawn)) {
            return true;
        }
    }
    // console.log("diagonal")
    // cycle through diagonals
    // diagonalMovement represents movements on the board that are diagonal
    let diagonalMovement = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let i = 0 ; i < 4; i++) {
        // console.log("i " + i)
        let j = row;
        let k = col;
        while (j >= 0 && j < 8 && k >= 0 && k < 8) {
            j += diagonalMovement[i][0];
            k += diagonalMovement[i][1];
            // console.log("diagonal move " + j, k)
            // if adding the movement will cause the position to be out of bounds, then continue
            if (j < 0 || j > 7 || k < 0 || k > 7) {
                continue;
            }
            // if square is none or square is the position of the king, then continue
            if (board[j][k] === None || board[j][k] === ((colorCheck ^ 24) | King)) {
                // console.log("continue " + board[j][k])
                continue;
            } else if (board[j][k] === (colorCheck | Bishop) || board[j][k] === (colorCheck | Queen)) {
                // console.log("queen/bishop " + board[j][k])
                return true;
            } else {
                // console.log("break " + board[j][k])
                break;
            }
        }
    }

    // console.log("lines")
    // cycle through rows and columns
    let lineMovements = [1, -1, 1, -1];
    for (let i = 0; i < 4; i++) {
        let j = row;
        let k = col;
        while (j >= 0 && j < 8 && k >= 0 && k < 8) {
            if (i < 2) {
                j += lineMovements[i];
            } else {
                k += lineMovements[i];
            }
            // if adding the movement will cause the position to be out of bounds, then continue
            if (j < 0 || j > 7 || k < 0 || k > 7) {
                continue;
            }
            // if square is none or square is the position of the king, then continue
            if (board[j][k] === None || board[j][k] === ((colorCheck ^ 24) | King)) {
                continue;
            } else if (board[j][k] === (colorCheck | Rook) || board[j][k] === (colorCheck | Queen)) {
                return true;
            } else {
                break;
            }
        }
    }

    // console.log("knight")
    // check if square is threatened by a knight
    let knightMovements = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [-1, 2], [1, -2], [-1, -2]];
    for (let i = 0; i < 8; i++) {
        let j = row + knightMovements[i][0];
        let k = col + knightMovements[i][1];
        // if adding the movement will cause the position to be out of bounds, then continue
        if (j < 0 || j > 7 || k < 0 || k > 7) {
            continue;
        }
        if (board[j][k] === (colorCheck | Knight)) {
            return true;
        }
    }

    // console.log("king")
    // check if square is threatened by a king
    let kingMovements = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < 8; i++) {
        let j = row + kingMovements[i][0];
        let k = col + kingMovements[i][1];
        // if adding the movement will cause the position to be out of bounds, then continue
        if (j < 0 || j > 7 || k < 0 || k > 7) {
            continue;
        }
        if (board[j][k] === (colorCheck | King)) {
            return true;
        }
    }

    return false;
}

export {
    None,
    King,
    Pawn,
    Knight,
    Bishop,
    Rook,
    Queen,
    White,
    Black,
}