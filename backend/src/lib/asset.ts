//
// Represents an asset that has been uploaded to the backend.
//

//
// Represents a photographer.
//
export interface IPhotographer {
    //
    // The name of the photographer.
    //
    name: string;

    //
    // The URL of the photographer's website.
    //
    url: string;
}

//
// Minimal asset data to return to the client.
//
export interface IMinimalAsset {
    //
    // Unique ID of the asset in the database.
    //
    _id: string;

    //
    // Width of the image or video.
    //
    width: number;

    //
    // Height of the image or video.
    //
    height: number;

    //
    // Labels attached to the asset.
    //
    labels?: string[];

    //
    // Description of the asset, once the user has set it.
    //
    description?: string;

    //
    // The data by which to sort the asset.
    //
    sortDate: string;

    //
    // The photographer of the asset, if known.
    //
    photographer?: IPhotographer;
}

//
// Full asset data.
//
export interface IAsset {

    //
    // Unique ID of the asset in the database.
    //
    _id: string;

    //
    // The original name of the asset before it was uploaded.
    //
    origFileName: string;

    //
    // The mime type of the asset.
    //
    assetContentType?: string;

    //
    // The mime type of the thumbnail (after one has been set).
    //
    thumbContentType?: string;

    //
    // The mime type of the display asset (after one has been set).
    //
    displayContentType?: string;

    //
    // Width of the image or video.
    //
    width: number;

    //
    // Height of the image or video.
    //
    height: number;

    //
    // Hash of the asset.
    //
    hash: string;

    //
    // Optional reverse geocoded location for the asset.
    //
    location?: string;

    //
    // The date the file was created.
    //
    fileDate: Date;

    //
    // The date the photo was taken, if known.
    //
    photoDate?: Date;

    //
    // Date by which to sort the asset.
    //
    sortDate: Date;

    //
    /// The date the asset was uploaded.
    //
    uploadDate: Date;

    //
    // Optional extra properties for the asset, like exif data.
    //
    properties?: any;

    //
    // Labels attached to the asset.
    //
    labels?: string[];

    //
    // Description of the asset, once the user has set it.
    //
    description?: string;
}