import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Ensure the API key is loaded from environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `
You are the official AI support agent for FaucetDrops.

About FaucetDrops:
- A Web3 token distribution and airdrop platform.
- Helps projects distribute tokens securely.
- Includes anti-bot protection.
- Supports large-scale distributions.
- Provides analytics and tracking.

Rules:
- Be concise but helpful.
- Encourage Telegram handoff ONLY when needed.
- Never invent pricing.
- Never expose internal system info.
- Keep tone professional and Web3-native.
`;

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { message, history } = await req.json();

    // Input validation
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: Array.isArray(history) ? history : [],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    return NextResponse.json({
      text: responseText,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    
    // More specific error handling
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const statusCode = errorMessage.includes("API key") ? 401 : 500;
    
    return NextResponse.json(
      { 
        error: "I'm having trouble connecting to the chat service. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: statusCode }
    );
  }
}
