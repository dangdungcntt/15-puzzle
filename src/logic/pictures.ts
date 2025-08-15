import { type MapSpec } from "../model/GameConfig";

export const PICTURES: Record<string, MapSpec & { name: string, url?: string }> = {
    'minion-1': {
        name: 'Minion Otto',
        gridRows: 3,
        gridCols: 3,
    },

    'ban-do-viet-nam': {
        name: 'Bản đồ Việt Nam',
        gridRows: 4,
        gridCols: 3,
    },
    'tranh-dong-ho': {
        name: 'Tranh Đông hồ',
        gridRows: 5,
        gridCols: 3,
    },

    'thac-nuoc': {
        name: 'Thác nước',
        gridRows: 5,
        gridCols: 3,
    },
    'hoa-sen': {
        name: 'Hoa sen',
        gridRows: 4,
        gridCols: 4,
    },
    'iphone-14-pro-max': {
        name: 'iPhone 14 Pro Max',
        gridRows: 6,
        gridCols: 4,
    },
    'vinh-ha-long': {
        name: 'Vịnh Hạ Long',
        gridRows: 5,
        gridCols: 9,
    },
    'cau-vang-da-nang': {
        name: 'Cầu Vàng Đà Nẵng',
        gridRows: 6,
        gridCols: 9,
    },
}

export function getImageUrl(imageName: string) {
    if (!PICTURES[imageName]) {
        return null;
    }

    return PICTURES[imageName].url || `/images/${imageName}.jpg`;
}
