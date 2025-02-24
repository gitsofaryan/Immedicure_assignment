import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { symptoms, userLocation } = await request.json();

    if (!symptoms || !userLocation) {
      return NextResponse.json({
        status: "error",
        message: "Missing symptoms or user location",
      }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Provide exactly 3 doctor recommendations for a patient in ${userLocation} with symptoms: ${symptoms}.
      
      Return ONLY a raw JSON array with exactly 3 doctor objects. No text before or after.
      DO NOT include any markdown, code blocks, or explanatory text.
      
      Required JSON format for each doctor:
      {
        "name": "Dr. Full Name",
        "specialty": "Medical specialty",
        "address": "Full address in ${userLocation}",
        "phone": "+91-XXXXXXXXXX",
        "rating": 4.5,
        "opening_hours": "Mon-Sat: 9:00 AM - 6:00 PM",
        "website": "http://example.com",
        "map_url": "https://goo.gl/maps/example",
        "notes": "Brief additional information"
      }
      
      The response must be parseable JSON starting with [ and ending with ].
    `;

    const result = await model.generateContent(prompt);
    let response = result.response.text();
    
    // More aggressive cleaning of the response
    response = response.trim()
      .replace(/```json\n?|\n?```/g, '')  // Remove code blocks
      .replace(/^(?![\[\{]).*$/gm, '')    // Remove any lines not starting with [ or {
      .replace(/\n/g, '')                 // Remove newlines
      .trim();
    
    // Ensure we have a JSON array
    if (!response.startsWith('[') || !response.endsWith(']')) {
      console.error('Invalid response format:', response);
      throw new Error("Invalid response format: Expected an array of recommendations");
    }

    // Parse the response
    const doctorData = JSON.parse(response);

    // Validate array and length
    if (!Array.isArray(doctorData) || doctorData.length !== 3) {
      throw new Error("Invalid number of recommendations");
    }

    // Validate required fields
    const requiredFields = ['name', 'specialty', 'address', 'phone', 'opening_hours'];
    const isValid = doctorData.every(doctor => 
      requiredFields.every(field => doctor[field] && typeof doctor[field] === 'string')
    );

    if (!isValid) {
      throw new Error("Missing required fields in doctor recommendations");
    }

    return NextResponse.json({
      status: "success",
      message: "Recommendations generated successfully",
      data: doctorData,
      disclaimer: "These are AI-generated recommendations for informational purposes only. Please verify all information independently."
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to generate recommendations",
      data: null,
      disclaimer: "Please try again or contact support if the issue persists."
    }, { status: 500 });
  }
}
