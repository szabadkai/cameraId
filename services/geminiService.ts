import { GoogleGenAI, Type } from "@google/genai";
import { CameraInfo, LensInfo } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const lensSchema = {
    type: Type.OBJECT,
    properties: {
        brand: { type: Type.STRING, description: "The brand name of the lens." },
        model: { type: Type.STRING, description: "The specific model name of the lens." },
        serialNumber: { type: Type.STRING, description: "The lens's serial number, if visible." },
        focalLength: { type: Type.STRING, description: "The focal length of the lens (e.g., '50mm', '24-70mm')." },
        aperture: { type: Type.STRING, description: "The maximum aperture of the lens (e.g., 'f/1.8', 'f/2.8-4')." },
        notes: { type: Type.STRING, description: "Any additional notes or observations about the lens." },
    },
};

const cameraSchema = {
    type: Type.OBJECT,
    properties: {
      brand: {
        type: Type.STRING,
        description: "The brand name of the camera body (e.g., 'Nikon', 'Canon')."
      },
      manufacturerUrl: {
        type: Type.STRING,
        description: "The official website URL or a relevant Wikipedia page for the camera's manufacturer."
      },
      model: {
        type: Type.STRING,
        description: "The specific model name or number of the camera body (e.g., 'F3', 'EOS 5D Mark IV')."
      },
      year: {
        type: Type.STRING,
        description: "The estimated year or range of manufacture for the camera body (e.g., '1980-1985')."
      },
      serialNumber: {
        type: Type.STRING,
        description: "The camera body's serial number, if visible or provided."
      },
      cameraType: {
        type: Type.STRING,
        description: "The type of camera (e.g., 'SLR', 'Rangefinder', 'TLR', 'Point-and-shoot')."
      },
      filmFormat: {
        type: Type.STRING,
        description: "The film format used by the camera (e.g., '35mm', '120', 'APS-C')."
      },
      notableFeatures: {
        type: Type.STRING,
        description: "A brief summary of key features or historical significance of the camera body."
      },
      notes: {
        type: Type.STRING,
        description: "Any additional notes, observations, or uncertainties about the identification."
      },
      references: {
        type: Type.ARRAY,
        description: "An array of relevant web links for the camera model.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The title of the web page (e.g., 'Nikon F3 - Wikipedia')."
            },
            url: {
              type: Type.STRING,
              description: "The full URL of the web page."
            }
          },
          required: ["title", "url"]
        }
      },
    },
    required: ["brand", "model", "year", "cameraType", "filmFormat", "notableFeatures"],
};

const gearSchema = {
    type: Type.OBJECT,
    properties: {
        camera: { ...cameraSchema, nullable: true, description: "Details of the camera body. Omit if not identifiable." },
        lens: { ...lensSchema, nullable: true, description: "Details of the attached lens. Omit if not identifiable." },
    }
};


export const identifyGear = async (
  base64Images: string[],
  currentInfo?: { camera?: Partial<CameraInfo>, lens?: Partial<LensInfo> }
): Promise<{ camera?: Omit<CameraInfo, 'id' | 'images'>, lens?: Omit<LensInfo, 'id' | 'images'> }> => {
  try {
    let prompt: string;
    const basePrompt = "You are an expert in vintage and modern photography equipment. Analyze the provided images to identify the camera body and any attached lens as two separate items. Provide details for the camera body in the `camera` object, and if a lens is attached and identifiable, provide details for the lens in the `lens` object. Do not confuse lens details with the camera body's details. Find a URL for the camera manufacturer and up to 3 relevant web references for the specific camera model. Return the information in the specified JSON format.";

    if (currentInfo && (currentInfo.camera || currentInfo.lens)) {
      const existingData = JSON.stringify(currentInfo, null, 2);
      prompt = `You are an expert in photography equipment. Based on the provided images and the following existing JSON data, please refine and expand the details. Pay special attention to the serial number to narrow down the manufacturing date. If any existing data seems incorrect based on the new images, correct it. \n\nExisting data: ${existingData}\n\n${basePrompt}`;
    } else {
      prompt = basePrompt;
    }

    const imageParts = base64Images.map(data => ({
      inlineData: { mimeType: 'image/jpeg', data }
    }));
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: gearSchema,
      },
    });

    const text = response.text.trim();
    const result = JSON.parse(text);

    const identified: { camera?: Omit<CameraInfo, 'id' | 'images'>, lens?: Omit<LensInfo, 'id' | 'images'> } = {};

    if (result.camera) {
        identified.camera = {
          brand: result.camera.brand || "Unknown",
          manufacturerUrl: result.camera.manufacturerUrl || undefined,
          model: result.camera.model || "Unknown",
          year: result.camera.year || "Unknown",
          serialNumber: result.camera.serialNumber || undefined,
          cameraType: result.camera.cameraType || "Unknown",
          filmFormat: result.camera.filmFormat || "Unknown",
          notableFeatures: result.camera.notableFeatures || "No notable features identified.",
          notes: result.camera.notes || undefined,
          references: result.camera.references || [],
        };
    }

    if (result.lens && Object.keys(result.lens).some(key => result.lens[key])) {
        identified.lens = result.lens;
    }

    return identified;

  } catch (error) {
    console.error("Error identifying gear:", error);
    throw new Error("Failed to identify gear from image. The model might not recognize this equipment.");
  }
};
