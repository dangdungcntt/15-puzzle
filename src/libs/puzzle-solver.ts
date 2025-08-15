import {convertValueToCorrectPosition} from "../logic/game";

enum SolveStatus {
    IDLE = 'IDLE', RUNNING = 'RUNNING'
}

let status: SolveStatus = SolveStatus.IDLE;

if (!document.getElementById('puzzle-resolver-style') && location.href.includes('auto_resolve_highlight=1')) {
    const style = document.createElement('style');
    style.id = 'puzzle-resolver-style';
    style.innerText = `.puzzle-resolver-target {background-color:#5daef4!important}`;
    document.head.appendChild(style);
}

export async function resolve(delay: string | undefined) {
    if (status == SolveStatus.RUNNING) {
        //Stop
        console.log('Stopped. An error will throw soon.')
        status = SolveStatus.IDLE;
        return;
    }
    status = SolveStatus.RUNNING;
    const DELAY = isNaN(Number(delay)) ? 500 : Number(delay);
    const SAME_COLS = [Position.TOP, Position.NEXT_TO_TOP, Position.CENTER, Position.NEXT_TO_BOTTOM, Position.BOTTOM];
    const SAME_ROWS = [Position.LEFT, Position.NEXT_TO_LEFT, Position.CENTER, Position.NEXT_TO_RIGHT, Position.RIGHT];
    const LEFT_SIDES = [Position.TOP_LEFT, Position.NEXT_TO_LEFT, Position.LEFT, Position.BOTTOM_LEFT];
    const RIGHT_SIDES = [Position.TOP_RIGHT, Position.NEXT_TO_RIGHT, Position.RIGHT, Position.BOTTOM_RIGHT];
    const TOP_SIDES = [Position.TOP_LEFT, Position.NEXT_TO_TOP, Position.TOP, Position.TOP_RIGHT];
    const BOTTOM_SIDES = [Position.BOTTOM_LEFT, Position.NEXT_TO_BOTTOM, Position.BOTTOM, Position.BOTTOM_RIGHT];

    const gameContainer: HTMLDivElement = document.querySelector('.game-container')!;
    const gameConfig = new GameConfig(
        parseInt(gameContainer.dataset['rows']!) + 1,
        parseInt(gameContainer.dataset['cols']!)
    );

    const map = initBlankMap(gameConfig);

    const blocks = Array.from(document.querySelectorAll('.block:not(.wall)'))
        .map(it => BlockWrapper.fromEl(it));

    blocks.forEach(it => {
        const [correctRow, correctCol] = convertValueToCorrectPosition(it.value, gameConfig.cols);
        it.setCorrectPosition(correctRow, correctCol);
        map[it.row][it.col] = it;
    });

    if (blocks.filter(it => !it.isCorrect).length == 0) {
        console.log('All block is correct. Stop.');
        status = SolveStatus.IDLE;
        return;
    }

    const start = Date.now();
    console.clear();
    console.log('Resolving...');

    const blankBlock = blocks.find(el => el.value == 0)!;

    let processingBlock: BlockWrapper | null = null;
    let ignoredBlock: Record<string, boolean> = {};

    for (let i = gameConfig.rows - 1; i > 2; i--) {
        for (let j = gameConfig.cols - 1; j >= 2; j--) {
            const block = blocks.find(it => it.correctRow == i && it.correctCol == j)!;
            console.log(`Moving ${block.value} to ${[block.correctRow, block.correctCol]}`);
            await moveBlockToPosition(block, [block.correctRow, block.correctCol]);
            block.markFreeze();
        }

        const firstBlock = blocks.find(it => it.correctRow == i && it.correctCol == 0)!;
        const secondBlock = blocks.find(it => it.correctRow == i && it.correctCol == 1)!;

        const isAligned = () => firstBlock.isCorrect && secondBlock.isCorrect;

        await moveBlockToPosition(firstBlock, [secondBlock.correctRow, secondBlock.correctCol], isAligned);
        firstBlock.markFreeze();

        const success = await moveBlockToPosition(secondBlock, [secondBlock.correctRow - 1, secondBlock.correctCol], isAligned);
        if (!success) {
            firstBlock.unFreeze();

            await moveBlockToPosition(secondBlock, [secondBlock.correctRow - 2, secondBlock.correctCol]);
            secondBlock.markFreeze();

            await moveBlockToPosition(firstBlock, [secondBlock.correctRow, secondBlock.correctCol]);
            firstBlock.markFreeze();

            secondBlock.unFreeze();
            await moveBlockToPosition(secondBlock, [secondBlock.correctRow - 1, secondBlock.correctCol]);
        }

        secondBlock.markFreeze();
        firstBlock.unFreeze();

        await moveBlockToPosition(firstBlock, [firstBlock.correctRow, firstBlock.correctCol]);
        firstBlock.markFreeze();
        secondBlock.unFreeze();

        await moveBlockToPosition(secondBlock, [secondBlock.correctRow, secondBlock.correctCol]);
        secondBlock.markFreeze();
    }

    for (let j = gameConfig.cols - 1; j > 1; j--) {
        const firstBlock = blocks.find(it => it.correctRow == 1 && it.correctCol == j)!;
        const secondBlock = blocks.find(it => it.correctRow == 2 && it.correctCol == j)!;

        const isAligned = () => firstBlock.isCorrect && secondBlock.isCorrect;

        await moveBlockToPosition(secondBlock, [firstBlock.correctRow, firstBlock.correctCol], isAligned);
        secondBlock.markFreeze();

        const success = await moveBlockToPosition(firstBlock, [firstBlock.correctRow, firstBlock.correctCol - 1], isAligned);
        if (!success) {
            secondBlock.unFreeze();
            await moveBlockToPosition(firstBlock, [firstBlock.correctRow, firstBlock.correctCol - 2]);
            firstBlock.markFreeze();
            secondBlock.unFreeze();
            await moveBlockToPosition(secondBlock, [firstBlock.correctRow, firstBlock.correctCol]);
            secondBlock.markFreeze();
            firstBlock.unFreeze();
            await moveBlockToPosition(firstBlock, [firstBlock.correctRow, firstBlock.correctCol - 1]);
        }
        firstBlock.markFreeze();
        secondBlock.unFreeze();

        await moveBlockToPosition(secondBlock, [secondBlock.correctRow, secondBlock.correctCol]);
        secondBlock.markFreeze();
        firstBlock.unFreeze();

        await moveBlockToPosition(firstBlock, [firstBlock.correctRow, firstBlock.correctCol]);
        firstBlock.markFreeze();
    }

    //Còn lại 4 ô nhưng chỉ cần gọi hàm xếp ô số 2 và ô số 1 thì các ô còn lại sẽ tự đúng vị trí
    const _2bl = blocks.find(it => it.value == 2)!;
    await moveBlockToPosition(_2bl, [_2bl.correctRow, _2bl.correctCol]);
    _2bl.markFreeze();

    const _1bl = blocks.find(it => it.value == 1)!;
    await moveBlockToPosition(_1bl, [_1bl.correctRow, _1bl.correctCol]);
    _1bl.markFreeze();

    status = SolveStatus.IDLE;
    console.log(`Resolved in ${(Date.now() - start) / 1000}s`);
    clearHighlightEl();

    async function moveBlockToPosition(block: BlockWrapper, targetPosition: PairNumber, preRun?: () => boolean): Promise<boolean> {
        let status = MoveBlockResult.STEPPED;

        do {
            if (preRun && preRun()) {
                status = MoveBlockResult.COMPLETED;
                break;
            }

            processingBlock = block;

            status = await doMoveBlock(block, targetPosition);
        } while (status == MoveBlockResult.STEPPED);

        ignoredBlock = {};

        return status == MoveBlockResult.COMPLETED;
    }

    async function doMoveBlock(block: BlockWrapper, targetPosition: PairNumber): Promise<MoveBlockResult> {
        if (status !== SolveStatus.RUNNING) {
            throw new Error('puzzle-resolver: Invalid status');
        }

        if (!block.isImage) {
            clearHighlightEl();
            block.getEl().classList.add('puzzle-resolver-target');
        }

        const block_target_p = calculateRelativePosition([block.row, block.col], targetPosition);

        if (block_target_p == Position.CENTER) {
            return MoveBlockResult.COMPLETED;
        }

        if (blankBlock.row == 0) {
            console.log('Move blank block down due to row == 0');
            await move(Move.DOWN);
        }

        const blank_block_p = calculateRelativePosition([blankBlock.row, blankBlock.col], [block.row, block.col]);

        if (SAME_COLS.includes(blank_block_p)) {
            if (blank_block_p == Position.NEXT_TO_TOP) {
                //Ô trống đứng bên trên ô mục tiêu
                if (BOTTOM_SIDES.includes(block_target_p)) {
                    await move(Move.DOWN);
                } else {
                    const [mainMove, fallbacks] = logicalMove(
                        LEFT_SIDES.includes(block_target_p) || block.col == 0,
                        [[Move.RIGTH, 1], [Move.LEFT, Move.UP]],
                        [[Move.LEFT, 1], [Move.RIGTH, Move.UP]]
                    );

                    if (!await tryMove(mainMove[0], fallbacks, ignorePosition, mainMove[1])) {
                        console.log('Cannot find next step ' + Position.NEXT_TO_TOP);
                        return MoveBlockResult.FAILED;
                    }
                }
                return MoveBlockResult.STEPPED;
            }

            if (blank_block_p == Position.NEXT_TO_BOTTOM) {
                //Ô trống đứng bên dưới ô mục tiêu

                if (TOP_SIDES.includes(block_target_p)) {
                    await move(Move.UP);
                } else {
                    const [mainMove, fallbacks] = logicalMove(
                        LEFT_SIDES.includes(block_target_p) || block.col == 0,
                        [[Move.RIGTH, 1], [Move.LEFT, Move.DOWN]],
                        [[Move.LEFT, 1], [Move.RIGTH, Move.DOWN]]
                    );

                    if (!await tryMove(mainMove[0], fallbacks, ignorePosition, mainMove[1])) {
                        console.log('Cannot find next step ' + Position.NEXT_TO_BOTTOM);
                        return MoveBlockResult.FAILED;
                    }
                }
                return MoveBlockResult.STEPPED;
            }

            const [mainMove, fallbacks] = logicalMove(
                blank_block_p == Position.TOP,
                [[Move.DOWN, block.row - blankBlock.row - (BOTTOM_SIDES.includes(block_target_p) ? 0 : 1)], [Move.LEFT, Move.RIGTH, Move.UP]],
                [[Move.UP, blankBlock.row - block.row - (TOP_SIDES.includes(block_target_p) ? 0 : 1)], [Move.LEFT, Move.RIGTH, Move.DOWN]]
            );

            if (!await tryMove(mainMove[0], fallbacks, ignorePosition, mainMove[1])) {
                console.log('Cannot find next step SAME_COLS');
                return MoveBlockResult.FAILED;
            }

            return MoveBlockResult.STEPPED;
        }

        if (SAME_ROWS.includes(blank_block_p)) {
            if (blank_block_p == Position.NEXT_TO_LEFT) {
                //Ô trống đứng bên trái ô mục tiêu
                if (RIGHT_SIDES.includes(block_target_p)) {
                    await move(Move.RIGTH);
                } else {
                    const [mainMove, fallbacks] = logicalMove(
                        TOP_SIDES.includes(block_target_p) || block.row == 1,
                        [[Move.DOWN, 1], [Move.UP, Move.LEFT]],
                        [[Move.UP, 1], [Move.DOWN, Move.LEFT]]
                    );

                    if (!await tryMove(mainMove[0], fallbacks, ignorePosition, mainMove[1])) {
                        console.log('Cannot find next step ' + Position.NEXT_TO_LEFT);
                        return MoveBlockResult.FAILED;
                    }
                }
                return MoveBlockResult.STEPPED;
            }

            if (blank_block_p == Position.NEXT_TO_RIGHT) {
                //Ô trống đứng bên phải ô mục tiêu
                if (LEFT_SIDES.includes(block_target_p)) {
                    await move(Move.LEFT);
                } else {
                    const [mainMove, fallbacks] = logicalMove(
                        TOP_SIDES.includes(block_target_p) || block.row == 1,
                        [[Move.DOWN, 1], [Move.UP, Move.RIGTH]],
                        [[Move.UP, 1], [Move.DOWN, Move.RIGTH]]
                    );

                    if (!await tryMove(mainMove[0], fallbacks, ignorePosition, mainMove[1])) {
                        console.log('Cannot find next step ' + Position.NEXT_TO_RIGHT);
                        return MoveBlockResult.FAILED;
                    }
                }
                return MoveBlockResult.STEPPED;
            }

            const [mainMove, fallbacks] = logicalMove(
                blank_block_p == Position.LEFT,
                [[Move.RIGTH, block.col - blankBlock.col - (RIGHT_SIDES.includes(block_target_p) ? 0 : 1)], [Move.LEFT, Move.DOWN, Move.UP]],
                [[Move.LEFT, blankBlock.col - block.col - (LEFT_SIDES.includes(block_target_p) ? 0 : 1)], [Move.RIGTH, Move.DOWN, Move.UP]]
            );

            if (!await tryMove(mainMove[0], fallbacks, ignorePosition, mainMove[1])) {
                console.log('Cannot find next step SAME_ROWS');
                return MoveBlockResult.FAILED;
            }
            return MoveBlockResult.STEPPED;
        }

        let logicalMoveResult: LogicalMove | null = null;

        switch (blank_block_p) {
            case Position.TOP_LEFT:
                logicalMoveResult = logicalMove(
                    TOP_SIDES.includes(block_target_p) || RIGHT_SIDES.includes(block_target_p),
                    [[Move.DOWN, block.row - blankBlock.row + (TOP_SIDES.includes(block_target_p) ? 1 : 0)], [Move.RIGTH, Move.UP, Move.LEFT]],
                    [[Move.RIGTH, block.col - blankBlock.col + (LEFT_SIDES.includes(block_target_p) ? 1 : 0)], [Move.DOWN, Move.UP, Move.LEFT]],
                )
                break;
            case Position.TOP_RIGHT:
                logicalMoveResult = logicalMove(
                    TOP_SIDES.includes(block_target_p) || LEFT_SIDES.includes(block_target_p),
                    [[Move.DOWN, block.row - blankBlock.row + (TOP_SIDES.includes(block_target_p) ? 1 : 0)], [Move.LEFT, Move.UP, Move.RIGTH]],
                    [[Move.LEFT, blankBlock.col - block.col + (RIGHT_SIDES.includes(block_target_p) ? 1 : 0)], [Move.DOWN, Move.UP, Move.RIGTH]],
                )
                break;
            case Position.BOTTOM_LEFT:
                logicalMoveResult = logicalMove(
                    TOP_SIDES.includes(block_target_p) || LEFT_SIDES.includes(block_target_p),
                    [[Move.RIGTH, block.col - blankBlock.col], [Move.UP, Move.LEFT, Move.DOWN]],
                    [[Move.UP, blankBlock.row - block.row], [Move.RIGTH, Move.LEFT, Move.DOWN]],
                )
                break;
            case Position.BOTTOM_RIGHT:
                logicalMoveResult = logicalMove(
                    TOP_SIDES.includes(block_target_p) || RIGHT_SIDES.includes(block_target_p),
                    [[Move.LEFT, blankBlock.col - block.col], [Move.UP, Move.RIGTH, Move.DOWN]],
                    [[Move.UP, blankBlock.row - block.row], [Move.LEFT, Move.RIGTH, Move.DOWN]],
                )
                break;
        }

        if (!logicalMoveResult || !await tryMove(logicalMoveResult[0][0], logicalMoveResult[1], ignorePosition, logicalMoveResult[0][1])) {
            console.log(`Cannot find next step where ${blank_block_p}`);
            return MoveBlockResult.FAILED;
        }

        return MoveBlockResult.STEPPED;
    }

    function ignorePosition(blankBlockPosition: PairNumber) {
        if (processingBlock) {
            ignoredBlock[`${processingBlock.value} - ${processingBlock.row} - ${processingBlock.col}--${blankBlockPosition[0]} - ${blankBlockPosition[1]}`] = true;
        }
    }

    async function tryMove(moveType: Move, fallbacks: Move[], onFallback: (p: PairNumber) => void, times: number = 1): Promise<boolean> {
        if (await move(moveType, times)) {
            return true;
        }

        for (let index = 0; index < fallbacks.length; index++) {
            const element = fallbacks[index];
            const currentBlankBlockPosition = [blankBlock.row, blankBlock.col];
            if (await move(element)) {
                onFallback(currentBlankBlockPosition);
                return true;
            }
        }

        return false;
    }

    function move(moveType: Move, maxTimes: number = 1) {
        return new Promise<boolean>(resolve => {
            const oneTimeDelta = transformMove(moveType, 1);
            let possibleTimes = 0;
            const current = [blankBlock.row, blankBlock.col];
            while (possibleTimes < maxTimes) {
                current[0] += oneTimeDelta[0];
                current[1] += oneTimeDelta[1];
                if (!map[current[0]] || !map[current[0]][current[1]]) {
                    console.log(`Move: Not exists target ${current}`);
                    break;
                }

                if (map[current[0]][current[1]].value == -1 || map[current[0]][current[1]].freeze) {
                    console.log(`Move: -1 or frezee ${current}`);
                    break;
                }

                if (processingBlock && ignoredBlock[`${processingBlock.value} - ${processingBlock.row} - ${processingBlock.col}--${current[0]} - ${current[1]}`]) {
                    console.log(`Move: -1 or frezee ${current}`);
                    break;
                }
                possibleTimes++;
            }

            if (possibleTimes == 0) {
                resolve(false);
                return;
            }

            const currentBlankPosition: PairNumber = [blankBlock.row, blankBlock.col]
            const [rowDelta, colDelta] = transformMove(moveType, possibleTimes);
            const targetBlock: PairNumber = [blankBlock.row + rowDelta, blankBlock.col + colDelta]
            map[targetBlock[0]][targetBlock[1]].click();
            setTimeout(() => {
                let oneTimeDelta = transformMove(moveType, 1);

                let t = 0;
                while (t < possibleTimes) {
                    swap(map, currentBlankPosition, [currentBlankPosition[0] + oneTimeDelta[0], currentBlankPosition[1] + oneTimeDelta[1]]);
                    currentBlankPosition[0] += oneTimeDelta[0];
                    currentBlankPosition[1] += oneTimeDelta[1];
                    t++;
                }

                resolve(true);
            }, DELAY)
        })
    }
}

function clearHighlightEl() {
    if (document.querySelector('.puzzle-resolver-target')) {
        document.querySelector('.puzzle-resolver-target')?.classList.remove('puzzle-resolver-target')
    }
}

function calculateRelativePosition([row, col]: PairNumber, [targetRow, targetCol]: PairNumber): Position {
    if (row == targetRow) {
        if (col == targetCol) {
            return Position.CENTER;
        }

        if (Math.abs(col - targetCol) == 1) {
            return (col - targetCol) == -1 ? Position.NEXT_TO_LEFT : Position.NEXT_TO_RIGHT;
        }

        return col < targetCol ? Position.LEFT : Position.RIGHT;
    }

    if (row < targetRow) {
        if (col == targetCol) {
            return (row - targetRow) == -1 ? Position.NEXT_TO_TOP : Position.TOP;
        }

        return col < targetCol ? Position.TOP_LEFT : Position.TOP_RIGHT;
    }

    if (col == targetCol) {
        return (row - targetRow) == 1 ? Position.NEXT_TO_BOTTOM : Position.BOTTOM;
    }

    return col < targetCol ? Position.BOTTOM_LEFT : Position.BOTTOM_RIGHT;
}

function logicalMove(condition: boolean, truePhase: LogicalMove, falsePhase: LogicalMove) {
    return condition ? truePhase : falsePhase;
}

function transformMove(move: Move, times: number = 1): PairNumber {
    switch (move) {
        case Move.UP:
            return [-times, 0];
        case Move.DOWN:
            return [times, 0];
        case Move.LEFT:
            return [0, -times];
        case Move.RIGTH:
            return [0, times];
    }
}

function swap(map: BlockWrapper[][], [row1, col1]: PairNumber, [row2, col2]: PairNumber) {
    const tmp = map[row2][col2];
    map[row2][col2] = map[row1][col1];
    map[row1][col1] = tmp;
}

function initBlankMap(gameConfig: GameConfig): BlockWrapper[][] {
    const map = [];
    const tmpEl = document.createElement('div');
    for (let i = 0; i < gameConfig.rows; i++) {
        const r = [];
        for (let j = 0; j < gameConfig.cols; j++) {
            r.push(BlockWrapper.fromEl(tmpEl));
        }
        map.push(r);
    }
    return map;
}

type Pair<Type> = Type[];

type PairNumber = Pair<number>;

interface LogicalMove extends Array<[Move, number] | Move[]> { 0: [Move, number]; 1: Move[] }

enum Move {
    UP = 'UP', DOWN = 'DOWN', LEFT = 'LEFT', RIGTH = 'RIGHT'
}

enum MoveBlockResult {
    COMPLETED = 'COMPLETED', FAILED = 'FAILED', STEPPED = 'STEPPED'
}

enum Position {
    TOP = 'TOP', RIGHT = 'RIGHT', BOTTOM = 'BOTTOM', LEFT = 'LEFT',
    TOP_LEFT = 'TOP_LEFT', TOP_RIGHT = 'TOP_RIGHT', BOTTOM_LEFT = 'BOTTOM_LEFT', BOTTOM_RIGHT = 'BOTTOM_RIGHT',
    CENTER = 'CENTER',
    NEXT_TO_LEFT = 'NEXT_TO_LEFT', NEXT_TO_RIGHT = 'NEXT_TO_RIGHT', NEXT_TO_TOP = 'NEXT_TO_TOP', NEXT_TO_BOTTOM = 'NEXT_TO_BOTTOM'
}

class GameConfig {
    rows: number;
    cols: number;

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;
    }
}

class BlockWrapper {
    private readonly el: HTMLDivElement;
    private readonly val: number;
    private cRow: number;
    private cCol: number;
    private isFreeze: boolean;

    constructor(el: HTMLDivElement) {
        this.el = el;
        this.cRow = -1;
        this.cCol = -1;
        this.val = parseInt(this.el.dataset['value'] || '-1');
        this.isFreeze = false;
    }

    public click() {
        this.el.click();
    }

    public static fromEl(el: Element) {
        return new BlockWrapper(el as HTMLDivElement);
    }

    public getEl() {
        return this.el
    }

    public markFreeze() {
        this.isFreeze = true;
    }

    public unFreeze() {
        this.isFreeze = false;
    }

    public setCorrectPosition(row: number, col: number) {
        this.cRow = row;
        this.cCol = col;
    }

    public get row(): number {
        return parseInt(this.el.dataset['currentRow']!)
    }

    public get col(): number {
        return parseInt(this.el.dataset['currentCol']!)
    }

    public get value(): number {
        return this.val;
    }

    public get freeze(): boolean {
        return this.isFreeze;
    }

    public get correctRow(): number {
        return this.cRow;
    }

    public get correctCol(): number {
        return this.cCol;
    }

    public get isCorrect(): boolean {
        return this.row === this.cRow && this.col === this.cCol;
    }

    public get isImage(): boolean {
        return this.el.classList.contains('block-mode-image')
    }
}
