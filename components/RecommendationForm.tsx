// components/RecommendationForm.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DoctorRecommendation {
  name: string;
  specialty: string;
  address: string;
  phone: string;
  rating: number;
  opening_hours: string;
  website: string | null;
  map_iframe: string;
  additional_notes?: string;
}

export function RecommendationForm() {
  const [symptoms, setSymptoms] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [recommendations, setRecommendations] = useState<DoctorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, userLocation }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: Something went wrong`);
      }

      const data = await response.json();

      if (data.recommendation && Array.isArray(data.recommendation)) {
        setRecommendations(data.recommendation);
      } else {
        throw new Error("Invalid response format: Expected an array of recommendations");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      {/* <Image src="../components/doc.png" alt="Doctor" width={100} height={100} /> */}
      <Card className="mb-8 bg-blue-950 text-white text-yellow-500">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Doctor Recommendation System</CardTitle>
          <CardDescription className="mt-2 text-lg text-yellow-500">
            Tell us your symptoms and location, and we&apos;ll recommend the best doctors near you.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 ">
            <Textarea
              placeholder="Describe your symptoms..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[120px] resize-none bg-white text-blue-950"
            />
            <div>
              <label className="block mb-1 font-medium">Your Location (City/Area):</label>
              <input
                type="text"
                placeholder="e.g., Mumbai"
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 bg-white text-blue-950"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading} className="border border-yellow-500 px-6 py-2 bg-yellow-500 text-blue-950 hover:bg-blue-950 hover:text-yellow-500">
              {loading ? "Loading Recommendations..." : "Get Recommendations"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-8 bg-red-50 border border-red-200">
          <CardContent>
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Display Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Recommended Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            {recommendations.map((doc, index) => (
              <Card key={index} className="shadow-md bg-blue-950 text-white">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-yellow-500">{doc.name}</CardTitle>
                  <p className="text-sm text-yellow-600">{doc.specialty}</p>
                </CardHeader>
                <CardContent>
                  <p>
                    <strong className="text-yellow-500">Address:</strong> {doc.address}
                  </p>
                  <p>
                    <strong className="text-yellow-500">Phone:</strong> {doc.phone}
                  </p>
                  <p>
                    <strong className="text-yellow-500">Rating:</strong> {doc.rating} / 5
                  </p>
                  <p>
                    <strong className="text-yellow-500">Opening Hours:</strong> {doc.opening_hours}
                  </p>
                  {doc.website && (
                    <p>
                      <strong className="text-yellow-500">Website:</strong>{" "}
                      <a
                        href={doc.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {doc.website}
                      </a>
                    </p>
                  )}
                  {doc.additional_notes && (
                    <p className="mt-2 text-white">
                      <strong className="text-yellow-500">Notes:</strong> {doc.additional_notes}
                    </p>
                  )}
                </CardContent>
                {doc.map_iframe && (
                  <CardContent className="p-2">
                    <div className="w-full h-64 overflow-hidden border rounded-md">
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: doc.map_iframe }}
                      />
                    </div>
                  </CardContent>
                )}
                <CardFooter className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-6 p-2 mb-2">
                  <Button className="border border-yellow-500 px-4 py-2 sm:px-6 sm:py-2 bg-yellow-500 text-blue-950 hover:bg-blue-950 hover:text-yellow-500">
                    Book Appointment
                  </Button>
                  <Button className="border border-yellow-500 px-4 py-2 sm:px-6 sm:py-2 bg-yellow-500 text-blue-950 hover:bg-blue-950 hover:text-yellow-500">
                    Call Now
                  </Button>
                  <Button className="border border-yellow-500 px-4 py-2 sm:px-6 sm:py-2 bg-yellow-500 text-blue-950 hover:bg-blue-950 hover:text-yellow-500">
                    View Profile
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
