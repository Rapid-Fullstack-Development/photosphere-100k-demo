import express, { Request } from "express";
import cors from "cors";
import { IAsset } from "./lib/asset";
import dayjs from "dayjs";
import { IStorage } from "./services/storage";
import { Readable } from "stream";
import { text } from 'node:stream/consumers';

const API_KEY = process.env.API_KEY;

//
// Starts the REST API.
//
export async function createServer(now: () => Date, storage: IStorage) {

    await storage.init();

    const app = express();
    app.use(cors());

    if (API_KEY) {
        //
        // Authenticates with an API key.
        // All routes after this must provide the API key.
        //
        app.use((req, res, next) => {
            if (req.query.key === API_KEY || req.headers.key === API_KEY) {
                // Allow the request.
                next();
                return;
            }
            
            // Disallow the request.
            res.sendStatus(403);
        });
    }

    //
    // Gets the value of a header from the request.
    // Throws an error if the header is not present.
    //
    function getHeader(req: Request, name: string): string {
        const value = req.headers[name] as string;
        if (!value) {
            throw new Error(`Expected header ${name}`);
        }

        return value;
    }

    //
    // Gets a query param as a number.
    // Throws an error if the value doesn't parse.
    //
    function getIntQueryParam(req: Request, name: string): number {
        const value = parseInt((req.query as any)[name]);
        if (Number.isNaN(value)) {
            throw new Error(`Failed to parse int query param ${name}`);
        }
        return value;
    }

    //
    // Gets the value of a field from an object.
    // Throws an error if the field is not present.
    //
    function getValue<T>(obj: any, name: string): T {
        const value = obj[name] as T;
        if (value === undefined) {
            throw new Error(`Expected field ${name}`);
        }

        return value;
    }

    //
    // Writes metadata for an asset.
    //
    async function writeMetadata(assetId: string, asset: IAsset): Promise<void> {
        await storage.writeStream("metadata", assetId, "application/json", Readable.from(JSON.stringify(asset, null, 2)));
    }

    //
    // Reads metadata for an asset.
    //
    async function readMetadata(assetId: string): Promise<IAsset> {
        const metadataText = await storage.read("metadata", assetId);
        if (!metadataText) {
            throw new Error(`Asset metadata not found for asset id ${assetId}`);
        }
        const metadata = JSON.parse(metadataText);
        return metadata;
    }

    //
    // Update partial fields in metadata.
    //
    async function updateMetadata(assetId: string, update: Partial<IAsset>): Promise<void> {
        const metadata = await readMetadata(assetId);
        Object.assign(metadata, update);
        await writeMetadata(assetId, metadata);
    }

    //
    // Tracks a new hash to an asset id.
    //
    async function updateHash(hash: string, assetId: string): Promise<void> {
        await storage.write("hash", hash, "text/plain", assetId);
    }

    //
    // Reads the assetId that is linked to a hash.
    //
    async function readHash(hash: string): Promise<string | undefined> {
        return await storage.read("hash", hash);
    }

    //
    // Creates a name that is sorted in reverse chronological order according to the date.
    // The name essentially counts down to the year 3000.
    //
    function generateReverseChronoName(date: Date): string {
        const futureDate = new Date('3000-12-31T23:59:59Z');
        const diffInSeconds = Math.floor((futureDate.getTime() - date.getTime()) / 1000);
        return diffInSeconds.toString().padStart(20, '0');
    }
    
    //
    // Uploads metadata for an asset and allocates a new asset id.
    //
    app.post("/metadata", express.json(), async (req, res) => {

        const metadata = req.body;
        const fileName = getValue<string>(metadata, "fileName");
        const width = getValue<number>(metadata, "width");
        const height = getValue<number>(metadata, "height");
        const hash = getValue<string>(metadata, "hash");
        const fileDate = dayjs(getValue<string>(metadata, "fileDate")).toDate();
        const labels = metadata.labels || [];
        const photoDate = metadata.photoDate ? dayjs(metadata.photoDate).toDate() : undefined;
        const uploadDate = now();
        const sortDate = photoDate || fileDate || uploadDate;
        const assetId = `${generateReverseChronoName(sortDate)}-${hash || "1"}`;

        const newAsset: IAsset = {
            _id: assetId,
            origFileName: fileName,
            width: width,
            height: height,
            hash: hash,
            fileDate: fileDate,
            photoDate: photoDate,
            sortDate: sortDate,
            uploadDate: uploadDate,
            labels: labels,
        };

        if (metadata.location) {
            newAsset.location = metadata.location; 
        }

        if (metadata.properties) {
            newAsset.properties = metadata.properties;
        }

        await writeMetadata(assetId, newAsset);

        await updateHash(hash, assetId);

        res.json({
            assetId: assetId,
        });
    });

    //
    // Uploads a new asset.
    //
    app.post("/asset", async (req, res) => {
        
        const assetId = getHeader(req, "id");
        const contentType = getHeader(req, "content-type");
        
        await storage.writeStream("original", assetId.toString(), contentType, req);

        await updateMetadata(assetId, { assetContentType: contentType });3

        res.json({
            assetId: assetId,
        });
    }); 

    //
    // Gets a particular asset by id.
    //
    app.get("/asset", async (req, res) => {

        const assetId = req.query.id as string;
        if (!assetId) {
            throw new Error(`Asset ID not specified in query parameters.`);
        }

        const assetInfo = await storage.info("original", assetId);

        res.writeHead(200, {
            "Content-Type": assetInfo.contentType,
        });

        const stream = storage.readStream("original", assetId);
        stream.pipe(res);
    });

    //
    // Uploads a thumbnail for a particular asset.
    //
    app.post("/thumb", async (req, res) => {
        
        const assetId = getHeader(req, "id");
        const contentType = getHeader(req, "content-type");

        await storage.writeStream("thumb", assetId.toString(), contentType, req);

        await updateMetadata(assetId, { thumbContentType: contentType });
        
        res.sendStatus(200);
    });

    //
    // Gets the thumb for an asset by id.
    //
    app.get("/thumb", async (req, res) => {

        const assetId = req.query.id as string;
        if (!assetId) {
            throw new Error(`Asset ID not specified in query parameters.`);
        }

        const assetInfo = await storage.info("thumb", assetId);

        //
        // Return the thumbnail.
        //
        res.writeHead(200, {
            "Content-Type": assetInfo.contentType,
        });

        const stream = await storage.readStream("thumb", assetId);
        stream.pipe(res);
    });

    //
    // Uploads a display version for a particular asset.
    //
    app.post("/display", async (req, res) => {
        
        const assetId = getHeader(req, "id");
        const contentType = getHeader(req, "content-type");
        
        await storage.writeStream("display", assetId.toString(), contentType, req);

        await updateMetadata(assetId, { displayContentType: contentType });
        
        res.sendStatus(200);
    });

    //
    // Gets the display version for an asset by id.
    //
    app.get("/display", async (req, res) => {

        const assetId = req.query.id as string;
        if (!assetId) {
            throw new Error(`Asset ID not specified in query parameters.`);
        }

        const assetInfo = await storage.info("display", assetId);

        //
        // Return the display version of the asset.
        //
        res.writeHead(200, {
            "Content-Type": assetInfo.contentType,
        });

        const stream = await storage.readStream("display", assetId);
        stream.pipe(res);
    });

    //
    // Adds a label to an asset.
    //
    app.post("/asset/add-label", express.json(), async (req, res) => {

        const id = getValue<string>(req.body, "id");
        const label = getValue<string>(req.body, "label");

        const metadata = await readMetadata(id);
        if (!metadata.labels) {
            metadata.labels = [];
        }
        metadata.labels.push(label);
        await writeMetadata(id, metadata);

        res.sendStatus(200);
    });

    //
    // Removes a label from an asset.
    //
    app.post("/asset/remove-label", express.json(), async (req, res) => {

        const id = getValue<string>(req.body, "id");
        const label = getValue<string>(req.body, "label");

        const metadata = await readMetadata(id);
        if (metadata.labels) {
            metadata.labels = metadata.labels.filter(l => l !== label);
            await writeMetadata(id, metadata);
        }

        res.sendStatus(200);
    });

    //
    // Sets a description for the asset.
    //
    app.post("/asset/description", express.json(), async (req, res) => {

        const id = getValue<string>(req.body, "id");
        const description = getValue<string>(req.body, "description");

        await updateMetadata(id, { description });
                
        res.sendStatus(200);
    });

    //
    // Checks if an asset has already been upload by its hash.
    //
    app.get("/check-asset", async (req, res) => {

        const hash = req.query.hash as string;
        if (!hash) {
            throw new Error(`Hash not specified in query parameters.`);
        }

        // Read the hash map.
        const assetId = await readHash(hash);
        if (assetId) {
            // The asset exists.
            res.json({ assetId: assetId });
        }
        else {
            // The asset doesn't exist.
            res.json({ assetId: undefined });
        }
    });

    //
    // Gets a paginated list of all assets.
    //
    app.get("/assets", async (req, res) => {

        const next = req.query.next as string;
        const result = await storage.list("metadata", next);
        const assets = await Promise.all(result.assetsIds.map(
            async assetId => { 
                const data = await storage.read("metadata", assetId);
                return JSON.parse(data!) as IAsset;
            },
        ));

        res.json({
            assets: assets,
            next: result.continuation,
        });
    });

    return app;
}

