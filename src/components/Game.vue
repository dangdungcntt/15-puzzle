<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { formatDuration, millisecondsToStr } from '../composables/helpers';
import { GAME_VIEWPORT_PADDING, SCREEN_PADDING_TOP } from '../logic/constants';
import { buildBlockConfig, buildBlockSpec, buildGameContainerSpec, buildInitData, buildResultMap, generateValidBlocksState } from '../logic/game';
import { BlockSpec, ContainerSpec, GameConfig, GameMode, GameStatus, ImageModeConfig, MapSpec } from '../model/GameConfig';
import Block from './Block.vue';
import ZoomableImage from './ZoomableImage.vue';
import { useRoute } from 'vue-router';
import { computed } from '@vue/reactivity';
import Cell from '../model/Cell';
import { createRandom } from '../libs/seed-random';

const route = useRoute();

const { mode, mapSpec, image, pin } = defineProps<{ mode: GameMode, image?: ImageModeConfig, mapSpec: MapSpec, pin?: string }>();

const config = reactive<GameConfig>({
    mode,
    image: image || {
        url: ''
    },
    mapSpec: mapSpec,
    blockConfig: buildBlockConfig({ mode, mapSpec })
});

const blockSpec = computed<BlockSpec>(() => buildBlockSpec(config, {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight - SCREEN_PADDING_TOP
}))

const containerSpec = computed<ContainerSpec>(() => buildGameContainerSpec({ blockSpec: blockSpec.value, mapSpec: config.mapSpec }))

const results = buildResultMap(config.mapSpec);

const { requiredData, shuffleData } = buildInitData(config.mapSpec);

const randFunc = pin ? createRandom(pin) : () => Math.random();

const { blocks, blockMaps } = generateValidBlocksState(results, requiredData, shuffleData, randFunc);

const blankBlock = ref<Cell>(blocks.value[0]);

if (!blankBlock.value) {
    alert('Error when init game!');
    console.error('Missing blank block', blocks, blockMaps);
    throw new Error('Missing blank block');
}

const keyboardKeyToActions: Record<string, number[]> = {
    'ArrowUp': [-1, 0],
    'w': [-1, 0],
    'ArrowRight': [0, 1],
    'd': [0, 1],
    'ArrowDown': [1, 0],
    's': [1, 0],
    'ArrowLeft': [0, -1],
    'a': [0, -1],
};

const state = reactive<{
    status: GameStatus,
    moveCount: number,
    startedAt: number,
    resumedAt: number,
    currentTime: number,
    playedTime: number,
    completedAt: number,
    currentTimeItv: number,
}>({
    status: GameStatus.WAITING,
    moveCount: 0,
    startedAt: 0,
    resumedAt: 0,
    currentTime: 0,
    playedTime: 0,
    completedAt: 0,
    currentTimeItv: 0,
});

const isWin = computed(() => {
    return blocks.value.filter(it => it.isCorrect).length == blocks.value.length
});

const timer = computed<string>(() => {
    if (state.status === GameStatus.WAITING) {
        return formatDuration(0);
    }

    if (state.status === GameStatus.PLAYING) {
        return formatDuration(state.playedTime + (state.currentTime - state.resumedAt));
    }

    return formatDuration(state.playedTime);
});

function togglePlayPauseGame() {
    if (state.status === GameStatus.PAUSED) {
        state.status = GameStatus.PLAYING;
        return;
    }

    if (state.status === GameStatus.PLAYING) {
        state.status = GameStatus.PAUSED;
        return;
    }
}

watch(() => state.status, (newStatus: GameStatus, oldStatus: GameStatus) => {
    if (newStatus === GameStatus.PAUSED || newStatus === GameStatus.WIN) {
        console.log('Paused game timer');
        clearInterval(state.currentTimeItv);
        state.playedTime += Date.now() - state.resumedAt;
        return;
    }

    if (newStatus === GameStatus.PLAYING) {
        console.log('start PLAYING - old status: ' + oldStatus);

        if (oldStatus === GameStatus.WAITING) {
            state.startedAt = Date.now();
            state.resumedAt = Date.now();
        }

        if (oldStatus === GameStatus.PAUSED) {
            state.resumedAt = Date.now();
        }

        state.currentTime = Date.now();
        state.currentTimeItv = window.setInterval(() => {
            state.currentTime = Date.now();
        }, 1000);
    }
})

function moveBlankBlock([rowDelta, colDeta]: number[], increaseMove: number = 1) {
    if (state.status == GameStatus.WIN) {
        return;
    }

    state.status = GameStatus.PLAYING;

    let oldRow = blankBlock.value.row;
    let oldCol = blankBlock.value.col;

    let newRow = oldRow + rowDelta;
    let newCol = oldCol + colDeta;

    if (!results[newRow] || results[newRow][newCol] === undefined || results[newRow][newCol] === -1) {
        return;
    }

    state.moveCount += increaseMove;

    let targetBlock = findBlock(newRow, newCol)!;
    targetBlock.col = oldCol;
    targetBlock.row = oldRow;
    blankBlock.value.row = newRow;
    blankBlock.value.col = newCol;

    if (isWin.value) {
        setTimeout(() => {
            if (!route.query.disable_win_alert) {
                alert(`Win. Solve in ${millisecondsToStr(state.completedAt - state.startedAt)} with ${state.moveCount} moves`);
            }
            if (route.query.auto_reload) {
                location.reload();
            }
        }, 500);
        state.completedAt = Date.now();
        state.status = GameStatus.WIN;
        if (config.mode == GameMode.IMAGE) {
            config.blockConfig.gap = 0;
            config.blockConfig.borderRadius = 0;
        }
    }
}

function handleClickBlock(cell: Cell) {
    if (cell.value <= 0) {
        return;
    }

    if (cell.col == blankBlock.value?.col) {
        const targetRow = cell.row;
        while (blankBlock.value.row != targetRow) {
            moveBlankBlock([targetRow > blankBlock.value.row ? 1 : -1, 0], 0);
            if (config.mode == GameMode.CONTEST && !route.query.auto_resolve) {
                break;
            }
        }
        state.moveCount++;
    } else if (cell.row == blankBlock.value?.row) {
        const targetCol = cell.col;
        while (blankBlock.value.col != targetCol) {
            moveBlankBlock([0, targetCol > blankBlock.value.col ? 1 : -1], 0);
            if (config.mode == GameMode.CONTEST && !route.query.auto_resolve) {
                break;
            }
        }
        state.moveCount++;
    }
}

function findBlock(row: number, col: number) {
    return blocks.value.find((it) => it.row == row && it.col == col)
}

window.document.addEventListener('keydown', function handleKeypress(e: KeyboardEvent) {
    if (!keyboardKeyToActions[e.key]) {
        return;
    }
    moveBlankBlock(keyboardKeyToActions[e.key])
});

onMounted(async () => {
    if (route.query.auto_resolve) {
        const PuzzleResolver = await import('../libs/puzzle-solver');
        if (!route.query.auto_resolve_on_click) {
            PuzzleResolver.resolve(route.query.auto_resolve_delay as string).catch((e) => console.log(e.message));
        } else {
            document.querySelector('.moves-text')?.addEventListener('click', function () {
                PuzzleResolver.resolve(route.query.auto_resolve_delay as string).catch((e) => console.log(e.message));
            })
        }
    }
});

</script>

<template>
    <div class="game-container" :data-rows="config.mapSpec.gridRows" :data-cols="config.mapSpec.gridCols"
        :style="{width: `${containerSpec.width}px`, fontSize: `${blockSpec.size / 2}px`, marginTop: `${GAME_VIEWPORT_PADDING}px`}">
        <template v-for="rows in blockMaps">
            <template v-for="cell in rows">
                <Block @click="handleClickBlock(cell)" :cell="cell" :background-url="config.image.url"
                    :block-spec="blockSpec" :container-spec="containerSpec" />
            </template>
        </template>

        <div style="position:absolute;font-weight: bold;display:flex;" :style="{
                right: `${blockSpec.gap}px`, top: `${blockSpec.gap}px`, fontSize: `1rem`
        }">
            <div v-if="config.mode == GameMode.IMAGE" style="margin-right: 8px;">
                <ZoomableImage :full-width="containerSpec.width" :full-height="containerSpec.height"
                    :width="blockSpec.size * 0.9" :height="blockSpec.size" :image="config.image.url"
                    :placeholder="config.image.url" />
            </div>

            <div v-if="config.mode == GameMode.CONTEST"
                style="padding-right: 8px;margin-right: 8px;border-right:1px solid #fff;">
                <div>Game PIN</div>
                <div>{{ pin }}</div>
            </div>

            <div @click="togglePlayPauseGame" style="text-align:left;margin-right:8px;">
                <div>Time</div>
                <div>{{ timer }}</div>
            </div>

            <div style="text-align:right">
                <div class="moves-text">Moves</div>
                <div>{{ state.moveCount }}</div>
            </div>
        </div>
    </div>
</template>
