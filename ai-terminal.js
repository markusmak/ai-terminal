// Todo: 
// 1. Adjust command to make it include action and explanation 
// 2. adjust command to allow for confirmation 
// 3. adjust as package to call instead of having to call function

import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from 'langchain/tools';
import { createOpenAIFunctionsAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import {
    ChatPromptTemplate,
  } from "@langchain/core/prompts";
  import {
    MessagesPlaceholder,
  } from "@langchain/core/prompts";
import os from 'os';
import readline from 'readline';
import { exec } from 'child_process';


const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo-0613", temperature: 0});

const SystemCommandTool = new DynamicTool({
    name: "system_cmd",
    description: "This tool's input is the command line instruction. The tool executes the command line instruction and outputs the results of the executed command.", // description instruct LLM on Tool's purpose
    func: async (query) => {
        console.debug( "System Command:", query)
        const code = await runCommand( query ) // exec command in target environment
        return `command executed: ${code ?? ''}`
    }
})

const runCommand = query => {
    exec(query, (error, stdout, stderr) => {
        if (error) {
        //   console.error(`exec error: ${error}`);
          return `Error executing command: ${error}`;
        }
        return (`stdout: ${stdout}`, `stderr: ${stderr}`);
      });
}

const tools = [ SystemCommandTool ]

// const promptTemplate = ChatPromptTemplate.fromTemplate(
//     `You are my command line executor assistant. Give the exact command line output stdout if there is output from command line using the System Command Tool. 
//     Take the query and execute the command line argument. Assume that we are on {platform} operative system. Query: {input_var}`
// )

const promptTemplate = ChatPromptTemplate.fromMessages(
    [
        ("system", "You are my command line executor assistant."),
        ("human", "Take the query and execute the command line argument. Assume that we are on {platform} operative system. Return strictly the output of the command line results using the Command System Tool. Do not add extra words. Query: {input_var}"),
        new MessagesPlaceholder("agent_scratchpad"),
    ]
)

const agent = await createOpenAIFunctionsAgent({tools: tools, llm: model, prompt: promptTemplate});

const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

const line = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
line.question('Please type in a command. \n', async (input) => {
    const result = await agentExecutor.invoke({
        platform: os.platform(),
        input_var: input
      });
    console.log(result.output);
    line.close();
});

