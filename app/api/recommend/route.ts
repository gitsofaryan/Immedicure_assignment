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
      As a healthcare recommendation system for India, provide 3 detailed doctor recommendations near ${userLocation} for these symptoms: ${symptoms}.
      
      Return a JSON array of doctors with this structure:
      {
        "name": "Doctor's name and specialty",
        "specialty": "Primary specialty",
        "address": "Full address in India",
        "phone": "Phone with country code",
        "rating": "Number 1-5",
        "opening_hours": "Business hours",
        "website": "URL or null",
        "map_url": "Google Maps URL",
        "notes": "Additional information"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    const doctorData = JSON.parse(jsonMatch[0]);

    // Basic validation
    const isValidData = Array.isArray(doctorData) && 
      doctorData.every(doctor => 
        doctor.name && 
        doctor.specialty && 
        doctor.address && 
        doctor.phone
      );

    if (!isValidData) {
      throw new Error("Invalid doctor data structure");
    }

    return NextResponse.json({
      status: "success",
      message: "Recommendations generated successfully",
      data: doctorData,
      disclaimer: "These are AI-generated recommendations for informational purposes only. Please verify all information independently."
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";
    
    return NextResponse.json({
      status: "error",
      message,
      data: null,
      disclaimer: "Please try again or contact support if the issue persists."
    }, { status: 500 });
  }
}
