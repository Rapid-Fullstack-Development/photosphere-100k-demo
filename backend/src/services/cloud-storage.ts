import { AssetType, IAssetInfo, IStorage } from "./storage";
import { Readable } from "stream";
import aws from "aws-sdk";

/*
AWS S3:
- https://docs.aws.amazon.com/sdkref/latest/guide/environment-variables.html
- https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html
- https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html
- https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/index.html
- https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-nodejs.html

Digital Ocean Spaces:
- https://docs.digitalocean.com/reference/api/spaces-api/
- https://docs.digitalocean.com/products/spaces/reference/s3-sdk-examples/

*/

export class CloudStorage implements IStorage {

    //
    // The S3 bucket in which to store files.
    //
    private bucket!: string;
    
    //
    // AWS S3 interface.
    //
    private s3!: aws.S3;

    //
    // Initialises the storage interface.
    //
    async init(): Promise<void> {
        this.bucket = process.env.AWS_BUCKET as string;
        if (this.bucket === undefined) {
            throw new Error(`Set the AWS bucket through the environment variable AWS_BUCKET.`);
        }

        this.s3 = new aws.S3({
            endpoint: process.env.AWS_ENDPOINT,
        });
    }

    //
    // List files in storage.
    //
    list(type: AssetType): Promise<string[]> {    
        const listParams: aws.S3.Types.ListObjectsV2Request = {
            Bucket: this.bucket,
            Prefix: `${type}/`,
        };
        return this.s3.listObjectsV2(listParams).promise().then((data) => {
            return data.Contents?.map((object) => {
                return object.Key?.split("/")[1] as string;
            }) ?? [];
        });
    }

    //
    // Gets info about an asset.
    //
    async info(type: AssetType, assetId: string): Promise<IAssetInfo> {
        const headParams: aws.S3.Types.HeadObjectRequest = {
            Bucket: this.bucket,
            Key: `${type}/${assetId}`,
        };
        const headResult = await this.s3.headObject(headParams).promise();
        return {
            contentType: headResult.ContentType as string,
            length: headResult.ContentLength as number,
        };
    }

    //
    // Reads an file from stroage.
    //
    read(type: AssetType, assetId: string): Readable {
        const getParams: aws.S3.Types.GetObjectRequest = {
            Bucket: this.bucket, 
            Key: `${type}/${assetId}`,
        };
        return this.s3.getObject(getParams).createReadStream();
    }

    //
    // Writes an input stream to storage.
    //
    async write(type: AssetType, assetId: string, contentType: string, inputStream: Readable): Promise<void> {

        const params: aws.S3.Types.PutObjectRequest = {
            Bucket: this.bucket,
            Key: `${type}/${assetId}`,
            Body: inputStream,
            ContentType: contentType,
        };    
        await this.s3.upload(params).promise();
    }

}