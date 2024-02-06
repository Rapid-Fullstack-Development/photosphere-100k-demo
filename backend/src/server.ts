import express, { Request } from "express";
import cors from "cors";
import { IAsset } from "./lib/asset";
import dayjs from "dayjs";
import { IStorage } from "./services/storage";
import { v4 as makeUuid } from "uuid";
import { Readable } from "stream";
import { text } from 'node:stream/consumers';
import { read } from "fs";

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
        await storage.write("metadata", assetId + ".json", "application/json", Readable.from(JSON.stringify(asset)));
    }

    //
    // Reads metadata for an asset.
    //
    async function readMetadata(assetId: string): Promise<IAsset> {
        const metadataStream = await storage.read("metadata", assetId + ".json");
        const metadataText = await text(metadataStream);
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
    // Uploads metadata for an asset and allocats a new asset id.
    //
    app.post("/metadata", express.json(), async (req, res) => {

        const metadata = req.body;
        const assetId = metadata.hash || makeUuid();
        const fileName = getValue<string>(metadata, "fileName");
        const width = getValue<number>(metadata, "width");
        const height = getValue<number>(metadata, "height");
        const hash = getValue<string>(metadata, "hash");
        const fileDate = dayjs(getValue<string>(metadata, "fileDate")).toDate();
        const labels = metadata.labels || [];

        const newAsset: IAsset = {
            _id: assetId,
            origFileName: fileName,
            width: width,
            height: height,
            hash: hash,
            fileDate: fileDate,
            sortDate: fileDate,
            uploadDate: now(),
            labels: labels,
        };

        if (metadata.location) {
            newAsset.location = metadata.location; 
        }

        if (metadata.properties) {
            newAsset.properties = metadata.properties;
        }

        if (metadata.photoDate) {
            newAsset.photoDate = dayjs(metadata.photoDate).toDate();
            newAsset.sortDate = newAsset.photoDate;
        }

        await writeMetadata(assetId, newAsset);

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
        
        await storage.write("original", assetId.toString(), contentType, req);

        await updateMetadata(assetId, { assetContentType: contentType });

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

        const stream = storage.read("original", assetId);
        stream.pipe(res);
    });

    //
    // Uploads a thumbnail for a particular asset.
    //
    app.post("/thumb", async (req, res) => {
        
        const assetId = getHeader(req, "id");
        const contentType = getHeader(req, "content-type");

        await storage.write("thumb", assetId.toString(), contentType, req);

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

        const stream = await storage.read("thumb", assetId);
        stream.pipe(res);
    });

    //
    // Uploads a display version for a particular asset.
    //
    app.post("/display", async (req, res) => {
        
        const assetId = getHeader(req, "id");
        const contentType = getHeader(req, "content-type");
        
        await storage.write("display", assetId.toString(), contentType, req);

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

        const stream = await storage.read("display", assetId);
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

        try {
            const metadata = await readMetadata(hash);
            // Success. The hash is the asset id.
            res.json({ assetId: hash });
        }
        catch (err) {
            // The asset doesn't exist.
            res.json({ assetId: undefined });
        }
    });

    //
    // Gets a paginated list of all assets.
    //
    app.get("/assets", async (req, res) => {

        //todo: still want this to be paginated!
        const search = req.query.search as string;
        const skip = getIntQueryParam(req, "skip");
        const limit = getIntQueryParam(req, "limit");
        
        // List all metadata files.
        const assetList = await storage.list("metadata");

        // Get the data from each metadata asset.
        const assets = await Promise.all(assetList.map(async (assetid) => {
            const metadataStream = await storage.read("metadata", assetid);
            const metadataText = await text(metadataStream);
            const metadata = JSON.parse(metadataText);
            return metadata;
        }));

        res.json({
            assets: assets,
        });
    });

    return app;
}

