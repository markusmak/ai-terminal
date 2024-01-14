import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from 'langchain/tools';
import { pull } from "langchain/hub";
import { createOpenAIFunctionsAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import {
    ChatPromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate,
    AIMessagePromptTemplate,
    HumanMessagePromptTemplate,
  } from "@langchain/core/prompts";
  import {
    AIMessage,
    HumanMessage,
    SystemMessage,
  } from "@langchain/core/messages";
import os from 'os';
import {
    MessagesPlaceholder,
  } from "@langchain/core/prompts";
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


// const promptTemplate2 = PromptTemplate.fromTemplate(`
// You are my command line executor assistant. 
// Limit your response to the word 'completed' and assume that we are on {platform} operative system:

// {input_var}`
// );

const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", "You are very powerful assistant, but don't know current events"],
    ["human", `
    You are my command line executor assistant. 
    Limit your response to the word 'completed' and assume that we are on {platform} operative system:
    
    {input_var}`],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);
// const prompt = await promptTemplate.format({ 
//     platform: os.platform(), 
//     input: input 
// })

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
    console.log({result});
    line.close();
});

