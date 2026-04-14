
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      } else {
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text);
      throw new Error('Server returned non-JSON response. The server might be restarting or misconfigured.');
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
