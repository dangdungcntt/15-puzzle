<script setup lang="ts">
import Cell from '../model/Cell';
import type { BlockSpec, ContainerSpec } from '../model/GameConfig';

const { cell, backgroundUrl } = defineProps<{
    cell: Cell,
    blockSpec: BlockSpec,
    backgroundUrl?: string,
    containerSpec: ContainerSpec,
}>();

defineEmits(['click']);

const isBlockItem = cell.isBlockItem;
const isUseImage = !!backgroundUrl;
</script>

<template>
    <div class="block" :class="{
        'wall': cell.isWall,
        'block-blank': cell.isBlockBlank,
        'block-item': isBlockItem,
        'block-mode-image': isUseImage,
        'correct-position': isBlockItem && cell.isCorrect,
    }" :style="{
        position: 'absolute',
        left: `${cell.col * blockSpec.size + (cell.col + 1) * blockSpec.gap}px`,
        top: `${cell.row * blockSpec.size + (cell.row + 1) * blockSpec.gap}px`,
        width: `${blockSpec.size}px`,
        height: `${blockSpec.size}px`,
        borderRadius: `${blockSpec.borderRadius}px`,
        backgroundRepeat: 'no-repeat',
        backgroundImage: isBlockItem && backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: isBlockItem && containerSpec.backgroundWidth ? `${containerSpec.backgroundWidth}px ${containerSpec.backgroundHeight}px`: undefined,
        backgroundPositionX: `-${cell.correctCol * blockSpec.size + cell.correctCol * blockSpec.gap}px`,
        backgroundPositionY: `-${(cell.correctRow - 1) * blockSpec.size + (cell.correctRow - 1) * blockSpec.gap}px`,
    }" @click="$emit('click')" :data-value="cell.value" :data-current-row="cell.row" :data-current-col="cell.col">
        <span v-if="isBlockItem && !isUseImage">{{ cell.text }}</span>
    </div>
</template>
