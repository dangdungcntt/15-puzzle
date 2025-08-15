import { type MapSpec } from "../model/GameConfig";

export function useMapSize(mapSize: string | undefined, defaultValue: MapSpec, min?: MapSpec, max?: MapSpec): { isValid: boolean, mapSpec: MapSpec } {
    const mapSizeParamsMatches = mapSize?.match(/^(\d{1,2})[x\/](\d{1,2})$/);

    if (!mapSizeParamsMatches) {
        return {
            isValid: !mapSize,
            mapSpec: defaultValue
        };
    }

    return {
        isValid: true,
        mapSpec: {
            gridRows: Math.min(Math.max(+mapSizeParamsMatches[1], min?.gridRows || 3), max?.gridRows || 15),
            gridCols: Math.min(Math.max(+mapSizeParamsMatches[2], min?.gridCols || 3), max?.gridCols || 15)
        }
    };
}
