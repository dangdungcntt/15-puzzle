<script setup lang="ts">
import { type MapSpec } from '../model/GameConfig';

defineProps<{ mapSizes: MapSpec[], toRouteName: string }>();
</script>

<template>
    <div style="display:flex;flex-wrap: wrap;justify-content: space-between;">
        <div v-for="(mapSize, index) in mapSizes" :key="index" style="width: 31%;">
            <router-link :to="{name: toRouteName, params: {mapSize: `${mapSize.gridRows}x${mapSize.gridCols}`}}"
                class="btn">
                {{ mapSize.gridRows }}x{{ mapSize.gridCols }}
            </router-link>
        </div>
    </div>
</template>
