import axios from 'axios';
import EXIF from './exif-js/exif';

//
// Loads an image to a data URL.
//
export async function loadImageAsDataURL(imageUrl: string): Promise<string>  {
    const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(response.data, 'binary').toString('base64'); // Convert binary data to base64 string
    const dataUrl = `data:${response.headers['content-type'].toLowerCase()};base64,${buffer}`; // Construct data URL
    return dataUrl;
}

//
// Loads an image to an object URL.
//
export async function loadImageAsObjectURL(imageUrl: string): Promise<string>  {
    const response = await axios.get(imageUrl, {
        responseType: 'blob'
    });

    return URL.createObjectURL(response.data);
}

//
// Loads an object URL from a ArrayBuffer.
//
export async function loadObjectURLFromBuffer(imageBuffer: ArrayBuffer, contentType: string): Promise<string> {
    const blob = new Blob([ imageBuffer ], { type: contentType });
    return URL.createObjectURL(blob);
}

//
// Frees up memory used by an object URL.
//
export function unloadObjectURL(objectURL: string) {
    URL.revokeObjectURL(objectURL);
}

//
// Loads URL or source data to an image element.
//
export function loadImage(imageSrc: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve(img);
        };
        img.src = imageSrc;
    });
}

//
// Represents the resolution of the image or video.
//
export interface IResolution {
    //
    // The width of the image or video.
    //
    width: number;

    //
    // The height of the image or video.
    //
    height: number;
}

//
// Gets the size of an image element.
//
export function getImageResolution(image: HTMLImageElement): IResolution {
    return {
        width: image.width,
        height: image.height,
    };
}

//
// Resizes an image.
//
// https://stackoverflow.com/a/43354901/25868
//
export function resizeImage(image: HTMLImageElement, minSize: number): string {
    const oc = document.createElement('canvas'); // As long as we don't reference this it will be garbage collected.
    const octx = oc.getContext('2d')!;
    oc.width = image.width;
    oc.height = image.height;
    octx.drawImage(image, 0, 0);

    // Commented out code could be useful.
    if( image.width > image.height) {
        oc.height = minSize;
        oc.width = (image.width / image.height) * minSize;
    } 
    else {
        oc.height = (image.height / image.width) * minSize;
        oc.width = minSize;
    }

    octx.drawImage(oc, 0, 0, oc.width, oc.height);
    octx.drawImage(image, 0, 0, oc.width, oc.height);
    return oc.toDataURL();
}

//
// Retreives exif data from the file.
//
// https://github.com/exif-js/exif-js
//
export function getExifData(file: File | Blob): Promise<any> {
    return new Promise((resolve, reject) => {
        EXIF.getData(file as any, function () { // ! Don't change this to an arrow function. It might break the way this works.
            // @ts-ignore. This next line is necessary, but it causes a TypeScript error.
            resolve(EXIF.getAllTags(this));
        });
    });
}
