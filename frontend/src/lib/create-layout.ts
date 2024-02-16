
//
// Creates a row-based layout for the photo gallery.
//

import { IGalleryItem, IGalleryRow } from "./gallery-item";

export interface IGalleryLayout {
    //
    // Rows of the layout.
    //
    rows: IGalleryRow[];

    //
    // The entire height of the gallery.
    //
    galleryHeight: number;
}


//
// Creates or updates a row-based layout for items in the gallery.
//
export function computePartialLayout(layout: IGalleryLayout | undefined, items: IGalleryItem[], startIndex: number, endIndex: number, galleryWidth: number, targetRowHeight: number): IGalleryLayout {

    if (!layout) {
        layout = {
            rows: [],
            galleryHeight: 0,
        };
    }

    if (!items || !items.length) {
        return layout;
    }

    const rows = layout.rows;

    let curRow: IGalleryRow;
    let startingRowIndex = 0;

    if (rows.length === 0) {  
        //
        // Add the first row.
        //
        curRow = {
            startingAssetIndex: 0,
            items: [],
            offsetY: 0,
            height: targetRowHeight,
            width: 0,
        };
    
        rows.push(curRow);
    }
    else {
        //
        // Resume the previous row.
        //
        startingRowIndex = rows.length-1;
        curRow = rows[startingRowIndex];
    }

    //
    // Initially assign each gallery item to a series of rows.
    //
    for (let itemIndex = startIndex; itemIndex <= endIndex; itemIndex++) {
        const item = items[itemIndex];
        const aspectRatio = item.width / item.height;
        const computedWidth = targetRowHeight * aspectRatio;

        if (curRow.items.length > 0) {
            if (curRow.width + computedWidth > galleryWidth) {
                //
                // Break row on width.
                //
                curRow = {
                    startingAssetIndex: itemIndex,
                    items: [],
                    offsetY: 0,
                    height: targetRowHeight,
                    width: 0,
                    group: item.group,
                };
                rows.push(curRow);
            }

            if (curRow.group !== item.group) {
                //
                // Break row on group.
                //
                curRow = { //TODO: This should be optional.
                    startingAssetIndex: itemIndex,
                    items: [],
                    offsetY: 0,
                    height: targetRowHeight,
                    width: 0,
                    group: item.group,
                };
                rows.push(curRow);
            }
        }
        else {
            curRow.group = item.group;
        }

        //
        // Updated computed thumb resolution.
        //
        item.thumbWidth = computedWidth;
        item.thumbHeight = targetRowHeight;
        item.aspectRatio = aspectRatio;

        //
        // Add the item to the row.
        //
        curRow.items.push(item);
        curRow.width += computedWidth;
    }

    //
    // For all rows, except the last row, stretch the items towards the right hand boundary.
    //
    for (let rowIndex = startingRowIndex; rowIndex < rows.length-1; rowIndex++) {
        const row = rows[rowIndex];
        const nextRow = rows[rowIndex+1];
        if (row.group !== nextRow.group) {
            //TODO: This should be optional.
            continue; // Don't expand the last row in each group.
        }

        const gap = galleryWidth - row.width;
        const deltaWidth = gap / row.items.length;

        let maxThumbHeight = 0;
        row.width = 0;

        //
        // Expand each item to fill the gap.
        //
        for (const item of row.items) {
            item.thumbWidth! += deltaWidth;
            item.thumbHeight = item.thumbWidth! * (1.0 / item.aspectRatio!);
            row.width += item.thumbWidth!;
            maxThumbHeight = Math.max(maxThumbHeight, item.thumbHeight);
        }

        computeFromHeight(row, maxThumbHeight);
    }

    //
    // Now pull back the width of all rows so they don't overlap the right hand edge by too much.
    //
    for (let rowIndex = startingRowIndex; rowIndex < rows.length-1; rowIndex++) {
        const row = rows[rowIndex];
        const nextRow = rows[rowIndex+1];
        if (row.group !== nextRow.group) {
            //TODO: This should be optional.
            continue; // Don't expand the last row in each group.
        }

        let pullback = 1;
        let origHeight = row.height;
        let prevHeight = origHeight;

        while (true) {

            const newHeight = origHeight - pullback;
            computeFromHeight(row, newHeight);

            if (row.width < galleryWidth) {
                //
                // Pulled the row width in too far, restore the previous height.
                //
                computeFromHeight(row, prevHeight);
                break;
            }

            prevHeight = newHeight;
            
            // 
            // Each time we double the amount of pullback we try. It
            // results in too many iterations if we advance this by one each loop.
            //
            pullback *= 2;
        }
    }

    //
    // Computes the offsets of each row and total height of the gallery.
    //

    for (let rowIndex = startingRowIndex; rowIndex < rows.length-1; rowIndex++) {
        const row = rows[rowIndex];
        row.offsetY = layout.galleryHeight;
        layout.galleryHeight += row.height;

        let accumulatedWidth = 0;

        for (const item of row.items) {
            item.offsetX = accumulatedWidth;
            accumulatedWidth += item.thumbWidth!;
        }
    }

    return layout;
}

//
// Compute thumbnail resolution from a requested height.
//
function computeFromHeight(row: IGalleryRow, height: number): void {
    row.height = height;
    row.width = 0;

    for (const item of row.items) {
        item.thumbHeight = height;
        item.thumbWidth = row.height * item.aspectRatio!;
        row.width += item.thumbWidth;
    }
}