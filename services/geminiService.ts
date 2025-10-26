import { GoogleGenAI, Type } from "@google/genai";
import { CameraInfo } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cameraIdSchema = {
    type: Type.OBJECT,
    properties: {
      brand: {
        type: Type.STRING,
        description: "The brand name of the camera (e.g., 'Nikon', 'Canon')."
      },
      manufacturerUrl: {
        type: Type.STRING,
        description: "The official website URL or a relevant Wikipedia page for the camera's manufacturer."
      },
      model: {
        type: Type.STRING,
        description: "The specific model name or number of the camera (e.g., 'F3', 'EOS 5D Mark IV')."
      },
      year: {
        type: Type.STRING,
        description: "The estimated year or range of manufacture (e.g., '1980-1985')."
      },
      serialNumber: {
        type: Type.STRING,
        description: "The camera's serial number, if visible or provided."
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
        description: "A brief summary of key features or historical significance (e.g., 'First camera with autofocus', 'Titanium shutter')."
      },
      notes: {
        type: Type.STRING,
        description: "Any additional notes, observations, or uncertainties about the identification."
      },
      references: {
        type: Type.ARRAY,
        description: "An array of relevant web links for the camera.",
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
      }
    },
    required: ["brand", "model", "year", "cameraType", "filmFormat", "notableFeatures"],
};

export const identifyCamera = async (
  base64Images: string[],
  currentInfo?: Partial<Omit<CameraInfo, 'images'>>
): Promise<Omit<CameraInfo, 'images'>> => {
  try {
    let prompt: string;
    if (currentInfo && Object.keys(currentInfo).length > 0) {
      const existingData = Object.entries(currentInfo)
        .filter(([, value]) => value && typeof value !== 'object')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      prompt = `You are an expert in photography equipment. Based on the provided images and the following existing data (${existingData}), please refine and expand the camera's details. Pay special attention to the serial number to narrow down the manufacturing date. Provide more detailed notable features and notes. Find a URL for the manufacturer (official site or Wikipedia). Also find and include up to 3 relevant web references for the specific camera model (e.g., Wikipedia, reputable review sites like kenrockwell.com, or community pages like lomography.com). If any existing data seems incorrect based on the images, correct it. Return the complete, updated information in the specified JSON format.`;
    } else {
      prompt = `You are an expert in vintage and modern photography equipment. Analyze the provided images of a camera. Identify the camera's brand, model, approximate year of manufacture, serial number (if visible), camera type, film format, and any notable features. Find a URL for the manufacturer (official site or Wikipedia). Also find and include up to 3 relevant web references for the specific model (e.g., Wikipedia, reputable review sites like kenrockwell.com, or community pages like lomography.com). Return the information in the specified JSON format.`;
    }

    const imageParts = base64Images.map(data => ({
      inlineData: { mimeType: 'image/jpeg', data }
    }));
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: cameraIdSchema,
      },
    });

    const text = response.text.trim();
    const result = JSON.parse(text);

    return {
      brand: result.brand || "Unknown",
      manufacturerUrl: result.manufacturerUrl || undefined,
      model: result.model || "Unknown",
      year: result.year || "Unknown",
      serialNumber: result.serialNumber || undefined,
      cameraType: result.cameraType || "Unknown",
      filmFormat: result.filmFormat || "Unknown",
      notableFeatures: result.notableFeatures || "No notable features identified.",
      notes: result.notes || "No additional notes.",
      references: result.references || [],
    };

  } catch (error) {
    console.error("Error identifying camera:", error);
    throw new Error("Failed to identify camera from image. The model might not recognize this equipment.");
  }
};