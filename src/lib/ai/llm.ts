export const groundedSearch = async (prompt: string) => {
  try {
    const response = await fetch('http://localhost:5173/api/grounding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      return null;
    }

    return data as { text: string, grounding: any };
  } catch (error: any) {
    return null;
  }
};

export const flashSearch = async (prompt: string, schema: any) => {
  try {
    const response = await fetch('http://localhost:5173/api/flash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, schema }),
    });

    const data = await response.json();

    if (!response.ok) {
      return null;
    }

    return JSON.parse(data.text);
  } catch (error: any) {
    return null;
  }
};

export const getEmbedding = async (prompt: string) => {
  try {
    const response = await fetch('http://localhost:5173/api/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
      return null;
    }

    return data.embedding[0].values;
  } catch (error: any) {
    return null;
  }
};
