import React from "react";
import "./App.css";
import {
  GRID_HEIGHT,
  HorizontalRect,
  MoveDirection,
  Piece,
  Square,
  SunSquare,
  VerticalRect,
} from "./piece";

/**
 * React 17 and Typescript 4 have some typechecking issues, we have to use these clunky requires
 * to get the src for our images. I can't even put it in a shared function for whatever reason.
 */
const {default: upArrow} = require("./assets/UpArrow.png") as {default: string};
const {default: downArrow} = require("./assets/DownArrow.png") as {default: string};
const {default: leftArrow} = require("./assets/LeftArrow.png") as {default: string};
const {default: rightArrow} = require("./assets/RightArrow.png") as {default: string};

const SUN_ID = 1;

const initialPieces: ReadonlyArray<Piece> = [
  new VerticalRect({x: 0, y: 0}, 0),
  new SunSquare({x: 1, y: 0}, SUN_ID),
  new VerticalRect({x: 3, y: 0}, 2),
  new HorizontalRect({x: 1, y: 2}, 3),
  new VerticalRect({x: 0, y: 3}, 4),
  new Square({x: 1, y: 3}, 5),
  new Square({x: 2, y: 3}, 6),
  new VerticalRect({x: 3, y: 3}, 7),
  new Square({x: 1, y: 4}, 8),
  new Square({x: 2, y: 4}, 9),
];

type PieceControlArrowProps = Readonly<{
  src: string;
  classNameSuffix: string;
  onClick: () => void;
}>;

function PieceControlArrow({src, classNameSuffix, onClick}: PieceControlArrowProps) {
  return <img src={src} alt={classNameSuffix} className={`PieceControlArrow--${classNameSuffix}`} onClick={(e) => {
    e.stopPropagation();
    onClick();
  }}/>;
}

type PieceControlsProps = Readonly<{
  canMove: (direction: MoveDirection) => boolean;
  onMove: (direction: MoveDirection) => void;
}>;

function PieceControls({canMove, onMove}: PieceControlsProps) {
  return <div className="PieceControls">
    {canMove("up") ? <PieceControlArrow src={upArrow} classNameSuffix="up" onClick={() => onMove("up")}/> : null}
    {canMove("down") ? <PieceControlArrow src={downArrow} classNameSuffix="down" onClick={() => onMove("down")}/> : null}
    {canMove("left") ? <PieceControlArrow src={leftArrow} classNameSuffix="left" onClick={() => onMove("left")}/> : null}
    {canMove("right") ? <PieceControlArrow src={rightArrow} classNameSuffix="right" onClick={() => onMove("right")}/> : null}
  </div>;
}

type PuzzlePieceProps = PieceControlsProps & Readonly<{
  piece: Piece;
  selected: boolean;
  onClick: () => void;
}>;

function PuzzlePiece({piece, selected, onClick, canMove, onMove}: PuzzlePieceProps) {
  const {x, y} = piece.getTopLeft();
  const {width, height} = piece.getDimensions();

  const pieceClassName = `PuzzlePiece PuzzlePiece--${selected ? "selected" : "unselected"}`;

  return <div className={pieceClassName} style={{
    width: 120 * width,
    height: 120 * height,
    left: 120 * x,
    top: 120 * y,
  }} onClick={onClick}>
    <div className="PuzzlePiece-label">{piece.getID()}</div>
    {selected ? <PieceControls canMove={canMove} onMove={onMove}/> : null}
  </div>;
}

function App() {
  const initializePieces = () => {
    const initialMap = new Map<number, Piece>();

    initialPieces.forEach((piece) => {
      initialMap.set(piece.getID(), piece);
    });

    return initialMap;
  }

  const [pieces, setPieces] = React.useState<ReadonlyMap<number, Piece>>(initializePieces);

  const [selected, setSelected] = React.useState<number>(-1);  // Point to a piece in the pieces map; -1 is null value

  const findPiece = (pieceID: number): Piece => {
    const piece = pieces.get(pieceID);
    if (piece == null) {
      throw new Error(`Could not find piece with ID ${pieceID}`);
    }
    return piece;
  };

  const checkWinCondition = (pieceID: number, piece: Piece, direction: MoveDirection): boolean => {
    if (direction === "down" && pieceID === SUN_ID) {
      const {x, y} = piece.getTopLeft();

      return x === 1 && y === GRID_HEIGHT - 2;
    }

    return false;
  };

  const canMoveWithOthers = (pieceID: number, direction: MoveDirection): boolean => {
    const piece = findPiece(pieceID);

    // Win condition check: If the Sun piece is in the bottom centre, it can move down to win
    if (checkWinCondition(pieceID, piece, direction)) {
      return true;
    }

    const canMoveAlone = piece.canMove(direction);
    if (!canMoveAlone) {
      return false;
    }

    // Simulate the move and check that it wouldn't overlap any of the other pieces
    const movedPiece = piece.move(direction);
    const movedPieceID = movedPiece.getID();  // Should be unchanged from pieceID, but we don't know the implementation
    const pieceIterator = pieces.entries();
    for (const [otherPieceID, otherPiece] of pieceIterator) {
      if (otherPieceID !== movedPieceID && otherPiece.intersects(movedPiece)) {
        return false;
      }
    }
    return true;
  };

  const onMove = (pieceID: number, direction: MoveDirection) => {
    const piece = findPiece(pieceID);

    // Win condition check: If the Sun piece is being moved off the board, win the game
    if (checkWinCondition(pieceID, piece, direction)) {
      window.alert("You win!!");
    }

    const movedPiece = piece.move(direction);
    const movedPieceID = movedPiece.getID();  // Should be unchanged from pieceID, but we don't know the implementation

    setPieces((oldPieces) => {
      const pieceIterator = oldPieces.entries();
      const updatedPieces = new Map();
      for (const [otherPieceID, otherPiece] of pieceIterator) {
        if (otherPieceID === movedPieceID) {
          updatedPieces.set(movedPieceID, movedPiece);
        } else {
          updatedPieces.set(otherPieceID, otherPiece);
        }
      }
      return updatedPieces;
    });
  };

  return <div className="App">
    <div className="App-board">{
      Array.from(pieces).map(([id, piece]) => {
        return <PuzzlePiece
          piece={piece}
          selected={id === selected}
          onClick={() => {setSelected(id)}}
          canMove={(direction) => canMoveWithOthers(id, direction)}
          onMove={(direction) => onMove(id, direction)}
          key={id}
        />;
      })
    }</div>
    <div className="App-resetButton">
      <button type="reset" onClick={() => {
        setPieces(initializePieces());
        setSelected(-1);
      }}>{"Reset"}</button>
    </div>
  </div>;
}

export default App;
