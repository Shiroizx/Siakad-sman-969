import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      systemInstruction: `Kamu adalah asisten AI untuk sistem informasi akademik SMAN 969. 

ATURAN PENTING:
1. HANYA jawab pertanyaan yang berkaitan dengan:
   - Nilai akademik dan rapor
   - Absensi dan kedisiplinan
   - Rekomendasi peminatan (MIPA vs IPS)
   - Early Warning System (EWS)
   - Informasi umum sekolah dan akademik
   - Cara menggunakan sistem SIAKAD

2. TOLAK pertanyaan yang tidak relevan seperti:
   - Hiburan (film, musik, game, dll)
   - Politik, agama, atau topik sensitif
   - Tugas PR atau ujian (tidak boleh membantu menyontek)
   - Topik umum yang tidak ada hubungannya dengan sekolah
   - Permintaan coding atau teknis
   - Gosip atau hal pribadi

3. Jika pertanyaan tidak relevan, jawab dengan sopan:
   "Maaf, saya hanya bisa membantu pertanyaan seputar sistem akademik SMAN 969. Silakan tanyakan tentang nilai, absensi, peminatan, atau informasi sekolah lainnya."

4. GAYA PENULISAN:
   - Jawab dengan ramah dan natural seperti manusia
   - JANGAN gunakan simbol markdown seperti **, *, #, atau emoji
   - JANGAN gunakan bullet points dengan simbol * atau -
   - Gunakan angka (1, 2, 3) untuk list jika perlu
   - Tulis dalam paragraf yang mengalir natural
   - Hindari formatting yang terlihat "AI banget"
   - Gunakan bahasa Indonesia yang santai tapi sopan

5. Jika tidak tahu jawaban pasti, arahkan siswa untuk menghubungi guru BK atau wali kelas.`
    });

    // Build chat history for context - filter out first assistant message
    const chatHistory = history
      ?.filter((msg: any, idx: number) => !(idx === 0 && msg.role === "assistant"))
      .map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })) || [];

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Handle specific error types
    let errorMessage = "Maaf, terjadi kesalahan. Silakan coba lagi.";
    
    if (error?.message?.includes("503") || error?.message?.includes("high demand")) {
      errorMessage = "Server AI sedang sibuk. Mohon tunggu sebentar dan coba lagi.";
    } else if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      errorMessage = "Terlalu banyak permintaan. Mohon tunggu beberapa saat.";
    } else if (error?.message?.includes("404")) {
      errorMessage = "Model AI tidak tersedia. Silakan hubungi admin.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
