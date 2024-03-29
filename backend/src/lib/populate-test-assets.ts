
//
// This module populates the database with test assets from unsplash for testing.
//

import axios from "axios";
import dayjs from "dayjs";
import { generateReverseChronoName } from "./gen-name";
import { IAsset } from "./asset";
import { IStorage } from "../services/storage";

// const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
// if (!UNSPLASH_ACCESS_KEY) {
//     throw new Error(`You need an Unsplash API account and key to run this code. Set your API key in the environment variable UNSPLASH_ACCESS_KEY. See the readme for details.`);
// }

const NUM_PHOTOS = 100_000;
const MAX_BATCH = 80;

async function streamUrl(fileUrl: string) {
    const { data } = await axios({ method: "get", url: fileUrl, responseType: "stream" });
    return data;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//
// Photos already uploaded.
//
let assetUploads = 0;

//
// Determines the number of assets in storage.
// 
export async function countAssets(storage: IStorage): Promise<number> {
    let count = 0;
    let continuation: string | undefined = undefined;

    while (true) {
        // const result = await storage.list("metadata", continuation);
        const result = await storage.list("original", 1000, continuation);
        count += result.assetsIds.length;
        if (result.continuation) {
            continuation = result.continuation;
        }
        else {
            break;
        }
    }

    return count;    
}

//
// Enumerate over assets in storage.
//
async function* enumerateAssets(storage: IStorage) {
    let continuation = undefined;

    while (true) {
        const result = await storage.list("metadata", 1000, continuation);

        //
        // Yield assets in 100 item batches.
        //
        for (let i = 0; i < result.assetsIds.length; i += 100) {
            yield result.assetsIds.slice(i, i + 100);
        }

        if (result.continuation) {
            continuation = result.continuation;
        }
        else {
            break;
        }
    }
}

//
// Download photos in batches.
//
export async function exportUploadTestAssets(storage: IStorage): Promise<void> {

    const initialAssets = await countAssets(storage);
    assetUploads = initialAssets;

    console.log(`!!! Starting with ${assetUploads} assets.`);

    console.error(`!!! Waiting 60 minutes...`);
    await sleep(1000 * 60 * 60);

    let requests = 0;
    let page = 1;

    console.log(`!!! Starting with ${assetUploads} assets. Starting at page ${page}.`);

    done: while (assetUploads < NUM_PHOTOS) {
        while (assetUploads < NUM_PHOTOS && requests < 200) {
            if (!await uploadBatch(storage, page)) {
                // No more assetws.
                break done;
            }

            page += 1;
            requests += 1;
        }

        console.log(`!!! Uploaded ${assetUploads-initialAssets} assets with ${requests} requests. Total assets = ${assetUploads}.`);
        console.error(`!!! Done 200 requests.\nWaiting an hour...`);

        // Wait a bit before trying again.
        let oneHourInMs = 1000 * 60 * 60;
        await sleep(oneHourInMs);

        requests = 0;
    }

    console.log(`!!! Done. Uploaded ${assetUploads-initialAssets}. Total assets = ${assetUploads}.`);
}

async function uploadBatch(storage: IStorage, page: number): Promise<boolean> {

    // Unsplash URL.
    // const url = `https://api.unsplash.com/photos?client_id=${UNSPLASH_ACCESS_KEY}&page=${page}&per_page=${MAX_BATCH}`;

    const PEXEL_API_KEY = process.env.PEXEL_API_KEY;
    if (!PEXEL_API_KEY) {
        throw new Error(`You need a Pexels API account and key to run this code. Set your API key in the environment variable PEXEL_API_KEY. See the readme for details.`);
    }

    // Pexels URL.
    // const url = `https://api.pexels.com/v1/curated?per_page=${MAX_BATCH}&page=${page}`;
    // sky, mountains, technology, food, music, science, health, sports, arts, education.
    const query = "space"; //"ocean"; //"people"; //"travel"; //"business"; //"fashion" //"animals"; //"buildings"; //"nature";
    const url = `https://api.pexels.com/v1/search?query=${query}&per_page=${MAX_BATCH}&page=${page}`;

    const { data } = await axios.get(url, {
        headers: {
            "Authorization": PEXEL_API_KEY,
        },
    });

    const photos = data.photos;

    console.log(`Getting page ${page} with ${photos.length} assets.`);

    if (photos.length === 0) {
        console.log(`No more photos.`);
        return false;
    }

    // await Promise.all(data.map((photo: any) => uploadAsset(photo, storage)));

    for (const photo of photos) {
        if (await uploadAsset(photo, storage)) {
            assetUploads += 1;
        }
    }

    console.log(`Uploaded ${assetUploads} of ${NUM_PHOTOS} assets.`);

    return true;
}

//
// Compute a random date.
//
function getRandomDate(): Date {
    const today = new Date();
    const distantPast = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    const randomTime = distantPast.getTime() + Math.random() * (today.getTime() - distantPast.getTime());
    const randomDate = new Date(randomTime);
    return randomDate;
} 

async function uploadAsset(photo: any, storage: IStorage): Promise<boolean> {

    // Unsplash format.
    // const thumb = photo.urls.thumb;
    // const sortDate = dayjs(photo.created_at).toDate();

    // Pexels format.
    const thumb = photo.src.small;

    // Pexels photos have no date. So compute a random data.
    const sortDate = getRandomDate();

    const hash = photo.id.toString(); // Fake the hash.    

    const width = photo.width;
    const height = photo.height;
    const uploadDate = new Date();
    const assetId = `${generateReverseChronoName(sortDate)}-${hash || "1"}`;

    //
    // See if the asset already exists.
    //
    const existing = await storage.read("metadata", assetId);

    if (existing) {
        console.log(`Asset ${assetId} already exists.`);
        return false;
    }
    else {
        // console.log(`Uploading ${assetId}`);
    }

    // console.log(`Date ${dayjs(sortDate).format("YYYY-MM-DD HH:mm:ss")}`);

    const asset: IAsset = {
        _id: assetId,
        origFileName: photo.id.toString(),
        width: width,
        height: height,
        hash: hash,
        fileDate: sortDate,
        photoDate: sortDate,
        sortDate: sortDate,
        uploadDate: uploadDate,
        labels: [],
        description: photo.alt,
        properties: {
            fullData: photo,
        },
        assetContentType: "image/jpg",
        thumbContentType: "image/jpg",
        displayContentType: "image/jpg",
    };

    // Metadata.
    await storage.write("metadata", assetId, "application/json", Buffer.from(JSON.stringify(asset, null, 2)));

    // Update hash.
    await storage.write("hash", hash, "text/plain", Buffer.from(assetId));

    // Upload assets.
    await storage.writeStream("original", assetId.toString(), "image/jpg", await streamUrl(thumb));
    await storage.writeStream("thumb", assetId.toString(), "image/jpg", await streamUrl(thumb));
    await storage.writeStream("display", assetId.toString(), "image/jpg", await streamUrl(thumb));

    // console.log(`Uploaded ${assetId}`);

    return true;
}

//
// Run preprocessing on test assets.
//
export async function processTestAssets(storage: IStorage): Promise<void> {

    let missingDescriptions = 0;
    let fixedDescriptions = 0;
    let totalAssets = 0;

    for await (const assetIds of enumerateAssets(storage)) {
        for (const assetId of assetIds) {
            // console.log(assetId);
            
            const data = await storage.read("metadata", assetId);
            const asset = JSON.parse(data!.toString("utf-8")) as IAsset;
            if (!asset.description) {
                console.log(`Missing description for ${assetId}`);
                console.log(JSON.stringify(asset, null, 2));

                if (asset.properties?.fullData?.alt) {
                    console.log(`Adding description for ${assetId}`);

                    asset.description = asset.properties.fullData.alt;
                    await storage.write("metadata", assetId, "application/json", Buffer.from(JSON.stringify(asset, null, 2)));

                    fixedDescriptions += 1;
                }

                missingDescriptions += 1;
            }

            totalAssets += 1;
        }
    }   

    console.log(`Found ${missingDescriptions} assets out of ${totalAssets}. Fixed ${fixedDescriptions} descriptions.`);
}

//
// Download a high resolution asset.
//
async function downloadHighResAsset(storage: IStorage, assetId: string): Promise<void> {
    try {
        if (await storage.exists("display", assetId)) {
            console.log(`Already downloaded ${assetId}`);
            return;
        }

        const data = await storage.read("metadata", assetId);
        const asset = JSON.parse(data!.toString("utf-8")) as IAsset;

        let full: string;
        let display: string;

        if (asset.properties?.fullData?.src?.original && asset.properties?.fullData?.src?.large) {
            full = asset.properties.fullData.src.original;
            display = asset.properties.fullData.src.large;
            
            await storage.writeStream("display", assetId.toString(), "image/jpg", await streamUrl(display));

            console.log(`Downloaded ${assetId}`);
        } 
        else if (asset.properties?.fullData?.urls?.full && asset.properties?.fullData?.urls?.regular) {
            full = asset.properties.fullData.urls.full;
            display = asset.properties.fullData.urls.regular;
            
            await storage.writeStream("display", assetId.toString(), "image/jpg", await streamUrl(display));

            console.log(`Downloaded ${assetId}`);
        }
        else {
            console.log(`${assetId}`);
            console.log(JSON.stringify(asset, null, 2)); 
            
            throw new Error(`No full or display URL for ${assetId}`);
        }
    }
    catch (err) {
        console.error(`Failed on ${assetId}`);
        console.error(err);
    }
}

//
// Download high resolution assets.
//
export async function downloadHighResAssets(storage: IStorage): Promise<void> {

    console.log(`Downloading high resolution assets.`);

    for await (const assetIds of enumerateAssets(storage)) {
        await Promise.all(assetIds.map(assetId => downloadHighResAsset(storage, assetId)));

        // for (const assetId of assetIds) {
        //     await downloadHighResAsset(storage, assetId);
        // }
    }

    console.log(`Done.`);
}

//
// Downloads the missing thumbnail for an asset.
//
export async function fixMissingAsset(storage: IStorage): Promise<void> {
    const assetId = "00000000031139951092-3105315";
    // if (await storage.exists("thumb", assetId)) {
    //     console.log(`Already downloaded ${assetId}`);
    //     return;
    // }

    const data = await storage.read("metadata", assetId);
    const asset = JSON.parse(data!.toString("utf-8")) as IAsset;
    const thumbnailUrl = asset.properties.fullData.src.medium;
    await storage.writeStream("thumb", assetId, "image/jpg", await streamUrl(thumbnailUrl));

    console.log(`Downloaded ${assetId}`);
}
