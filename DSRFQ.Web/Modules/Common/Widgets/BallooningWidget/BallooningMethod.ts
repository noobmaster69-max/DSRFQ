import * as pdfjsLib from 'pdfjs-dist';
import {BalloonAnnotation,Mask,DrawingStamp} from "@/Common/Widgets/BallooningWidget/BallooningTypes";
import {PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString, rgb, StandardFonts} from "pdf-lib";
import {compareBalloonNumber, formatBalloonNumber, parseBalloonNumber} from "@/Common/Widgets/BallooningWidget/BallooningNumbering";
//import { GoogleGenAI, Type } from "@google/genai";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/Scripts/Balloon/pdf.worker.min.mjs"
export const extractModelTreeNames = async (file: File): Promise<string[]> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const viewNames: string[] = [];

        const pages = pdfDoc.getPages();
        for (const page of pages) {
            const annots = page.node.Annots();
            if (!annots) continue;

            for (let i = 0; i < annots.size(); i++) {
                const annot = annots.lookup(i, PDFDict);
                if (!annot || annot.get(PDFName.of('Subtype')) !== PDFName.of('3D')) continue;

                // 1. Safely look up /3DV which can be a Dict or an Array
                const viewsObject = annot.lookup(PDFName.of('3DV'));
                if (!viewsObject) continue;

                let viewsArray: PDFArray | null = null;

                if (viewsObject instanceof PDFArray) {
                    // Direct Array structure
                    viewsArray = viewsObject;
                } else if (viewsObject instanceof PDFDict) {
                    // Wrapped Dictionary structure - check common CAD metadata keys like /Views or /V
                    if (viewsObject.has(PDFName.of('Views'))) {
                        viewsArray = viewsObject.lookup(PDFName.of('Views'), PDFArray);
                    } else if (viewsObject.has(PDFName.of('V'))) {
                        viewsArray = viewsObject.lookup(PDFName.of('V'), PDFArray);
                    }
                }

                // 2. Parse the resolved array if we found one
                if (viewsArray) {
                    for (let j = 0; j < viewsArray.size(); j++) {
                        const viewDict = viewsArray.lookup(j, PDFDict);
                        if (!viewDict) continue;

                        // Look for the View Name string attribute (commonly /IN or /DN)
                        const nameObj = viewDict.get(PDFName.of('IN')) || viewDict.get(PDFName.of('DN'));

                        if (nameObj instanceof PDFString || nameObj instanceof PDFHexString) {
                            viewNames.push(nameObj.asString());
                        }
                    }
                }
            }
        }

        return viewNames;
    } catch (e) {
        console.warn("Could not extract CAD views matrix natively:", e);
        return []; // Fallback safely to empty array so your canvas image still renders
    }
};
export const convertPdfToImages = async (
    file: File,
    onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const images: string[] = [];

        // 300 DPI for display — safe for Canvas size limits and smooth rendering
        const dpi = 300;
        const scale = dpi / 72;

        for (let i = 1; i <= numPages; i++) {
            if (onProgress) onProgress(i - 1, numPages);

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext("2d", { alpha: false });

            if (!context) continue;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // 1. MUST fill with white for JPEG conversion
            context.fillStyle = "white";
            context.fillRect(0, 0, canvas.width, canvas.height);

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

           
            // if (viewsList.length > 0) {
            //     context.fillStyle = "rgba(240, 240, 240, 0.95)";
            //     context.fillRect(20, 20, 250, (viewsList.length * 25) + 40); // Draw sidebar container
            //
            //     context.fillStyle = "#000000";
            //     context.font = "bold 16px Arial";
            //     context.fillText("Model Tree Views:", 30, 45);
            //
            //     context.font = "14px Arial";
            //     viewsList.forEach((viewName, index) => {
            //         context.fillText(`📁 ${viewName}`, 35, 75 + (index * 25));
            //     });
            // }

            // 2. Use Blobs instead of DataURLs for better memory management
            const blob = await new Promise<Blob>((resolve) =>
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8)
            );

            const imageUrl = URL.createObjectURL(blob);
            images.push(imageUrl);

            // 3. Clean up the canvas element immediately
            canvas.width = 0;
            canvas.height = 0;

            if (onProgress) onProgress(i, numPages);
        }

        return images;
    } catch (error) {
        console.error("Error converting PDF to images:", error);
        throw new Error("Failed to process PDF file.");
    }
};

/**
 * Re-renders a single PDF page at the specified DPI and returns a Blob.
 * Used when high-resolution images are needed for third-party API calls
 * (e.g. 800 DPI) without inflating the display page cache.
 */
export const convertPdfPageToHighResBlob = async (
    file: File,
    pageIndex: number,   // 0-based
    dpi: number = 800
): Promise<{ blob: Blob; width: number; height: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const page = await pdf.getPage(pageIndex + 1); // pdfjs is 1-based
    let scale = dpi / 72;
    let viewport = page.getViewport({ scale });

    // Guard: most browsers cap canvas dimensions at 16384px.
    // If 800 DPI would exceed that, scale down proportionally so we still
    // get the highest possible resolution without a null blob.
    const MAX_CANVAS_SIZE = 16384;
    if (viewport.width > MAX_CANVAS_SIZE || viewport.height > MAX_CANVAS_SIZE) {
        const clampScale = Math.min(MAX_CANVAS_SIZE / viewport.width, MAX_CANVAS_SIZE / viewport.height);
        scale = scale * clampScale;
        viewport = page.getViewport({ scale });
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context for high-res render');

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    );

    // Capture actual rendered dimensions before releasing the canvas
    const renderedWidth = canvas.width;
    const renderedHeight = canvas.height;

    // Release canvas memory immediately
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) {
        throw new Error(
            `canvas.toBlob returned null for page ${pageIndex + 1} ` +
            `(canvas size: ${renderedWidth}×${renderedHeight}px). ` +
            `The canvas may still exceed browser limits.`
        );
    }

    return { blob, width: renderedWidth, height: renderedHeight };
};

export const fileToGenerativePart = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data url prefix (e.g. "data:image/jpeg;base64,")
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export function mapToBalloonAnnotation(
    entity: any
): BalloonAnnotation {
    return {
        // BalloonAnnotation.analyser is filled in later by parseGdt; it is
        // required by the interface, so start it empty rather than absent.
        analyser: { diameter: false, datums: [], modifiers: [] },
        id: String(entity.Id),
        // BalloonNo is nvarchar(40) and may carry a sub-number ("5-1").
        ...parseBalloonNumber(entity.BalloonNo),
        balloonX: entity.CenterX,
        balloonY: entity.CenterY,
        rect: {
            x: entity.BBoxX1,
            y: entity.BBoxY1,
            width: entity.BBoxX2 - entity.BBoxX1,
            height: entity.BBoxY2 - entity.BBoxY1
        },
        quantity: entity.Multiplier??undefined,
        content: entity.Symbol,
        originalContent: entity.OriginalSymbol,
        type: entity.FeatureSymbolName ?? "",
        typeId: entity.FeatureSymbolId ?? undefined,
        upperTol: entity.UpperTol ?? undefined,
        lowerTol: entity.LowerTol ?? undefined,
        section: entity.Section ?? undefined,
        status: entity.Status as 'Pending' | 'Approved' | 'Review',
        pageIndex: entity.PageNumber - 1,
        instanceCount: 1,
        gridStart: entity.GridStart,
        gridEnd: entity.GridEnd,
        auto: !entity.Manual,
        isNote: entity.IsNote,
        score: entity.Score,
        toleranceScoringId: entity.ToleranceScoringId,
        toleranceScoringName: entity.ToleranceScoringName,
        toleranceScoringColor: entity.ToleranceScoringColor,
        viewId: entity.ViewId,
        viewRect: {
            x: entity.ViewBBoxX1,
            y: entity.ViewBBoxY1,
            width: entity.ViewBBoxX2 - entity.ViewBBoxX1,
            height: entity.ViewBBoxY2 - entity.ViewBBoxY1
        }
    };
}
export function mapToBalloonMask(
    entity: any
): Mask {
    return {
        id: String(entity.Id),


        rect: {
            x: entity.MaskX1,
            y: entity.MaskY1,
            width: entity.MaskX2 - entity.MaskX1,
            height: entity.MaskY2 - entity.MaskY1
        },


        pageIndex: entity.PageNumber - 1,
    };
}
export function mapToBalloonStamp(
    entity: any
): DrawingStamp {
    return {
        id: String(entity.Id),
        picture: entity.Picture,
        rect: {
            x: entity.X1,
            y: entity.Y1,
            width: entity.X2 - entity.X1,
            height: entity.Y2 - entity.Y1
        },
        pageIndex: entity.PageNumber - 1
    };
}
export const base64ToBlob = (base64Data: string, contentType: string = 'image/png'): Blob => {
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    const sliceSize = 512;

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
};
export const resequenceFromPoint = (
    annotations: BalloonAnnotation[],
    deletedNumber: number
): BalloonAnnotation[] => {
    return annotations.map((item) => {
        if (item.balloonNumber > deletedNumber) {
            return {
                ...item,
                balloonNumber: item.balloonNumber - 1,
            };
        }
        return item;
    });
};
export const uploadToFileServerFile = async (
    originalFile: File,
    annotations: BalloonAnnotation[],
    pageImages: string[],
    balloonSizeMultiplier: number = 1.0,
    solvedPositions?: Map<string, { x: number; y: number }>,
    stamps: DrawingStamp[] = []
): Promise<any> => {
    try {
        let pdfDoc: PDFDocument;

        if (originalFile.type === 'application/pdf') {
            const existingPdfBytes = await originalFile.arrayBuffer();
            pdfDoc = await PDFDocument.load(existingPdfBytes);
        } else {
            // For images, create a new PDF
            pdfDoc = await PDFDocument.create();
            for (const imageSrc of pageImages) {
                const page = pdfDoc.addPage();
                const imageBytes = await fetch(imageSrc).then(res => res.arrayBuffer());
                let embeddedImage;

                if (originalFile.type === 'image/png') {
                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                }

                const { width, height } = embeddedImage.scale(1);
                page.setSize(width, height);
                page.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            }
        }

        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const blue = rgb(0.14, 0.45, 0.92); // Matches blue-600
        const white = rgb(1, 1, 1);

        // Shared with the canvas, so what is written out matches what was on
        // screen. See computeBalloonSizePct.
        const globalBalloonSizePct =
            computeBalloonSizePct(annotations, balloonSizeMultiplier);


        // annotations.forEach(ann => {
        //     if (ann.pageIndex < pages.length) {
        //         const page = pages[ann.pageIndex];
        //         const { width, height } = page.getSize();
        //
        //         const calculatedBalloonDiameter = (globalBalloonSizePct / 100) * height;
        //         const balloonRadius = calculatedBalloonDiameter / 2;
        //
        //         const x = (ann.rect.x / 100) * width;
        //         const y = (1 - (ann.rect.y / 100)) * height;
        //         const w = (ann.rect.width / 100) * width;
        //         const h = (ann.rect.height / 100) * height;
        //
        //         page.drawRectangle({
        //             x: x,
        //             y: y - h,
        //             width: w,
        //             height: h,
        //             borderWidth: 0,
        //             opacity: 0,
        //         });
        //
        //         const balloonPos = solvedPositions?.get(ann.id);
        //         const balloonX = ((balloonPos?.x ?? ann.balloonX) / 100) * width;
        //         const balloonY = (1 - ((balloonPos?.y ?? ann.balloonY) / 100)) * height;
        //
        //         page.drawCircle({
        //             x: balloonX,
        //             y: balloonY,
        //             size: balloonRadius,
        //             borderColor: blue,
        //             borderWidth: 1,
        //         });
        //
        //         let fontSize = balloonRadius * 0.95;
        //         const text = formatBalloonNumber(ann);
        //         const maxAllowedWidth = balloonRadius * 1.5;
        //
        //         let textWidth = font.widthOfTextAtSize(text, fontSize);
        //
        //         if (textWidth > maxAllowedWidth) {
        //             fontSize = fontSize * (maxAllowedWidth / textWidth);
        //             textWidth = font.widthOfTextAtSize(text, fontSize);
        //         }
        //         page.drawText(text, {
        //             x: balloonX - (textWidth / 2),
        //             y: balloonY - (fontSize * 0.35),
        //             size: fontSize,
        //             font: font,
        //             color: blue,
        //         });
        //     }
        // });
        annotations.forEach(ann => {
            if (ann.pageIndex < pages.length) {
                const page = pages[ann.pageIndex];

                // 1. Get native dimensions and normalize rotation
                const { width: nativeWidth, height: nativeHeight } = page.getSize();
                const rotationAngle = (page.getRotation().angle % 360 + 360) % 360;

                // 2. Determine VISUAL dimensions based on rotation
                // If rotated 90 or 270, the visual width is the native height, and vice versa.
                const isRotated90or270 = (rotationAngle === 90 || rotationAngle === 270);
                const visualWidth = isRotated90or270 ? nativeHeight : nativeWidth;
                const visualHeight = isRotated90or270 ? nativeWidth : nativeHeight;

                // 3. Normalize input coordinates from UI space (0 to 1)
                const balloonPos = solvedPositions?.get(ann.id);
                const normX = (balloonPos?.x ?? ann.balloonX) / 100;
                const normY = (balloonPos?.y ?? ann.balloonY) / 100;

                // 4. Initialize native PDF target coordinates
                let balloonX = 0;
                let balloonY = 0;

                // 5. Translate coordinates using native bounds, mapped to visual percentages
                if (rotationAngle === 90) {
                    balloonX = normY * nativeWidth;
                    balloonY = normX * nativeHeight;
                } else if (rotationAngle === 180) {
                    balloonX = (1 - normX) * nativeWidth;
                    balloonY = normY * nativeHeight;
                } else if (rotationAngle === 270) {
                    balloonX = (1 - normY) * nativeWidth;
                    balloonY = (1 - normX) * nativeHeight;
                } else { // 0 degrees standard
                    balloonX = normX * nativeWidth;
                    balloonY = (1 - normY) * nativeHeight;
                }

                // 6. CRITICAL: Calculate balloon size relative to the VISUAL height!
                const calculatedBalloonDiameter = (globalBalloonSizePct / 100) * visualHeight;
                const balloonRadius = calculatedBalloonDiameter / 2;

                // 6.5 Draw connector line
                const approxRadiusNorm = 0.45 * (globalBalloonSizePct / 100);

                const rxNorm = ann.rect.x / 100;
                const ryNorm = ann.rect.y / 100;
                const rwNorm = ann.rect.width / 100;
                const rhNorm = ann.rect.height / 100;

                const nearestXNorm = Math.max(rxNorm, Math.min(normX, rxNorm + rwNorm));
                const nearestYNorm = Math.max(ryNorm, Math.min(normY, ryNorm + rhNorm));

                const exNorm = nearestXNorm - normX;
                const eyNorm = nearestYNorm - normY;
                const eDistNorm = Math.sqrt(exNorm * exNorm + eyNorm * eyNorm);

                if (eDistNorm > approxRadiusNorm + 0.0001) {
                    const edx = exNorm / eDistNorm;
                    const edy = eyNorm / eDistNorm;
                    const startXNorm = normX + edx * approxRadiusNorm;
                    const startYNorm = normY + edy * approxRadiusNorm;

                    let pdfStartX = 0, pdfStartY = 0;
                    let pdfEndX = 0, pdfEndY = 0;

                    if (rotationAngle === 90) {
                        pdfStartX = startYNorm * nativeWidth;
                        pdfStartY = startXNorm * nativeHeight;
                        pdfEndX = nearestYNorm * nativeWidth;
                        pdfEndY = nearestXNorm * nativeHeight;
                    } else if (rotationAngle === 180) {
                        pdfStartX = (1 - startXNorm) * nativeWidth;
                        pdfStartY = startYNorm * nativeHeight;
                        pdfEndX = (1 - nearestXNorm) * nativeWidth;
                        pdfEndY = nearestYNorm * nativeHeight;
                    } else if (rotationAngle === 270) {
                        pdfStartX = (1 - startYNorm) * nativeWidth;
                        pdfStartY = (1 - startXNorm) * nativeHeight;
                        pdfEndX = (1 - nearestYNorm) * nativeWidth;
                        pdfEndY = (1 - nearestXNorm) * nativeHeight;
                    } else { // 0 degrees standard
                        pdfStartX = startXNorm * nativeWidth;
                        pdfStartY = (1 - startYNorm) * nativeHeight;
                        pdfEndX = nearestXNorm * nativeWidth;
                        pdfEndY = (1 - nearestYNorm) * nativeHeight;
                    }

                    page.drawLine({
                        start: { x: pdfStartX, y: pdfStartY },
                        end: { x: pdfEndX, y: pdfEndY },
                        thickness: 1,
                        color: blue,
                    });
                }

                // 7. Draw the structural circle
                page.drawCircle({
                    x: balloonX,
                    y: balloonY,
                    size: balloonRadius,
                    borderColor: blue,
                    borderWidth: 1,
                });

                // 8. Font scaling based on corrected visual radius
                let fontSize = balloonRadius * 0.95;
                const text = formatBalloonNumber(ann);
                const maxAllowedWidth = balloonRadius * 1.5;

                let textWidth = font.widthOfTextAtSize(text, fontSize);
                if (textWidth > maxAllowedWidth) {
                    fontSize = fontSize * (maxAllowedWidth / textWidth);
                    textWidth = font.widthOfTextAtSize(text, fontSize);
                }

                // 9. Dynamic Text Offsetting based on text pivot alignments per rotation angle
                let textOffsetX = 0;
                let textOffsetY = 0;

                if (rotationAngle === 90) {
                    textOffsetX = fontSize * 0.35;
                    textOffsetY = -(textWidth / 2);
                } else if (rotationAngle === 180) {
                    textOffsetX = (textWidth / 2);
                    textOffsetY = fontSize * 0.35;
                } else if (rotationAngle === 270) {
                    textOffsetX = -fontSize * 0.35;
                    textOffsetY = (textWidth / 2);
                } else { // 0 degrees
                    textOffsetX = -(textWidth / 2);
                    textOffsetY = -(fontSize * 0.35);
                }

                // 10. Draw the text perfectly centered and oriented
                page.drawText(text, {
                    x: balloonX + textOffsetX,
                    y: balloonY + textOffsetY,
                    size: fontSize,
                    font: font,
                    color: blue,
                    rotate: page.getRotation(),
                });
            }
        });

        // Draw stamps
        for (const stamp of stamps) {
            if (stamp.pageIndex < pages.length) {
                const page = pages[stamp.pageIndex];
                try {
                    const stampUrl = stamp.picture.startsWith('http') || stamp.picture.startsWith('/')
                        ? stamp.picture
                        : `/upload/${stamp.picture}`;
                    const imageBytes = await fetch(stampUrl).then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.arrayBuffer();
                    });

                    let embeddedStamp;
                    if (stamp.picture.toLowerCase().endsWith('.jpg') || stamp.picture.toLowerCase().endsWith('.jpeg')) {
                        embeddedStamp = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        try {
                            embeddedStamp = await pdfDoc.embedPng(imageBytes);
                        } catch (pngErr) {
                            embeddedStamp = await pdfDoc.embedJpg(imageBytes);
                        }
                    }

                    const { width: nativeWidth, height: nativeHeight } = page.getSize();
                    const rotationAngle = (page.getRotation().angle % 360 + 360) % 360;

                    const isRotated90or270 = (rotationAngle === 90 || rotationAngle === 270);
                    const visualWidth = isRotated90or270 ? nativeHeight : nativeWidth;
                    const visualHeight = isRotated90or270 ? nativeWidth : nativeHeight;

                    const normX = stamp.rect.x / 100;
                    const normY = stamp.rect.y / 100;
                    const normW = stamp.rect.width / 100;
                    const normH = stamp.rect.height / 100;

                    let pdfX = 0;
                    let pdfY = 0;
                    let pdfW = normW * visualWidth;
                    let pdfH = normH * visualHeight;

                    // drawImage rotates about (x, y), and (x, y) is where the image's own
                    // bottom-left corner lands — so anchor on the view-space bottom-left
                    // corner, mapped into native page space.
                    const anchorU = normX;
                    const anchorV = normY + normH;

                    if (rotationAngle === 90) {
                        pdfX = anchorV * nativeWidth;
                        pdfY = anchorU * nativeHeight;
                    } else if (rotationAngle === 180) {
                        pdfX = (1 - anchorU) * nativeWidth;
                        pdfY = anchorV * nativeHeight;
                    } else if (rotationAngle === 270) {
                        pdfX = (1 - anchorV) * nativeWidth;
                        pdfY = (1 - anchorU) * nativeHeight;
                    } else { // 0 degrees
                        pdfX = anchorU * nativeWidth;
                        pdfY = (1 - anchorV) * nativeHeight;
                    }

                    page.drawImage(embeddedStamp, {
                        x: pdfX,
                        y: pdfY,
                        width: pdfW,
                        height: pdfH,
                        rotate: page.getRotation()
                    });
                } catch (stampErr) {
                    console.error("Failed to embed stamp in PDF:", stamp.picture, stampErr);
                }
            }
        }

        const pdfBytes = await pdfDoc.save();

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Annotated_${originalFile.name.replace(/\.[^/.]+$/, "")}.pdf`;

        const formData = new FormData();
        formData.append('file', blob, fileName);

        const response = await fetch('/File/TemporaryUploadCK', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();

        return result

    } catch (error) {
        console.error("PDF Export failed:", error);
        throw error;
    }
};
/**
 * Balloon diameter, as a percentage of page height.
 *
 * THE one place this is decided. The canvas and the PDF export must agree or
 * an operator sizes the balloons against what is on screen and gets something
 * else in the file - which is exactly what happened here: the canvas used a
 * flat 2.2 x multiplier while the export kept this derivation, so exported
 * balloons came out around a third smaller than the ones being looked at.
 *
 * Ported from DS_ERP, where the canvas and the export already share it. The
 * size adapts to the drawing rather than being fixed: it follows the SMALLEST
 * annotation box on the sheet, so a dense print with fine dimension text gets
 * balloons that sit beside the geometry instead of burying it. Clamped to
 * [0.8, 1.5] so neither extreme runs away, then scaled by the operator's
 * multiplier.
 */
export const computeBalloonSizePct = (
    annotations: BalloonAnnotation[],
    balloonSizeMultiplier: number = 1.0
): number => {
    const validHeights = (annotations ?? [])
        .filter(a => Number.isFinite(a?.rect?.height))
        .map(a => a.rect.height);

    let sizePct = 1.5;
    if (validHeights.length > 0) {
        let minHeight = Math.min(...validHeights);
        // A box taller than 2% of the page has room to spare, so the balloon
        // is pulled in a little rather than filling the box edge to edge.
        if (minHeight > 2) minHeight -= 1;
        sizePct = Math.max(0.8, Math.min(minHeight, sizePct));
    }
    return sizePct * balloonSizeMultiplier;
};

/** How each balloon is drawn in the PDF - the canvas's own style, and an optional label beside it. */
export interface PdfDrawOptions {
    styleOf?: (a: BalloonAnnotation) => {
        stroke: string; fill: string; text: string; shape: string;
        pdfLineWidth: number; arrow: boolean; scale: number;
    };
    /** Text printed to the right of the balloon, e.g. "(1-4)". Unrotated pages only. */
    suffixOf?: (a: BalloonAnnotation) => string;
}

const hexToRgb = (hex: string | undefined, fallback: ReturnType<typeof rgb>) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? '')
        ?? (/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex ?? '')?.slice(0, 4).map((v, i) => i ? v + v : v) as any);
    return m ? rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255) : fallback;
};

export const exportToAnnotatedPdf = async (
    originalFile: File,
    annotations: BalloonAnnotation[],
    pageImages: string[], // Base64 images for fallback/image inputs
    balloonSizeMultiplier: number = 1.0,
    solvedPositions?: Map<string, { x: number; y: number }>,
    stamps: DrawingStamp[] = [],
    options: PdfDrawOptions = {}
): Promise<void> => {
    try {
        let pdfDoc: PDFDocument;

        if (originalFile.type === 'application/pdf') {
            const existingPdfBytes = await originalFile.arrayBuffer();
            pdfDoc = await PDFDocument.load(existingPdfBytes);
        } else {
            // For images, create a new PDF
            pdfDoc = await PDFDocument.create();
            for (const imageSrc of pageImages) {
                const page = pdfDoc.addPage();
                const imageBytes = await fetch(imageSrc).then(res => res.arrayBuffer());
                let embeddedImage;

                if (originalFile.type === 'image/png') {
                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                }

                const { width, height } = embeddedImage.scale(1);
                page.setSize(width, height);
                page.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            }
        }

        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const blue = rgb(0.14, 0.45, 0.92); // Matches blue-600
        const white = rgb(1, 1, 1);

        // Shared with the canvas, so what is written out matches what was on
        // screen. See computeBalloonSizePct.
        const globalBalloonSizePct =
            computeBalloonSizePct(annotations, balloonSizeMultiplier);


        // annotations.forEach(ann => {
        //     if (ann.pageIndex < pages.length) {
        //         const page = pages[ann.pageIndex];
        //         const { width, height } = page.getSize();
        //
        //         const calculatedBalloonDiameter = (globalBalloonSizePct / 100) * height;
        //         const balloonRadius = calculatedBalloonDiameter / 2;
        //
        //         const x = (ann.rect.x / 100) * width;
        //         const y = (1 - (ann.rect.y / 100)) * height;
        //         const w = (ann.rect.width / 100) * width;
        //         const h = (ann.rect.height / 100) * height;
        //
        //         page.drawRectangle({
        //             x: x,
        //             y: y - h,
        //             width: w,
        //             height: h,
        //             borderWidth: 0,
        //             opacity: 0,
        //         });
        //
        //         const balloonPos = solvedPositions?.get(ann.id);
        //         const balloonX = ((balloonPos?.x ?? ann.balloonX) / 100) * width;
        //         const balloonY = (1 - ((balloonPos?.y ?? ann.balloonY) / 100)) * height;
        //
        //         page.drawCircle({
        //             x: balloonX,
        //             y: balloonY,
        //             size: balloonRadius,
        //             borderColor: blue,
        //             borderWidth: 1,
        //             rotate: page.getRotation(),
        //         });
        //
        //         let fontSize = balloonRadius * 0.95;
        //         const text = formatBalloonNumber(ann);
        //         const maxAllowedWidth = balloonRadius * 1.5;
        //
        //         let textWidth = font.widthOfTextAtSize(text, fontSize);
        //
        //         if (textWidth > maxAllowedWidth) {
        //             fontSize = fontSize * (maxAllowedWidth / textWidth);
        //             textWidth = font.widthOfTextAtSize(text, fontSize);
        //         }
        //         page.drawText(text, {
        //             x: balloonX - (textWidth / 2),
        //             y: balloonY - (fontSize * 0.35),
        //             size: fontSize,
        //             font: font,
        //             color: blue,
        //             rotate: page.getRotation(),
        //         });
        //     }
        // });
        annotations.forEach(ann => {
            if (ann.pageIndex < pages.length) {
                const page = pages[ann.pageIndex];

                // 1. Get native dimensions and normalize rotation
                const { width: nativeWidth, height: nativeHeight } = page.getSize();
                const rotationAngle = (page.getRotation().angle % 360 + 360) % 360;

                // 2. Determine VISUAL dimensions based on rotation
                // If rotated 90 or 270, the visual width is the native height, and vice versa.
                const isRotated90or270 = (rotationAngle === 90 || rotationAngle === 270);
                const visualWidth = isRotated90or270 ? nativeHeight : nativeWidth;
                const visualHeight = isRotated90or270 ? nativeWidth : nativeHeight;

                // 3. Normalize input coordinates from UI space (0 to 1)
                const balloonPos = solvedPositions?.get(ann.id);
                const normX = (balloonPos?.x ?? ann.balloonX) / 100;
                const normY = (balloonPos?.y ?? ann.balloonY) / 100;

                // 4. Initialize native PDF target coordinates
                let balloonX = 0;
                let balloonY = 0;

                // 5. Translate coordinates using native bounds, mapped to visual percentages
                if (rotationAngle === 90) {
                    balloonX = normY * nativeWidth;
                    balloonY = normX * nativeHeight;
                } else if (rotationAngle === 180) {
                    balloonX = (1 - normX) * nativeWidth;
                    balloonY = normY * nativeHeight;
                } else if (rotationAngle === 270) {
                    balloonX = (1 - normY) * nativeWidth;
                    balloonY = (1 - normX) * nativeHeight;
                } else { // 0 degrees standard
                    balloonX = normX * nativeWidth;
                    balloonY = (1 - normY) * nativeHeight;
                }

                // The balloon's own style, as on the canvas.
                const style = options.styleOf?.(ann);
                const stroke = hexToRgb(style?.stroke, blue);
                const thickness = style?.pdfLineWidth ?? 1;
                const scale = style?.scale ?? 1;

                // 6. CRITICAL: Calculate balloon size relative to the VISUAL height!
                const calculatedBalloonDiameter = (globalBalloonSizePct / 100) * visualHeight * scale;
                const balloonRadius = calculatedBalloonDiameter / 2;

                // 6.5 Draw connector line
                const approxRadiusNorm = 0.45 * (globalBalloonSizePct / 100) * scale;

                const rxNorm = ann.rect.x / 100;
                const ryNorm = ann.rect.y / 100;
                const rwNorm = ann.rect.width / 100;
                const rhNorm = ann.rect.height / 100;

                const nearestXNorm = Math.max(rxNorm, Math.min(normX, rxNorm + rwNorm));
                const nearestYNorm = Math.max(ryNorm, Math.min(normY, ryNorm + rhNorm));

                const exNorm = nearestXNorm - normX;
                const eyNorm = nearestYNorm - normY;
                const eDistNorm = Math.sqrt(exNorm * exNorm + eyNorm * eyNorm);

                if (eDistNorm > approxRadiusNorm + 0.0001) {
                    const edx = exNorm / eDistNorm;
                    const edy = eyNorm / eDistNorm;
                    const startXNorm = normX + edx * approxRadiusNorm;
                    const startYNorm = normY + edy * approxRadiusNorm;

                    let pdfStartX = 0, pdfStartY = 0;
                    let pdfEndX = 0, pdfEndY = 0;

                    if (rotationAngle === 90) {
                        pdfStartX = startYNorm * nativeWidth;
                        pdfStartY = startXNorm * nativeHeight;
                        pdfEndX = nearestYNorm * nativeWidth;
                        pdfEndY = nearestXNorm * nativeHeight;
                    } else if (rotationAngle === 180) {
                        pdfStartX = (1 - startXNorm) * nativeWidth;
                        pdfStartY = startYNorm * nativeHeight;
                        pdfEndX = (1 - nearestXNorm) * nativeWidth;
                        pdfEndY = nearestYNorm * nativeHeight;
                    } else if (rotationAngle === 270) {
                        pdfStartX = (1 - startYNorm) * nativeWidth;
                        pdfStartY = (1 - startXNorm) * nativeHeight;
                        pdfEndX = (1 - nearestYNorm) * nativeWidth;
                        pdfEndY = (1 - nearestXNorm) * nativeHeight;
                    } else { // 0 degrees standard
                        pdfStartX = startXNorm * nativeWidth;
                        pdfStartY = (1 - startYNorm) * nativeHeight;
                        pdfEndX = nearestXNorm * nativeWidth;
                        pdfEndY = (1 - nearestYNorm) * nativeHeight;
                    }

                    page.drawLine({
                        start: { x: pdfStartX, y: pdfStartY },
                        end: { x: pdfEndX, y: pdfEndY },
                        thickness,
                        color: stroke,
                    });

                    // Arrowhead at the box end, worked out in PDF space so it
                    // points the right way on a rotated page too.
                    if (style?.arrow) {
                        const dx = pdfEndX - pdfStartX, dy = pdfEndY - pdfStartY;
                        const len = Math.hypot(dx, dy) || 1;
                        const ux = dx / len, uy = dy / len;
                        const head = Math.max(3, balloonRadius * 0.45);
                        for (const turn of [0.45, -0.45]) {
                            const cos = Math.cos(turn), sin = Math.sin(turn);
                            page.drawLine({
                                start: { x: pdfEndX, y: pdfEndY },
                                end: {
                                    x: pdfEndX - head * (ux * cos - uy * sin),
                                    y: pdfEndY - head * (ux * sin + uy * cos),
                                },
                                thickness, color: stroke,
                            });
                        }
                    }
                }

                // 7. Draw the outline. Star and triangle only on an unrotated
                // page, where the path's orientation is known; elsewhere a circle.
                const solid = style?.shape === 'solid';
                if ((style?.shape === 'triangle' || style?.shape === 'star') && rotationAngle === 0) {
                    const r = balloonRadius;
                    let path = '';
                    if (style.shape === 'triangle') {
                        path = `M 0 ${-r} L ${r * 1.02} ${r * 0.9} L ${-r * 1.02} ${r * 0.9} Z`;
                    } else {
                        const pts: string[] = [];
                        for (let i = 0; i < 10; i++) {
                            const rr = i % 2 ? r * 0.46 : r * 1.05;
                            const t = -Math.PI / 2 + (i * Math.PI) / 5;
                            pts.push(`${i ? 'L' : 'M'} ${(rr * Math.cos(t)).toFixed(2)} ${(rr * Math.sin(t)).toFixed(2)}`);
                        }
                        path = pts.join(' ') + ' Z';
                    }
                    page.drawSvgPath(path, {
                        x: balloonX, y: balloonY,
                        borderColor: stroke, borderWidth: thickness, color: rgb(1, 1, 1),
                    });
                } else {
                    page.drawCircle({
                        x: balloonX,
                        y: balloonY,
                        size: balloonRadius,
                        borderColor: stroke,
                        borderWidth: thickness,
                        ...(solid ? { color: stroke } : {}),
                    });
                }

                // 8. Font scaling based on corrected visual radius
                let fontSize = balloonRadius * 0.95;
                const text = formatBalloonNumber(ann);
                const maxAllowedWidth = balloonRadius * 1.5;

                let textWidth = font.widthOfTextAtSize(text, fontSize);
                if (textWidth > maxAllowedWidth) {
                    fontSize = fontSize * (maxAllowedWidth / textWidth);
                    textWidth = font.widthOfTextAtSize(text, fontSize);
                }

                // 9. Dynamic Text Offsetting based on text pivot alignments per rotation angle
                let textOffsetX = 0;
                let textOffsetY = 0;

                if (rotationAngle === 90) {
                    textOffsetX = fontSize * 0.35;
                    textOffsetY = -(textWidth / 2);
                } else if (rotationAngle === 180) {
                    textOffsetX = (textWidth / 2);
                    textOffsetY = fontSize * 0.35;
                } else if (rotationAngle === 270) {
                    textOffsetX = -fontSize * 0.35;
                    textOffsetY = (textWidth / 2);
                } else { // 0 degrees
                    textOffsetX = -(textWidth / 2);
                    textOffsetY = -(fontSize * 0.35);
                }

                // 10. Draw the text perfectly centered and oriented
                page.drawText(text, {
                    x: balloonX + textOffsetX,
                    y: balloonY + textOffsetY,
                    size: fontSize,
                    font: font,
                    color: style ? hexToRgb(style.text, blue) : blue,
                    rotate: page.getRotation(),
                });

                const suffix = options.suffixOf?.(ann);
                if (suffix && rotationAngle === 0) {
                    page.drawText(suffix, {
                        x: balloonX + balloonRadius + 2,
                        y: balloonY - fontSize * 0.35,
                        size: fontSize * 0.8,
                        font,
                        color: stroke,
                    });
                }
            }
        });

        // Draw stamps
        for (const stamp of stamps) {
            if (stamp.pageIndex < pages.length) {
                const page = pages[stamp.pageIndex];
                try {
                    const stampUrl = stamp.picture.startsWith('http') || stamp.picture.startsWith('/')
                        ? stamp.picture
                        : `/upload/${stamp.picture}`;
                    const imageBytes = await fetch(stampUrl).then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.arrayBuffer();
                    });

                    let embeddedStamp;
                    if (stamp.picture.toLowerCase().endsWith('.jpg') || stamp.picture.toLowerCase().endsWith('.jpeg')) {
                        embeddedStamp = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        try {
                            embeddedStamp = await pdfDoc.embedPng(imageBytes);
                        } catch (pngErr) {
                            embeddedStamp = await pdfDoc.embedJpg(imageBytes);
                        }
                    }

                    const { width: nativeWidth, height: nativeHeight } = page.getSize();
                    const rotationAngle = (page.getRotation().angle % 360 + 360) % 360;

                    const isRotated90or270 = (rotationAngle === 90 || rotationAngle === 270);
                    const visualWidth = isRotated90or270 ? nativeHeight : nativeWidth;
                    const visualHeight = isRotated90or270 ? nativeWidth : nativeHeight;

                    const normX = stamp.rect.x / 100;
                    const normY = stamp.rect.y / 100;
                    const normW = stamp.rect.width / 100;
                    const normH = stamp.rect.height / 100;

                    let pdfX = 0;
                    let pdfY = 0;
                    let pdfW = normW * visualWidth;
                    let pdfH = normH * visualHeight;

                    // drawImage rotates about (x, y), and (x, y) is where the image's own
                    // bottom-left corner lands — so anchor on the view-space bottom-left
                    // corner, mapped into native page space.
                    const anchorU = normX;
                    const anchorV = normY + normH;

                    if (rotationAngle === 90) {
                        pdfX = anchorV * nativeWidth;
                        pdfY = anchorU * nativeHeight;
                    } else if (rotationAngle === 180) {
                        pdfX = (1 - anchorU) * nativeWidth;
                        pdfY = anchorV * nativeHeight;
                    } else if (rotationAngle === 270) {
                        pdfX = (1 - anchorV) * nativeWidth;
                        pdfY = (1 - anchorU) * nativeHeight;
                    } else { // 0 degrees
                        pdfX = anchorU * nativeWidth;
                        pdfY = (1 - anchorV) * nativeHeight;
                    }

                    page.drawImage(embeddedStamp, {
                        x: pdfX,
                        y: pdfY,
                        width: pdfW,
                        height: pdfH,
                        rotate: page.getRotation()
                    });
                } catch (stampErr) {
                    console.error("Failed to embed stamp in PDF:", stamp.picture, stampErr);
                }
            }
        }

        const pdfBytes = await pdfDoc.save();

        // Trigger download
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Annotated_${originalFile.name.replace(/\.[^/.]+$/, "")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("PDF Export failed:", error);
        throw error;
    }
};

export function parseGdt(input, explicitUpper, explicitLower) {
    let text = input ? input.trim() : "";

    const result = {
        diameter: false,
        target: null,
        lsl: null,
        usl: null,
        datums: [],
        modifiers: [],
        fit: null
    };

    // ---------------------------------------------------------
    // 1. GLOBAL CLEANUP (Fixes Brackets & Y14.5M CAD Fonts)
    // ---------------------------------------------------------
    // Removes backticks, tildes, and brackets globally. 
    // Example: "{¿~|Ø~.`0`1`0`~|A~|B}" becomes "{¿|Ø.010|A|B}"
    // Example: "[2.79" becomes "2.79"
    text = text.replace(/[`~\[\]()]/g, "");

    // ---------------------------------------------------------
    // 2. FEATURE CONTROL FRAMES (Geometric Tolerances)
    // ---------------------------------------------------------
    if (text.startsWith("{") && text.includes("|")) {
        const parts = text.split("|");

        if (parts.length > 1) {
            if (parts[1].includes("Ø") || parts[1].includes("⌀")) result.diameter = true;

            // Extract the first valid decimal from the tolerance block (parts[1])
            const numMatch = parts[1].match(/(\d*\.?\d+)/);
            if (numMatch) {
                result.target = 0; // Perfect flatness/position is 0
                result.lsl = 0;
                result.usl = parseFloat(numMatch[1]);

                // Extract datums from remaining blocks
                for (let i = 2; i < parts.length; i++) {
                    const cleanDatum = parts[i].replace(/[^A-Z]/g, ""); // Keep only letters
                    if (cleanDatum) result.datums.push(cleanDatum);
                }
                return result; // Exit early!
            }
        }
    }

    // ---------------------------------------------------------
    // 3. DETECT BASIC SYMBOLS
    // ---------------------------------------------------------
    if (text.includes("⌀") || text.includes("Ø")) result.diameter = true;
    if (text.includes("Ⓜ") || text.includes("(M)")) result.modifiers.push("MMC");
    if (text.includes("Ⓛ") || text.includes("(L)")) result.modifiers.push("LMC");

    // ---------------------------------------------------------
    // 4. STRIP ATTACHED OCR SYMBOLS TO FIND THE BASE NUMBER
    // ---------------------------------------------------------
    // Replaces Counterbore, Countersink, Depth, Diameter, and Degrees with spaces
    let cleanText = text.replace(/[⌀Ø⌴⌵↓°]/g, " ");

    // If it starts with R (Radius) or M (Metric thread), remove the letter so the number is exposed
    cleanText = cleanText.replace(/\b[RM](?=\d)/, "");
    cleanText = cleanText.trim();

    // Aggressively match the FIRST valid standalone number in the cleaned text
    const firstNumMatch = cleanText.match(/-?\d*\.?\d+/);
    let baseNumber = firstNumMatch ? parseFloat(firstNumMatch[0]) : null;

    // ---------------------------------------------------------
    // 5. EXPLICIT TOLERANCES (From JSON/Backend)
    // ---------------------------------------------------------
    if (explicitUpper !== undefined || explicitLower !== undefined) {
        result.target = baseNumber;

        let uTol = parseFloat(explicitUpper || "0");
        let lTol = parseFloat(explicitLower || "0");

        // Handle negative string tolerances (e.g., lowerTol: "-.002")
        if (typeof explicitUpper === 'string' && explicitUpper.includes('-') && uTol > 0) uTol = -uTol;
        if (typeof explicitLower === 'string' && explicitLower.includes('-') && lTol > 0) lTol = -lTol;

        if (result.target !== null) {
            result.usl = result.target + uTol;
            result.lsl = (typeof explicitLower === 'string' && explicitLower.includes('-'))
                ? result.target + lTol
                : result.target - Math.abs(lTol);
        } else if (uTol > 0 && lTol > 0 && uTol !== lTol) {
            // Absolute limits placed into tolerance fields fallback
            result.usl = Math.max(uTol, lTol);
            result.lsl = Math.min(uTol, lTol);
            result.target = (result.usl + result.lsl) / 2;
        }
        return result;
    }

    // ---------------------------------------------------------
    // 6. INLINE ± OR + / - TOLERANCES
    // ---------------------------------------------------------
    let pm = cleanText.match(/(-?\d*\.?\d+)\s*±\s*(\d*\.?\d+)/);
    if (pm) {
        result.target = parseFloat(pm[1]);
        const tol = parseFloat(pm[2]);
        result.lsl = result.target - tol;
        result.usl = result.target + tol;
        return result;
    }

    let uni = cleanText.match(/(-?\d*\.?\d+)\s*\+(\d*\.?\d+)\s*\/\s*-(\d*\.?\d+)/);
    if (uni) {
        result.target = parseFloat(uni[1]);
        result.usl = result.target + parseFloat(uni[2]);
        result.lsl = result.target - parseFloat(uni[3]);
        return result;
    }

    // ---------------------------------------------------------
    // 7. LIMIT DIMENSIONS (e.g., 10.02 - 9.98)
    // ---------------------------------------------------------
    let limit = cleanText.match(/(?:^|\s)(-?\d*\.?\d+)\s*-\s*(-?\d*\.?\d+)(?:\s|$)/);
    if (limit) {
        const num1 = parseFloat(limit[1]);
        const num2 = parseFloat(limit[2]);

        // Prevent accidental matches with thread pitches like "M6X1.0-6H"
        if (num2 > 0) {
            result.usl = Math.max(num1, num2);
            result.lsl = Math.min(num1, num2);
            result.target = (result.usl + result.lsl) / 2;
            return result;
        }
    }

    // ---------------------------------------------------------
    // 8. FALLBACK
    // ---------------------------------------------------------
    // If no tolerances were found, assign the aggressively extracted base number
    result.target = baseNumber;

    return result;
}