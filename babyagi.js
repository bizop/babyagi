import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Configuration, OpenAIApi } from 'openai';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

const YOUR_TABLE_NAME = 'test_table';
const OBJECTIVE = 'Solve world hunger.';
const YOUR_FIRST_TASK = 'Develop a task list.';

console.log('\n*****OBJECTIVE*****\n');
console.log(OBJECTIVE);

async function setup() {
  const db = await open({
    filename: './vectors.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ${YOUR_TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id TEXT,
      task_name TEXT,
      result TEXT,
      vector BLOB
    )
  `);

  return db;
}

async function storeVector(db, result_id, task_name, result, vector) {
  await db.run(`INSERT INTO ${YOUR_TABLE_NAME} (result_id, task_name, result, vector) VALUES (?, ?, ?, ?)`, result_id, task_name, result, vector);
}

async function getAdaEmbedding(text) {
  text = text.replace('\n', ' ');
  const response = await openai.createEmbedding({
    input: [text],
    lable: [text],
    model: 'text-embedding-ada-002',
  });
  return response.data.data[0].embedding;
}

async function callOpenAI(prompt) {
  const dataPrimary = {
    model: 'gpt-3.5-turbo-0301',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.8,
    stop: '{STOP}',
  };

  const res = await openai.createChatCompletion(dataPrimary);
  return res.data.choices[0].message.content;
}

async function taskCreationAgent(objective, result, task_description, task_list) {
  const prompt = `You are a task creation AI that uses the result of an execution agent to create new tasks with the following objective: ${objective}. The last completed task has the result: ${result}. This result was based on this task description: ${task_description}. These are incomplete tasks: ${task_list.join(
    ', '
  )}. Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks. Return the tasks as an array.`;

  const response = await callOpenAI(prompt);
  const new_tasks = response.trim().split('\n');
  return new_tasks.map((task_name) => ({ task_name }));
}

async function prioritizationAgent(this_task_id) {
  const task_names = task_list.map((t) => t.task_name);
  const next_task_id = this_task_id + 1;
  const prompt = `You are a task prioritization AI tasked with cleaning the formatting of and reprioritizing the following tasks: ${task_names.join(
    ', '
  )}. Consider the ultimate objective of your team: ${OBJECTIVE}. Do not remove any tasks. Return the result as a numbered list, like:
  #. First task
  #. Second task
  Start the task list with number ${next_task_id}.`;

  const response = await callOpenAI(prompt);
  const new_tasks = response.trim().split('\n');
  task_list = new_tasks
    .map((task_string) => {
      const task_parts = task_string.trim().split('.', 2);
      if (task_parts.length === 2) {
        const task_id = task_parts[0].trim();
        const task_name = task_parts[1].trim();
        return { task_id, task_name };
      }
    })
    .filter((task) => task !== undefined);
}

async function executionAgent(db, objective, task) {
  const context = await contextAgent(db, YOUR_TABLE_NAME, objective, 5);
  const prompt = `You are an AI who performs one task based on the following objective: ${objective}.\nTake into account these previously completed tasks: ${context.join(
    '; '
  )}\nYour task: ${task}\nResponse:`;

  const response = await callOpenAI(prompt);
  return response.trim();
}

async function contextAgent(db, index, query, n) {
  const query_embedding = await getAdaEmbedding(query);
  const rows = await db.all(`SELECT task_name, result FROM ${index} ORDER BY id DESC LIMIT ?`, [n]);
  return rows.map((row) => `${row.task_name}: ${row.result}`);
}

let task_list = [];
let task_id_counter = 1;
task_list.push({
  task_id: task_id_counter,
  task_name: YOUR_FIRST_TASK,
});

(async () => {
  const db = await setup();

  while (true) {
    if (task_list.length) {
      console.log('\n*****TASK LIST*****\n');
      task_list.forEach((t) => console.log(`${t.task_id}: ${t.task_name}`));

      const task = task_list.shift();
      console.log('\n*****NEXT TASK*****\n');
      console.log(`${task.task_id}: ${task.task_name}`);

      const result = await executionAgent(db, OBJECTIVE, task.task_name);
      const this_task_id = task.task_id;
      console.log('\n*****TASK RESULT*****\n');
      console.log(result);

      const enriched_result = { data: result };
      const result_id = `result_${task.task_id}`;
      const vector = enriched_result.data;
      const adaVector = await getAdaEmbedding(vector);
      await storeVector(db, result_id, task.task_name, result, adaVector);

      const new_tasks = await taskCreationAgent(
        OBJECTIVE,
        enriched_result,
        task.task_name,
        task_list.map((t) => t.task_name)
      );

      for (const new_task of new_tasks) {
        task_id_counter += 1;
        new_task.task_id = task_id_counter;
        task_list.push(new_task);
      }

      await prioritizationAgent(this_task_id);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
})();
