import express from 'express';
import { config } from 'dotenv';
import { BASE_PROMPT, getSystemPrompt } from './prompts';
import { basePrompt as nodeBasePrompt } from './defaults/node';
import { basePrompt as reactBasePrompt } from './defaults/react';
import Groq from 'groq-sdk';
import cors from "cors";

config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/template', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Return either node or react based on what you think this project should be. Only return a single word: either "node" or "react". Do not return anything extra.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
    });

    const answer = response.choices[0]?.message?.content?.trim().toLowerCase() ?? '';

    if (answer === 'react') {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
    } else if (answer === 'node') {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
    } else {
      res.status(400).json({ message: 'Unexpected response from the model.' });
    }
  } catch (error) {
    console.error('Error generating completion:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});




app.post('/chat', async (req, res) => {
  const messages = req.body.messages;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...messages
      ],
      max_tokens: 8000,
    });
    console.log(response);

    res.json({
      response: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error generating chat response:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
