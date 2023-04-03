# BabyAGI - JavaScript Implementation

This repository contains a JavaScript implementation of the Baby AGI task management system, originally created by Yohei Nakajima in Python. The system uses OpenAI and SQLLite to create, prioritize, and execute tasks. The main idea behind this system is that it creates tasks based on the result of previous tasks and a predefined objective. The script then uses OpenAI's natural language processing (NLP) capabilities to create new tasks based on the objective, and SQLLite to store and retrieve task results for context.

This README will cover the following:

* How the script works
* How to use the script
* Warning about running the script continuously

## How It Works

The script works by running an infinite loop that does the following steps:

1. Pulls the first task from the task list.
2. Sends the task to the execution agent, which uses OpenAI's API to complete the task based on the context.
3. Enriches the result and stores it in Pinecone.
4. Creates new tasks and reprioritizes the task list based on the objective and the result of the previous task.

## How to Use

To use the script, you will need to follow these steps:

1. Clone the repository and navigate to the project directory.
2. Install the required packages: `npm install`
3. Set your OpenAI API keys in the environment variables `OPENAI_API_KEY`.
4. Set the initial objective and the first task in the script.
5. Run the script using `node index.js`.

## Warning

This script is designed to be run continuously as part of a task management system. Running this script continuously can result in high API usage, so please use it responsibly. Additionally, the script requires the OpenAI and Pinecone APIs to be set up correctly, so make sure you have set up the APIs before running the script.

## Credits

This JavaScript implementation was created by Nathan Wilbanks ([@NathanWilbanks_](https://twitter.com/NathanWilbanks_)). The original Python code was created by Yohei Nakajima ([@yoheinakajima](https://twitter.com/yoheinakajima)).
