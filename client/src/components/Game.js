  import { Chessboard } from "react-chessboard";
  import { useState, useEffect } from "react";
  import { useLocation } from "react-router-dom";
  import {
  createBoardState,
  translateBoardToFen,
  // checkLegalMoves,
  isSquareThreatened,
  None,
  King,
  Pawn,
  Knight,
  Bishop,
  Rook,
  Queen,
  White,
  Black,
  } from "./GameState";

function Game(props) {
  const location = useLocation();
  const [fenState, setFenState] = useState();
  const [boardState, setBoardState] = useState(createBoardState("start"));
  const [isPlayerTurn, setIsPlayerTurn] = useState(location.state.isPlayerTurn);
  const [enPassant, setEnPassant] = useState(None);
  const [whitePiecesTaken, setWhitePiecesTaken] = useState([]);
  const [blackPiecesTaken, setBlackPiecesTaken] = useState([]);
  const [blackKingPosition, setBlackKingPosition] = useState([7, 4]);
  const [whiteKingPosition, setWhiteKingPosition] = useState([0, 4]);
  const [blackCanCastleLeft, setBlackCanCastleLeft] = useState(true);
  const [whiteCanCastleLeft, setWhiteCanCastleLeft] = useState(true);
  const [blackCanCastleRight, setBlackCanCastleRight] = useState(true);
  const [whiteCanCastleRight, setWhiteCanCastleRight] = useState(true);
  const [whitePromotion, setWhitePromotion] = useState(false);
  const [whitePromotionSquare, setWhitePromotionSquare] = useState([None, None]);
  const [blackPromotion, setBlackPromotion] = useState(false);
  const [blackPromotionSquare, setBlackPromotionSquare] = useState([None, None]);
  // const [tempPieceTaken, setTempPieceTaken] = useState(None);

  useEffect(() => {
    console.log(location)
  });

  // updates arrays to track pieces taken
  function setPiecesTaken(piece) {
    if (piece === None) {
      return;
    } else if (((piece >> 4) & 1) === 1) { // piece is black
      setBlackPiecesTaken([...blackPiecesTaken, piece]);
    } else if (((piece >> 3) & 1) === 1) {
      setWhitePiecesTaken([...whitePiecesTaken, piece]);
    }
  }

  // translates movement to board notation, updates board state, update fen state
  async function onDrop(sourceSquare, targetSquare, piece) {
    // code on drop, communicate with server to update game state and update opponent's board
    // translate from react-chessboard notation to board notation
    let source = sourceSquare.split("");
    let sourceCol = source[0].charCodeAt(0) - 97;
    let sourceRow = source[1] - 1;
    let target = targetSquare.split("");
    let targetCol = target[0].charCodeAt(0) - 97;
    let targetRow = target[1] - 1;
    
    setBoardState(await updateGameBoard(boardState, sourceRow, sourceCol, targetRow, targetCol, piece));
    
    // check if a pawn is moving two squares forward, if so, set en passant for next turn
    if (piece === "wP" && sourceRow === 1 && targetRow === 3) {
      setEnPassant({ row: 3, col: targetCol, turns: 1 });
    } else if (sourceRow === 6 && targetRow === 4 && piece === "bP") {
      setEnPassant({ row: 4, col: targetCol, turns: 1  });
    }
    
    setFenState(await translateBoardToFen(boardState, piece, "w", "KQkq", "-", 0, 1));
    // setIsPlayerTurn(!isPlayerTurn);
    return true;
  }

  // updates the game board state, checking for legal moves
  async function updateGameBoard(board, sourceRow, sourceCol, targetRow, targetCol, piece) {
    let legal;
    legal = await checkLegalMoves(board, piece, sourceCol, sourceRow, targetCol, targetRow);

    // console.log(board[targetRow][targetCol] + " " + board[sourceRow][sourceCol]);
    if (legal) {
      // decrement turns in en passant, if decrementing becomes 0, then remove en passant flag
      if (enPassant !== None) {
        if (enPassant.turns - 1 === 0) {
          setEnPassant(None)
        } else {
          setEnPassant({ row: enPassant.row, col: enPassant.col, turns: enPassant.turns - 1 });
        }
      }

      // update board state
      let temp = board[targetRow][targetCol];
      board[targetRow][targetCol] = board[sourceRow][sourceCol];
      board[sourceRow][sourceCol] = None;
      
      if (piece === "wK") {
        // if castle, move rook
        if (sourceCol === 4 && targetCol === 6) {
          board[0][5] = board[0][7];
          board[0][7] = None;
        } else if (sourceCol === 4 && targetCol === 2) {
          board[0][3] = board[0][0];
          board[0][0] = None;
        }
        // update king positions
        setWhiteKingPosition([targetRow, targetCol]);
      } else if (piece === "bK") {
        // if castle, move rook
        if (sourceCol === 4 && targetCol === 6) {
          board[7][5] = board[7][7];
          board[7][7] = None;
        } else if (sourceCol === 4 && targetCol === 2) {
          board[7][3] = board[7][0];
          board[7][0] = None;
        }
        // update king positions
        setBlackKingPosition([targetRow, targetCol]);
      }
      
      // check if king is in check, if so, reverse the move
      let check = false;
      let enemyCheck = false;
      if (piece.charAt(0) === 'w' && piece.charAt(1) !== 'K') {
        check = await isSquareThreatened(Black, board, whiteKingPosition[1], whiteKingPosition[0]);
        enemyCheck = await isSquareThreatened(White, board, blackKingPosition[1], blackKingPosition[0]);
      } else if (piece.charAt(0) === 'b' && piece.charAt(1) !== 'K') {
        check = await isSquareThreatened(White, board, blackKingPosition[1], blackKingPosition[0]);
        enemyCheck = await isSquareThreatened(Black, board, whiteKingPosition[1], whiteKingPosition[0]);
      }
      
      if (check) {
        board[sourceRow][sourceCol] = board[targetRow][targetCol];
        board[targetRow][targetCol] = temp;
      } else {
        if (temp !== None) {
          setPiecesTaken(temp);
        }
        // check if opponent is checkmated
        if (piece.charAt(0) === 'w') {
          enemyCheck = await isSquareThreatened(White, board, blackKingPosition[1], blackKingPosition[0]);
        } else if (piece.charAt(0) === 'b') {
          enemyCheck = await isSquareThreatened(Black, board, whiteKingPosition[1], whiteKingPosition[0]);
        }
      }

    }
    return board;
  }

  async function setPromotion(color, row, col) {
    if (color === Black) {
      setBlackPromotion(true);
      setBlackPromotionSquare([row, col]);
    } else if (color === White) {
      setWhitePromotion(true);
      setWhitePromotionSquare([row, col])
    }
  }

  async function handlePromotion(board, piece) {
    if (blackPromotion) {
      board[blackPromotionSquare[0]][blackPromotionSquare[1]] = Black | piece;
      setBlackPromotion(false);
    } else {
      board[whitePromotionSquare[0]][whitePromotionSquare[1]] = White | piece;
      setWhitePromotion(false);
    }
    setBoardState(board);
    setFenState(await translateBoardToFen(boardState));
  }

  async function checkLegalMoves(board, piece, sourceCol, sourceRow, targetCol, targetRow) {
      // checking piece's legal moves
      switch (piece) {
          case "wP":
              let returnPawnWhite = false;
              if (sourceCol === targetCol) {
                  if (sourceRow - targetRow === -1) {
                      if (board[targetRow][targetCol] === None) {
                        returnPawnWhite = true;
                      }
                  } else if (sourceRow - targetRow === -2 && sourceRow === 1) {
                      if (board[targetRow][targetCol] === None && board[targetRow - 1][targetCol] === None) {
                        returnPawnWhite = true;
                      }
                  }
              } else if (Math.abs(sourceCol - targetCol) === 1) {
                  if (sourceRow - targetRow === -1) {
                      if (((board[targetRow][targetCol] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[targetRow][targetCol]);
                          returnPawnWhite = true;
                      } else if (sourceRow === 4 && enPassant !== None) {
                          if (enPassant.col === targetCol) {
                              // setTempPieceTaken(board[enPassant.row][enPassant.col]);
                              board[enPassant.row][enPassant.col] = None;
                              return true;
                          }
                      }
                  }
              }
              if (targetRow === 7 && returnPawnWhite) {
                setPromotion(White, targetRow, targetCol);
              }
              return returnPawnWhite;
          case "bP":
              let returnPawnBlack = false;
              if (sourceCol === targetCol) {
                  if (sourceRow - targetRow === 1) {
                      if (board[targetRow][targetCol] === None) {
                          returnPawnBlack = true;
                      }
                  } else if (sourceRow - targetRow === 2 && sourceRow === 6) {
                      if (board[targetRow][targetCol] === None && board[targetRow + 1][targetCol] === None) {
                          returnPawnBlack = true;
                      }
                  }
              } else if (Math.abs(sourceCol - targetCol) === 1) {
                  if (sourceRow - targetRow === 1) {
                      if (((board[targetRow][targetCol] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[targetRow][targetCol]);
                          returnPawnBlack = true;
                      } else if (sourceRow === 3 && enPassant !== None) {
                          if (enPassant.col === targetCol) {
                              // setTempPieceTaken(board[enPassant.row][enPassant.col]);
                              board[enPassant.row][enPassant.col] = None;
                              return true;
                          }
                      }
                  }
              }
              if (targetRow === 0 && returnPawnBlack) {
                setPromotion(Black, targetRow, targetCol);
              }
              return returnPawnBlack;
          case "wN":
              if (((Math.abs(sourceCol - targetCol) === 1) && (Math.abs(sourceRow - targetRow) === 2)) || ((Math.abs(sourceCol - targetCol) === 2) && (Math.abs(sourceRow - targetRow) === 1))) {
                  if (board[targetRow][targetCol] === 0) {
                      console.log("empty")
                      return true;
                  } else if (((board[targetRow][targetCol] >> 4) & 1) === 1) { // if the piece is black
                      console.log("black")
                      // setTempPieceTaken(board[targetRow][targetCol]);
                      return true;
                  }
              }
              break;
          case "bN":
              if (((Math.abs(sourceCol - targetCol) === 1) && (Math.abs(sourceRow - targetRow) === 2)) || ((Math.abs(sourceCol - targetCol) === 2) && (Math.abs(sourceRow - targetRow) === 1))) {
                  if (board[targetRow][targetCol] === 0) {
                      return true;
                  } else if (((board[targetRow][targetCol] >> 3) & 1) === 1) { // if the piece is white
                      // setTempPieceTaken(board[targetRow][targetCol]);
                      return true;
                  }
              }
              break;
          case "wB":
              if (Math.abs(sourceCol - targetCol) === Math.abs(sourceRow - targetRow)) {
                  let i = sourceRow;
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (i !== targetRow && j !== targetCol) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[i][j] === None) {
                          blankSpaces++;
                          console.log(blankSpaces)
                      } else if (j !== targetCol && board[i][j] !== None) {
                          return false;
                      } else if (((board[i][j] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[i][j]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      return true;
                  }
              }
              break;
          case "bB":
              if (Math.abs(sourceCol - targetCol) === Math.abs(sourceRow - targetRow)) {
                  let i = sourceRow;
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (i !== targetRow && j !== targetCol) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[i][j] === None) {
                          blankSpaces++;
                          console.log(blankSpaces)
                      } else if (j !== targetCol && board[i][j] !== None) {
                          return false;
                      } else if (((board[i][j] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[i][j]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      return true;
                  }
              }
              break;
          case "wR":
              let returnValWhite = false;
              if (sourceCol === targetCol) {
                  let i = sourceRow;
                  let blankSpaces = 0;
                  while (i !== targetRow) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (board[i][targetCol] === None) {
                          blankSpaces++;
                      } else if (i !== targetRow && board[i][targetCol] !== None) {
                          return false;
                      } else if (((board[i][targetCol] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[i][targetCol]);
                          returnValWhite = true;
                          break;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceRow - targetRow)) {
                    returnValWhite = true;
                  }
              } else if (sourceRow === targetRow) {
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (j !== targetCol) {
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[targetRow][j] === None) {
                          blankSpaces++;
                      } else if (j !== targetCol && board[targetRow][j] !== None) {
                          return false;
                      } else if (((board[targetRow][j] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[targetRow][j]);
                          returnValWhite = true;
                          break;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                    returnValWhite = true;
                  }
              }
              // check if this move disables castling
              if (whiteCanCastleLeft === true && sourceCol === 0 && sourceRow === 0) {
                  setWhiteCanCastleLeft(false);
              } else if (whiteCanCastleRight === true && sourceCol === 0 && sourceRow === 7) {
                  setWhiteCanCastleRight(false);
              }
              return returnValWhite;
          case "bR":
              let returnValBlack = false;
              if (sourceCol === targetCol) {
                  let i = sourceRow;
                  let blankSpaces = 0;
                  while (i !== targetRow) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (board[i][targetCol] === None) {
                          blankSpaces++;
                      } else if (i !== targetRow && board[i][targetCol] !== None) {
                        return false;
                      } else if (((board[i][targetCol] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[i][targetCol]);
                          returnValBlack = true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceRow - targetRow)) {
                      returnValBlack = true;
                  }
              } else if (sourceRow === targetRow) {
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (j !== targetCol) {
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[targetRow][j] === None) {
                          blankSpaces++;
                      } else if (j !== targetCol && board[targetRow][j] !== None) {
                          return false;
                      } else if (((board[targetRow][j] >> 3) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[targetRow][j]);
                          returnValBlack = true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      returnValBlack = true;
                  }
              }
              // check if this move disables castling
              if (blackCanCastleLeft === true && sourceCol === 0 && sourceRow === 7) {
                  setBlackCanCastleLeft(false);
              } else if (blackCanCastleRight === true && sourceCol === 7 && sourceRow === 7) {
                  setBlackCanCastleRight(false);
              }
              return returnValBlack;
          case "wQ":
              if (Math.abs(sourceCol - targetCol) === Math.abs(sourceRow - targetRow)) {
                  let i = sourceRow;
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (i !== targetRow && j !== targetCol) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[i][j] === None) {
                          blankSpaces++;
                      } else if (j !== targetCol && board[i][j] !== None) {
                          return false;
                      } else if (((board[i][j] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[i][j]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      return true;
                  }
              } else if (sourceCol === targetCol) {
                  let i = sourceRow;
                  let blankSpaces = 0;
                  while (i !== targetRow) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (board[i][targetCol] === None) {
                          blankSpaces++;
                      } else if (i !== targetRow && board[i][targetCol] !== None) {
                          return false;
                      } else if (((board[i][targetCol] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[i][targetCol]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceRow - targetRow)) {
                      return true;
                  }
              } else if (sourceRow === targetRow) {
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (j !== targetCol) {
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[targetRow][j] === None) {
                          blankSpaces++;
                      } else if (j !== targetCol && board[targetRow][j] !== None) {
                          return false;
                      } else if (((board[targetRow][j] >> 4) & 1) === 1) { // if the piece is black
                          // setTempPieceTaken(board[targetRow][j]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      return true;
                  }
              }
              break;
          case "bQ":
              if (Math.abs(sourceCol - targetCol) === Math.abs(sourceRow - targetRow)) {
                  let i = sourceRow;
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (i !== targetRow && j !== targetCol) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[i][j] === None) {
                          blankSpaces++;
                      } else if (j !== targetCol && board[i][j] !== None) {
                          return false;
                      } else if (((board[i][j] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[i][j]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      return true;
                  }
              } else if (sourceCol === targetCol) {
                  let i = sourceRow;
                  let blankSpaces = 0;
                  while (i !== targetRow) {
                      if (i < targetRow) {
                          i++;
                      } else {
                          i--;
                      }
                      if (board[i][targetCol] === None) {
                          blankSpaces++;
                      } else if (i !== targetRow && board[i][targetCol] !== None) {
                          return false;
                      } else if (((board[i][targetCol] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[i][targetCol]);
                          return true;
                      }
                  }
                  if (blankSpaces === Math.abs(sourceRow - targetRow)) {
                      return true;
                  }
              } else if (sourceRow === targetRow) {
                  let j = sourceCol;
                  let blankSpaces = 0;
                  while (j !== targetCol) {
                      if (j < targetCol) {
                          j++;
                      } else {
                          j--;
                      }
                      if (board[targetRow][j] === None) {
                          blankSpaces++;
                      } else if (j !== targetCol && board[targetRow][j] !== None) {
                          return false;
                      } else if (((board[targetRow][j] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[targetRow][j]);
                          return true;
                      } 
                  }
                  if (blankSpaces === Math.abs(sourceCol - targetCol)) {
                      return true;
                  }
              }
              break;
          case "wK":
              if (Math.abs(sourceCol - targetCol) <= 1 && Math.abs(sourceRow - targetRow) <= 1) {
                  if (!(await isSquareThreatened(Black, board, targetCol, targetRow))) {
                      if (board[targetRow][targetCol] === None) {
                          if (whiteCanCastleLeft || whiteCanCastleRight) {
                            setWhiteCanCastleLeft(false);
                            setWhiteCanCastleRight(false);
                          }
                          return true;
                      } else if (((board[targetRow][targetCol] >> 4) & 1) === 1) { // if the piece is black
                          if (whiteCanCastleLeft || whiteCanCastleRight) {
                            setWhiteCanCastleLeft(false);
                            setWhiteCanCastleRight(false);
                          }
                          // setTempPieceTaken(board[targetRow][targetCol]);
                          return true;
                      } else {
                          return false;
                      }
                  }
              } else if (sourceCol - targetCol === -2 && sourceRow - targetRow === 0) { // castle right
                  console.log("castle right")
                  if (whiteCanCastleRight) {
                      if (board[0][5] === None && board[0][6] === None && board[0][7] === (White | Rook)) {
                          if (!(await isSquareThreatened(Black, board, 4, 0)) && !(await isSquareThreatened(Black, board, 5, 0)) && !(await isSquareThreatened(Black, board, 6, 0))) {
                              setWhiteCanCastleLeft(false);
                              setWhiteCanCastleRight(false);
                              return true;
                          }
                      }
                  }
              } else if (sourceCol - targetCol === 2 && sourceRow - targetRow === 0) { //castle left
                  console.log("castle left")
                  if (whiteCanCastleLeft) {
                      if (board[0][3] === None && board[0][2] === None && board[0][1] === None && board[0][0] === (White | Rook)) {
                          if (!(await isSquareThreatened(Black, board, 4, 0)) && !(await isSquareThreatened(Black, board, 3, 0)) && !(await isSquareThreatened(Black, board, 2, 0))) {
                              setWhiteCanCastleLeft(false);
                              setWhiteCanCastleRight(false);
                              return true;
                          }
                      }
                  }
              }
              break;
          case "bK":
              if (Math.abs(sourceCol - targetCol) <= 1 && Math.abs(sourceRow - targetRow) <= 1) {
                  if (!(await isSquareThreatened(White, board, targetCol, targetRow))) {
                      if (board[targetRow][targetCol] === None) {
                          if (blackCanCastleLeft || blackCanCastleRight) {
                            setBlackCanCastleLeft(false);
                            setBlackCanCastleRight(false);
                          }
                          return true;
                      } else if (((board[targetRow][targetCol] >> 3) & 1) === 1) { // if the piece is white
                          // setTempPieceTaken(board[targetRow][targetCol]);
                          if (blackCanCastleLeft || blackCanCastleRight) {
                            setBlackCanCastleLeft(false);
                            setBlackCanCastleRight(false);
                          }
                          return true;
                      } else {
                          return false;
                      }
                  }
              } else if (sourceCol - targetCol === -2 && sourceRow - targetRow === 0) { // castle right
                  if (blackCanCastleRight) {
                      if (board[7][5] === None && board[7][6] === None && board[7][7] === (Black | Rook)) {
                          if (!(await isSquareThreatened(White, board, 4, 7)) && !(await isSquareThreatened(White, board, 5, 7)) && !(await isSquareThreatened(White, board, 6, 7))) {
                              setBlackCanCastleLeft(false);
                              setBlackCanCastleRight(false);
                              return true;
                          }
                      }
                  }
              } else if (sourceCol - targetCol === 2 && sourceRow - targetRow === 0) { // castle left
                  if (blackCanCastleLeft) {
                      if (board[7][3] === None && board[7][2] === None && board[7][1] === None && board[7][0] === (Black | Rook)) {
                          if (!(await isSquareThreatened(White, board, 4, 7)) && !(await isSquareThreatened(White, board, 3, 7)) && !(await isSquareThreatened(White, board, 2, 7))) {
                              setBlackCanCastleLeft(false);
                              setBlackCanCastleRight(false);
                              return true;
                          }
                      }
                  }
              }
              break;
          default:
              break;
      }
      console.log("false")
      return false;
  }

  // renders pieces taken
  function renderlist(piecesTaken, id) {
    return piecesTaken.map(function(item, i) {
      switch (item) {
        case King | White:
          return (<div key={i + id}>King</div>)
        case Pawn | White:
          return (<div key={i + id}>Pawn</div>)
        case Knight | White:
          return (<div key={i + id}>Knight</div>)
        case Bishop | White:
          return (<div key={i + id}>Bishop</div>)
        case Rook | White:
          return (<div key={i + id}>Rook</div>)
        case Queen | White:
          return (<div key={i + id}>Queen</div>)
        case King | Black:
          return (<div key={i + id}>King</div>)
        case Pawn | Black:
          return (<div key={i + id}>Pawn</div>)
        case Knight | Black:
          return (<div key={i + id}>Knight</div>)
        case Bishop | Black:
          return (<div key={i + id}>Bishop</div>)
        case Rook | Black:
          return (<div key={i + id}>Rook</div>)
        case Queen | Black:
          return (<div key={i + id}>Queen</div>)
      }
    });
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        border: "1px solid black",
      }}
    >
      <div>
        {blackPromotion && (
          <div>
            <button onClick={() => handlePromotion(boardState, Queen)}>Queen</button>
            <button onClick={() => handlePromotion(boardState, Rook)}>Rook</button>
            <button onClick={() => handlePromotion(boardState, Bishop)}>Bishop</button>
            <button onClick={() => handlePromotion(boardState, Knight)}>Knight</button>
          </div>
        )}
      </div>
      <div>
        <h1>Black: {renderlist(blackPiecesTaken, 100)}</h1>
      </div>
      <div>
        <Chessboard
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          id="BasicBoard"
          boardWidth={800}
          position={fenState}
          onPieceDrop={onDrop}
          boardOrientation={location.state.orientation}
          arePiecesDraggable={isPlayerTurn}
        />
      </div>
      <div>
        <h1>White: {renderlist(whitePiecesTaken, 0)}</h1>
      </div>
      <div>
        {whitePromotion && (
          <div>
            <button onClick={() => handlePromotion(boardState, Queen)}>Queen</button>
            <button onClick={() => handlePromotion(boardState, Rook)}>Rook</button>
            <button onClick={() => handlePromotion(boardState, Bishop)}>Bishop</button>
            <button onClick={() => handlePromotion(boardState, Knight)}>Knight</button>
          </div>
        )}
      </div>
    </div>
  );
  }

  export default Game;
