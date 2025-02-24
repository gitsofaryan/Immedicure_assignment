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

    // Modified prompt to ensure JSON array response
    const prompt = `
      Act as a healthcare recommendation system for India. Based on the location: ${userLocation} 
      and symptoms: ${symptoms}, generate exactly 3 doctor recommendations.

      You must respond with ONLY a JSON array containing exactly 3 doctor recommendations.
      Do not include any explanatory text or markdown formatting.
      The response must start with '[' and end with ']'.
      
      Each doctor object must follow this exact format:
      {
        "name": "Full name with title (e.g., Dr. Rajesh Kumar)",
        "specialty": "Medical specialty",
        "address": "Complete address in ${userLocation}",
        "phone": "Contact number with +91 prefix",
        "rating": 4.5,
        "opening_hours": "Mon-Sat: 9:00 AM - 6:00 PM",
        "website": "http://example.com or null",
        "map_url": "https://goo.gl/maps/example",
        "notes": "Brief additional information"
      }

      Ensure the response is a valid JSON array containing exactly 3 such objects.
    `;

    const result = await model.generateContent(prompt);
    let response = result.response.text();
    
    // Clean the response to ensure valid JSON
    response = response.trim();
    
    // Remove any markdown code block syntax
    response = response.replace(/```json\n?|\n?```/g, '');
    
    // Ensure the response starts with [ and ends with ]
    const firstBracket = response.indexOf('[');
    const lastBracket = response.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1) {
      throw new Error("Response does not contain a valid JSON array");
    }
    
    // Extract just the JSON array
    response = response.slice(firstBracket, lastBracket + 1);

    // Parse and validate the response
    const doctorData = JSON.parse(response);

    if (!Array.isArray(doctorData) || doctorData.length !== 3) {
      throw new Error("Invalid number of recommendations");
    }

    // Validate each doctor object has required fields
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
