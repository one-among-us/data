import { encode } from "blurhash";
import { getSync } from '@andreekeberg/imagedata';

export async function encodeBlur(path: string): Promise<string> {
    const data = getSync(path);
    return encode(data.data, data.width, data.height, 2, 2);
}