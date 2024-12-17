import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import process from "node:process";

await load({ export: true });
const apiKey = Deno.env.get("OPENAI_API_KEY");

const openai = new OpenAI({ apiKey });

//const input = "say hello to the worldss";
const input = "how do I make a compiler in Zig";
const maxSteps = 5;

const prompt =
  "Consider the following prompt if this is a simple prompt, such as a casual conversation, reply with the word 'skip'. \
only reply with the word skip, this is important to the program functioning correctly. If the prompt is more \
complicated, and is in need of reasoning, consider the best approach to the prompt. list out the steps\
to reason through this prompt. each step should be one simple sentence such as 'consider the usage of x', \
'think about implications of x', 'assess security risks in x', ect. the list should be a list of 1 to " +
  maxSteps +
  " steps.\
you shouldn't include numbering to prefix the steps, just list them as a list. \
consider the steps as a list which a chatbot will use to work iteratively to reason through the prompt. this means the \
steps should be limited to the capabilities of a GPT model with no other tools or resources. the goal is to help \
a chatbot come to a more accurate answer and include no other information. it is crucial to only reply with the word \
'skip' or the list of steps. Here is the prompt: " +
  input;

async function plan(introPrompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: introPrompt,
      },
    ],
  });
  return response.choices[0].message.content;
}

const response = await plan(prompt);

if (response === "skip") {
  console.log("No reasoning needed.");
  simpleResponse(input);
} else {
  console.log("Reasoning...");
  const steps = response?.split("\n") || [];
  reason(input, steps);
}

async function simpleResponse(prompt: string) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: true,
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

async function reason(prompt: string, steps: string[]) {
  let onGoingPrompt = prompt;
  console.log("Considering: ");
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(step);
    const newReason =
      "You are on step " +
      (i + 1) +
      " of " +
      steps.length +
      " in reasoning through this prompt, please keep the response shorter than 500 words. \
      be concise and to the point, do not include unnecessary information. \
      this is a single step in a reasoning process, so be focused and concise. \
      do not make lists, consider this the way a human would reason through the prompt. \
    the previous steps are: " +
      steps.slice(0, i).join("\n") +
      "\n\n" +
      "The current step is: " +
      step +
      "\n\n" +
      "The prompt is: " +
      onGoingPrompt;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: newReason }],
    });
    onGoingPrompt += response.choices[0].message.content;
  }

  const finalPrompt = input + "\n\n" + onGoingPrompt;
  console.log("Submitting final prompt... \n");
  simpleResponse(finalPrompt);
}
