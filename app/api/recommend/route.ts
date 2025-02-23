// app/api/recommend/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure your Gemini API key is in .env as GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    // Extract data from the request
    const { symptoms, userLocation } = await request.json();

    if (!symptoms || !userLocation) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing symptoms or user location in the request.",
          recommendation: null,
          debug: {},
          user_feedback: {
            disclaimer:
              "Please provide both symptoms and your location for doctor recommendations.",
            next_steps:
              "Ensure your request includes 'symptoms' and 'userLocation' fields.",
          },
        },
        { status: 400 }
      );
    }

    // Get your model instance
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Build the prompt with explicit instructions
    const prompt = `
      You are a healthcare professional recommendation system specializing in India.
      The user is located near: ${userLocation}.
      Based on the following symptoms: ${symptoms}, provide **at least 3 detailed recommendations** for doctors in India near the user's location.

      **IMPORTANT: You MUST return ONLY a VALID JSON array of doctor objects. Do NOT include ANY extra text, explanations, markdown formatting, code blocks, backticks, or any delimiters around the JSON. It MUST be plain, valid JSON that can be directly parsed.**

      Each doctor recommendation should be a JSON object with the following structure:
      {
        "name": "Doctor's name and specialty",
        "specialty": "Doctor's primary specialty",
        "address": "Full address in India",
        "phone": "Phone number with country code",
        "rating": A number between 1 and 5 (use 4.0-5.0 if unsure),
        "opening_hours": "Detailed opening hours (e.g., 'Mon-Fri 9:00 AM - 5:00 PM, Sat 10:00 AM - 2:00 PM')",
        "website": "Full URL of the doctor's website, or null if not available",
        "map_iframe": "An embeddable Google Maps iFrame code showing a standard map view (not Street View) of the doctor's location in India, with a prominent red marker pinpointing the doctor's address. The map should be zoomed appropriately to clearly show the location and surrounding streets. If you cannot guarantee a doctor-specific marked location with a standard map view, then provide a valid, generic Google Maps iframe for a prominent landmark or hospital in or near: ${userLocation} that is a standard map view with a red marker at that landmark.",
        "additional_notes": "Any extra information, like sub-specialties, languages spoken, or patient reviews (briefly)."
      }

      Example Output:
      [
        {
          "name": "Dr. Rajesh Sharma, Cardiologist",
          "specialty": "Cardiology",
          "address": "123 Medical Road, Jabalpur, MP, India",
          "phone": "+919876543210",
          "rating": 4.8,
          "opening_hours": "Mon-Fri 10:00 AM - 6:00 PM, Sat 10:00 AM - 2:00 PM",
          "website": "http://www.rajeshsharmacardiology.com",
          "map_iframe": "<iframe src='https://www.google.com/maps/embed?...'></iframe>",
          "additional_notes": "Specializes in interventional cardiology, speaks Hindi and English."
        },
        {
          "name": "Dr. Priya Patel, General Physician",
          "specialty": "General Medicine",
          "address": "456 Hospital Lane, Bhopal, MP, India",
          "phone": "+919988776655",
          "rating": 4.6,
          "opening_hours": "Mon-Sat 9:00 AM - 7:00 PM",
          "website": null,
          "map_iframe": "<iframe src='https://www.google.com/maps/embed?...'></iframe>",
          "additional_notes": "Focuses on preventative care and diabetes management."
        },
        {
          "name": "Dr. Vikram Singh, Pediatrician",
          "specialty": "Pediatrics",
          "address": "789 Child Care Clinic, Indore, MP, India",
          "phone": "+919765432109",
          "rating": 4.9,
          "opening_hours": "Mon-Fri 10:00 AM - 8:00 PM",
          "website": "http://www.vikramsinghpediatrics.com",
          "map_iframe": "<iframe src='https://www.google.com/maps/embed?...'></iframe>",
          "additional_notes": "Expert in childhood vaccinations and nutrition."
        }
      ]
    `;

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const geminiResponse = await result.response;
    let text = geminiResponse.text();
    console.log("Gemini Raw Response Text:", text);

    // Remove potential code block markers (```) or backticks
    const codeBlockRegex = /^\s*`{3}(?:json)?\s*([\s\S]*?)`{3}\s*$/i;
    const match = text.match(codeBlockRegex);
    if (match) {
      text = match[1].trim();
      console.log("Removed code block markers (regex fix).");
    } else if (text.startsWith("`") && text.endsWith("`")) {
      text = text.substring(1, text.length - 1).trim();
      console.log("Removed single backticks (fallback regex fix).");
    }

    // Fallback: if the text doesn't start with a JSON array, try extracting it with regex
    if (!text.trim().startsWith("[")) {
      const arrayMatch = text.match(/(\[[\s\S]*\])/);
      if (arrayMatch) {
        text = arrayMatch[1].trim();
        console.log("Extracted JSON array using fallback regex.");
      }
    }

    // Parse the JSON response
    let doctorData;
    try {
      doctorData = JSON.parse(text);
      if (!Array.isArray(doctorData)) {
        throw new Error("Response is not a JSON array as expected.");
      }
    } catch (error) {
      const parseError: Error = error instanceof Error ? error : new Error("An unknown error occurred");
      console.error("Error parsing JSON from Gemini:", parseError);
      console.error("Raw Gemini response text causing parse error:", text);
      return NextResponse.json(
        {
          status: "error",
          message:
            "Failed to parse doctor recommendations from AI. The AI might have returned an unexpected format (possibly not a JSON array or with invalid JSON structure).",
          recommendation: null,
          debug: {
            gemini_raw_response: text,
            parse_error: parseError.message,
          },
          user_feedback: {
            disclaimer:
              "We encountered an issue understanding the AI's response. It seems the AI might not be returning valid JSON. Please try again or check your input.",
            next_steps:
              "If the problem persists, consider simplifying your symptoms description or contacting support, mentioning potential issues with JSON formatting.",
          },
        },
        { status: 500 }
      );
    }

    // Enhanced validation: Validate each doctor object and clean up the iFrame code
    const validationResults = doctorData.map((doctor, index) => {
      const expectedKeys = [
        "name",
        "specialty",
        "address",
        "phone",
        "rating",
        "opening_hours",
        "website",
        "map_iframe",
        "additional_notes",
      ];
      const receivedKeys = Object.keys(doctor);
      const missingKeys = expectedKeys.filter((key) => !receivedKeys.includes(key));
      let iframeValid = false;
      let iframeTestMessage = "Initial iframe validation pending";
      let markerDetected = false;
      let streetViewDetected = false;
      const iframeCode = doctor.map_iframe;
      let cleanedIframeCode = iframeCode;

      console.log(`\nDoctor ${index}: Initial iframeCode:\n`, iframeCode);

      if (typeof iframeCode === "string") {
        cleanedIframeCode = iframeCode.trim();
        console.log(`Doctor ${index}: After trim():\n`, cleanedIframeCode);

        // Remove any trailing extraneous quotes
        if (cleanedIframeCode.endsWith('"')) {
          cleanedIframeCode = cleanedIframeCode.slice(0, -1);
          console.warn(`Doctor ${index}: Removed trailing quote at the VERY END.`);
          console.log(`Doctor ${index}: After trailing quote removal:\n`, cleanedIframeCode);
        }

        // Append missing closing tag if necessary
        if (!cleanedIframeCode.endsWith("</iframe>")) {
          cleanedIframeCode += "</iframe>";
          console.warn(`Doctor ${index}: Appended missing </iframe> tag.`);
          console.log(`Doctor ${index}: After appending </iframe>:\n`, cleanedIframeCode);
        }
        doctor.map_iframe = cleanedIframeCode;

        // Validate the iFrame structure and parameters
        if (cleanedIframeCode.startsWith("<iframe src='https://www.google.com/maps/embed")) {
          iframeValid = true;
          iframeTestMessage = "Basic iframe structure detected (after cleanup).";
          if (cleanedIframeCode.includes("&markers=") || cleanedIframeCode.includes("&q=")) {
            markerDetected = true;
            iframeTestMessage += " - Marker parameters detected.";
          } else {
            markerDetected = false;
            iframeTestMessage += " - No marker parameters found.";
          }
          if (cleanedIframeCode.includes("layer=streetview") || cleanedIframeCode.includes("cbll=")) {
            streetViewDetected = true;
            iframeTestMessage += " - Street View parameters detected!";
          } else {
            streetViewDetected = false;
            iframeTestMessage += " - No Street View parameters detected.";
          }
        } else {
          iframeValid = false;
          iframeTestMessage =
            "iFrame code does not start with expected '<iframe src='https://www.google.com/maps/embed' (even after cleanup)";
        }
      } else {
        iframeValid = false;
        iframeTestMessage = "iFrame code is not a string.";
      }

      return {
        doctor_index: index,
        missing_keys: missingKeys,
        iframe_valid: iframeValid,
        iframe_validation_message: iframeTestMessage,
        iframe_marker_detected: markerDetected,
        iframe_street_view_detected: streetViewDetected,
      };
    });

    const hasValidationErrors = validationResults.some(
      (result) => result.missing_keys.length > 0 || !result.iframe_valid
    );

    if (hasValidationErrors) {
      console.error("Validation errors found in doctor recommendations:", validationResults);
      console.error("Parsed JSON:", doctorData);
      return NextResponse.json(
        {
          status: "warning",
          message:
            "Doctor recommendations generated, but with validation issues. Some information might be missing or incorrect, especially map iframes might be broken.",
          recommendation: doctorData,
          debug: {
            gemini_raw_response: text,
            validation_results: validationResults,
            parsed_json: doctorData,
          },
          user_feedback: {
            disclaimer:
              "The doctor recommendations are generated by AI and might contain inaccuracies or incomplete information, especially map locations may not work correctly. Please carefully review each recommendation and verify the information before making decisions.",
            next_steps:
              "Please carefully review each doctor's information, especially map locations. If maps are broken, please use addresses to search manually. Validation issues were detected—see debug info for details.",
          },
        },
        { status: 200 }
      );
    }

    // Return the successful JSON response with detailed recommendations
    return NextResponse.json({
      status: "success",
      message: "Doctor recommendations generated successfully.",
      recommendation: doctorData,
      debug: {
        gemini_raw_response: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
        prompt_used: prompt.substring(0, 500) + (prompt.length > 500 ? "..." : ""),
        validation_results: validationResults,
      },
      user_feedback: {
        disclaimer:
          "These are AI-generated doctor recommendations for informational purposes only and should not replace professional medical advice. Always consult with a qualified healthcare provider for diagnosis and treatment. Please verify all information, especially map accuracy.",
        next_steps:
          "Please verify the doctor information for each recommendation, including map locations and accuracy. Consider reading reviews from other sources, and schedule appointments through their websites or phones.",
      },
    });
  } catch (error) {
    console.error("Error during Gemini API call:", error);
    let errorMessage = "An error occurred while processing your request and communicating with the AI service.";
    let errorStack = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack || "";
    }

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
        recommendation: null,
        debug: {
          error_details: errorMessage,
          error_stack: errorStack,
        },
        user_feedback: {
          disclaimer: "There was a problem processing your request. Please try again later.",
          next_steps:
            "If the issue persists, please contact support and provide details of the symptoms and location you entered.",
        },
      },
      { status: 500 }
    );
  }
}
