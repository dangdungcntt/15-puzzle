import {ref}                                                 from 'vue';
import {shuffle}                                             from '../composables/helpers';
import Cell                                                  from '../model/Cell';
import {type BlockConfig,type BlockSpec, CellType, GameMode, type MapSpec} from '../model/GameConfig';
import {GAME_VIEWPORT_PADDING, LIMIT_GENERATE_TIMES}         from './constants';

export function buildInitData({gridCols, gridRows}: MapSpec): { requiredData: number[], shuffleData: number[] } {
    const requiredData: number[] = [0, 1];
    const shuffleData: number[] = [];

    for (let i = 2; i <= gridCols * gridRows; i++) {
        shuffleData.push(i);
    }

    return {requiredData, shuffleData};
}

export function buildResultMap({gridCols, gridRows}: MapSpec): number[][] {
    const results = [
        [0, ...[...Array(gridCols - 1)].map(() => -1)],
    ];

    for (let i = 1; i <= gridRows; i++) {
        let row = [];
        for (let j = 1; j <= gridCols; j++) {
            row.push((i - 1) * gridCols + j);
        }
        results.push(row);
    }

    return results;
}

export function generateValidBlocksState(results: number[][], requiredData: number[], shuffleData: number[], randFunc: () => number) {
    let blocks = null;
    let blockMaps = null;
    let times = 0;

    do {
        let state = generateBlocksState(results, requiredData, shuffleData, randFunc);
        blocks = state.blocks;
        blockMaps = state.blockMaps;
        if (times > LIMIT_GENERATE_TIMES) {
            break;
        }
        times++;
    } while (!isSolvable(blockMaps));

    return {blockMaps, blocks};
}

export function buildGameContainerSpec({blockSpec, mapSpec}: { blockSpec: BlockSpec, mapSpec: MapSpec }) {
    const CONTAINER_WIDTH = mapSpec.gridCols * (blockSpec.size + blockSpec.gap) + blockSpec.gap;
    const CONTAINER_HEIGHT = (mapSpec.gridRows + 1) * (blockSpec.size + blockSpec.gap) + blockSpec.gap;

    const BACKGROUND_WIDTH = mapSpec.gridCols * blockSpec.size + blockSpec.gap * (mapSpec.gridCols - 1);
    const BACKGROUND_HEIGHT = mapSpec.gridRows * blockSpec.size + blockSpec.gap * (mapSpec.gridRows - 1);

    return {
        height          : CONTAINER_HEIGHT,
        width           : CONTAINER_WIDTH,
        backgroundWidth : BACKGROUND_WIDTH,
        backgroundHeight: BACKGROUND_HEIGHT,
    };
}

export function buildBlockConfig({mode, mapSpec}: { mode: GameMode, mapSpec: MapSpec }, overrideConfig?: BlockSpec) {
    const isImageMode = mode == GameMode.IMAGE;
    const maxGridSize = Math.max(mapSpec.gridCols, mapSpec.gridRows);

    const GAP = overrideConfig ? overrideConfig.gap : (isImageMode ? 2 : (maxGridSize >= 12 ? 6 : (maxGridSize >= 8 ? 8 : 12)));
    const BORDER_RADIUS = overrideConfig ? overrideConfig.borderRadius : (isImageMode ? 2 : 10);

    return {gap: GAP, borderRadius: BORDER_RADIUS};
}

export function buildBlockSpec({blockConfig, mapSpec}: { blockConfig: BlockConfig, mapSpec: MapSpec }, {
    innerWidth,
    innerHeight
}: { innerWidth: number, innerHeight: number }) {
    const maxWidth = (innerWidth - GAME_VIEWPORT_PADDING * 2 - (mapSpec.gridCols + 1) * blockConfig.gap) / mapSpec.gridCols;
    const maxHeight = (innerHeight - GAME_VIEWPORT_PADDING * 2 - (mapSpec.gridRows + 2) * blockConfig.gap) / (mapSpec.gridRows + 1);
    const BLOCK_SIZE = Math.min(220, maxWidth, maxHeight);

    return {size: BLOCK_SIZE, gap: blockConfig.gap, borderRadius: blockConfig.borderRadius};
}

export function generateBlocksState(results: number[][], requiredData: number[], shuffeData: number[], randFunc: () => number) {
    const blocks = ref<Cell[]>([...requiredData, ...shuffle(shuffeData, randFunc)].map(value => {
        return new Cell({
            type : CellType.BLOCK,
            value: value,
            text : value?.toString(),
            row  : 0,
            col  : 0
        } as Cell);
    }));

    const blockMaps: Cell[][] = [];
    let takenBlockIndex = 0;

    for (let i = 0; i < results.length; i++) {
        let row = [];
        for (let j = 0; j < results[i].length; j++) {
            if (results[i][j] == -1) {
                row.push(new Cell({type: CellType.WALL, value: -1, row: i, col: j} as Cell));
                continue;
            }
            let cell = blocks.value[takenBlockIndex++];
            cell.row = i;
            cell.col = j;
            let [cX, cY] = convertValueToCorrectPosition(cell.value, results[i].length);
            cell.correctRow = cX;
            cell.correctCol = cY;

            row.push(cell);
        }
        blockMaps.push(row);
    }

    return {blocks, blockMaps};
}

export function convertValueToCorrectPosition(value: number, gridCols: number) {
    if (value == 0) {
        return [0, 0];
    }
    return [
        value % gridCols == 0 ? value / gridCols : (Math.floor(value / gridCols) + 1),
        value % gridCols == 0 ? gridCols - 1 : (value % gridCols - 1)
    ];
}

export function isSolvable(blockMaps: Cell[][]): boolean {
    let parity = 0;
    const gridRows = blockMaps.length;
    const gridColumns = blockMaps[0].length;

    let row = 0;
    let blankRow = 0;

    const puzzle = [];
    const cellOnlyBlockMaps = blockMaps.slice(1);

    cellOnlyBlockMaps[0][0].value = 0;

    for (let row of cellOnlyBlockMaps) {
        for (let cell of row) {
            puzzle.unshift(cell);
        }
    }

    for (let i = 0; i < puzzle.length; i++) {
        if (i % gridColumns == 0) {
            // advance to next row
            row++;
        }
        if (puzzle[i].value == 0) {
            blankRow = row;
            continue;
        }
        for (let j = i + 1; j < puzzle.length; j++) {
            if (puzzle[i].value < puzzle[j].value && puzzle[j].value != 0) {
                parity++;
            }
        }
    }

    cellOnlyBlockMaps[0][0].value = 1;

    if (gridColumns % 2 != 0) {
        return parity % 2 == 0;
    }

    if (gridRows % 2 == 0) {
        return (parity + blankRow + 1) % 2 == 0;
    }

    return (parity + blankRow + 1) % 2 != 0;
}
