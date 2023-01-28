//
// Loads a file to a data URL.
//
export function loadFile(file: File): Promise<any> { 
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('error', () => {
            reject(new Error(`Error reading file ${file.name}.`));
        });

        reader.addEventListener('load', evt => {
            resolve(evt.target!.result)
        });
        
        reader.readAsDataURL(file);
    });
}

//
// Loads URL or source data to an image element.
//
export function loadImage(imageSrc: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve(img);
        };
        img.src = imageSrc;
    });
}

//
// Gets the size of an image element.
//
export async function getImageResolution(imageSrc: string) {
    const image = await loadImage(imageSrc);
    return {
        width: image.width,
        height: image.height,
    };
}
