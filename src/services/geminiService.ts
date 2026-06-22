import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedCampaign {
  offerId: string;
  offerName: string;
  sourceData: string;
  targetMix: string;
  listDateRange: string;
  dataType: string;
  category: string;
  revenue: number;
  length: number;
  createdDate: string; // YYYY-MM-DD
}

export async function extractCampaignsFromImage(base64Image: string): Promise<ExtractedCampaign[]> {
  const prompt = `
    Extract data from this spreadsheet screenshot.
    STRICT COLUMN MAPPING IS REQUIRED:
    - "Offer ID" / "ID" -> offerId
    - "Offer Name" / "Name" -> offerName
    - "Source" / "From" / "Panel Origin" -> sourceData
    - "List" / "Target" / "To" / "List Name" -> targetMix
    - "List Date" / "Date Range" (format: 01 => 12 / 2025) -> listDateRange
    - "Type" / "Data Type" (MUST BE: Open, Click, or Unsub) -> dataType
    - "Vertical" / "Category" -> category
    - "Rev" / "Revenue" / "Profit" -> revenue
    - "Vol" / "Sent" / "Length" -> length
    - "Date" / "Created Date" -> createdDate (format: YYYY-MM-DD)

    If the column header matches exactly, prioritize that data.
    Ensure "Data Type" is strictly mapped to "Open", "Click", or "Unsub".
    Revenue and Length must be numbers.

    If a value is missing, provide a logical default or empty string.
    Ensure numeric values for revenue and length.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/png",
      data: base64Image.split(',')[1] || base64Image,
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            offerId: { type: Type.STRING },
            offerName: { type: Type.STRING },
            sourceData: { type: Type.STRING },
            targetMix: { type: Type.STRING },
            listDateRange: { type: Type.STRING },
            dataType: { type: Type.STRING },
            category: { type: Type.STRING },
            revenue: { type: Type.NUMBER },
            length: { type: Type.NUMBER },
            createdDate: { type: Type.STRING },
          },
          required: ["offerId", "targetMix", "createdDate"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}
