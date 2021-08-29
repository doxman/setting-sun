const GRID_WIDTH = 4;
export const GRID_HEIGHT = 5;

type PieceDimensions = {height: number; width: number};
type PiecePosition = {x: number; y: number};
export type MoveDirection = "up" | "down" | "left" | "right";

/**
 * Common interface for any piece of the Setting Sun puzzle.
 * Defines the methods we will need in App to interact with each piece.
 */
export type Piece = Readonly<{
    getDimensions: () => PieceDimensions;
    getTopLeft: () => PiecePosition;  // Coordinates of the top-left corner of the piece
    getID: () => number;  // Should be unique, or -1 (null value) for pieces that are children of other pieces
    canMove: (direction: MoveDirection) => boolean;  // Checks whether moving would put the piece out of bounds
    move: (direction: MoveDirection) => Piece;  // Returns the same piece with transformed top-left coordinates
    intersects: (other: Piece) => boolean;  // Checks if any of the coordinates within these two pieces overlap
}>;

/**
 * Helper that transforms a position by 1 point in a direction
 */
function movePosition(position: PiecePosition, direction: MoveDirection): PiecePosition {
    switch(direction) {
        case "up":
            return {x: position.x, y: position.y - 1};
        case "down":
            return {x: position.x, y: position.y + 1};
        case "left":
            return {x: position.x - 1, y: position.y};
        case "right":
            return {x: position.x + 1, y: position.y};
    }
}

/**
 * Helper that gets all positions covered by a piece, using its dimensions and top-left coordinate.
 * 
 * The positions are stringified because Set.has() can't do object equality; fortunately,
 * the PiecePositions will always be in the form {x, y} so stringifying and comparing them is safe.
 */
function getCoveredArea(piece: Piece): ReadonlySet<string> {
    const area: Set<string> = new Set();
    const {x, y} = piece.getTopLeft();
    const {width, height} = piece.getDimensions();

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            area.add(JSON.stringify({x: x + i, y: y + j}));
        }
    }

    return area;
}

/**
 * Helper that checks whether two areas (ie. sets of stringified positions from getCoveredArea()) overlap at all.
 */
function areasOverlap(area1: ReadonlySet<string>, area2: ReadonlySet<string>): boolean {
    // Implements set intersection by filtering area1 to only the points in area2
    return new Set([...area1].filter((point) => area2.has(point))).size > 0;
}

/**
 * Partial implementation of Piece that is extended by actual pieces to share method code
 */
class BasePiece {
    public constructor(protected readonly id: number) {}

    public getID() {
        return this.id;
    }
}

/**
 * Represents a 1x1 square, the smallest possible piece in this puzzle
 */
export class Square extends BasePiece implements Piece {
    public constructor(private readonly topLeft: PiecePosition, id: number) {
        super(id);
    }

    public getDimensions() {
        return {width: 1 as const, height: 1 as const};
    }

    public getTopLeft() {
        return this.topLeft;
    }

    public canMove(direction: MoveDirection) {
        switch(direction) {
            case "up":
                return this.topLeft.y > 0;
            case "down":
                return this.topLeft.y < GRID_HEIGHT - 1;
            case "left":
                return this.topLeft.x > 0;
            case "right":
                return this.topLeft.x < GRID_WIDTH - 1;
        }
    }

    public move(direction: MoveDirection) {
        return new Square(movePosition(this.topLeft, direction), this.id);
    }

    public intersects(other: Piece) {
        return areasOverlap(getCoveredArea(this), getCoveredArea(other));
    }
}

/**
 * Represents a 1x2 vertical rectangle; internally composed of 2 Squares
 */
export class VerticalRect extends BasePiece implements Piece {
    private readonly squares: [Square, Square];

    public constructor(topLeft: PiecePosition, id: number) {
        super(id);
        this.squares = [
            new Square(topLeft, -1),
            new Square({x: topLeft.x, y: topLeft.y + 1}, -1),
        ];
    }

    public getDimensions() {
        return {width: 1 as const, height: 2 as const};
    }

    public getTopLeft() {
        return this.squares[0].getTopLeft();
    }

    public canMove(direction: MoveDirection) {
        return this.squares.every((square) => square.canMove(direction));
    }

    public move(direction: MoveDirection) {
        return new VerticalRect(movePosition(this.getTopLeft(), direction), this.id);
    }

    public intersects(other: Piece) {
        return areasOverlap(getCoveredArea(this), getCoveredArea(other));
    }
}

/**
 * Represents a 2x1 horizontal rectangle; internally composed of 2 Squares
 */
export class HorizontalRect extends BasePiece implements Piece {
    private readonly squares: [Square, Square];

    public constructor(topLeft: PiecePosition, id: number) {
        super(id);
        this.squares = [
            new Square(topLeft, -1),
            new Square({x: topLeft.x + 1, y: topLeft.y}, -1),
        ];
    }

    public getDimensions() {
        return {width: 2 as const, height: 1 as const};
    }

    public getTopLeft() {
        return this.squares[0].getTopLeft();
    }

    public canMove(direction: MoveDirection) {
        return this.squares.every((square) => square.canMove(direction));
    }

    public move(direction: MoveDirection) {
        return new HorizontalRect(movePosition(this.getTopLeft(), direction), this.id);
    }

    public intersects(other: Piece) {
        return areasOverlap(getCoveredArea(this), getCoveredArea(other));
    }
}

/**
 * Represents a 2x2 square, the Sun piece of the puzzle; internally composed of 4 Squares
 */
export class SunSquare extends BasePiece implements Piece {
    private readonly squares: [Square, Square, Square, Square];  // Top row, then bottom row

    public constructor(topLeft: PiecePosition, id: number) {
        super(id);
        this.squares = [
            new Square(topLeft, -1),
            new Square({x: topLeft.x + 1, y: topLeft.y}, -1),
            new Square({x: topLeft.x, y: topLeft.y + 1}, -1),
            new Square({x: topLeft.x + 1, y: topLeft.y + 1}, -1),
        ];
    }

    public getDimensions() {
        return {width: 2 as const, height: 2 as const};
    }

    public getTopLeft() {
        return this.squares[0].getTopLeft();
    }

    public canMove(direction: MoveDirection) {
        return this.squares.every((square) => square.canMove(direction));
    }

    public move(direction: MoveDirection) {
        return new SunSquare(movePosition(this.getTopLeft(), direction), this.id);
    }

    public intersects(other: Piece) {
        return areasOverlap(getCoveredArea(this), getCoveredArea(other));
    }
}
