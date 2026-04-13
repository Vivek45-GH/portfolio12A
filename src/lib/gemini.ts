
export const geminiModel = "gemini-1.5-pro";

export async function generateChatResponse(message: string, history: { role: 'user' | 'model', text: string }[]) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}
