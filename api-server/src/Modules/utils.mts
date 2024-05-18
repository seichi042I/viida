import OpenAI from 'openai'
export const function_calling_tools: OpenAI.ChatCompletionTool[] = [
    // セリフから名前を検知して更新する関数
    {
        "type": "function",
        "function": {
            "name": "updateCharacterName",
            "description": `Functions that change common nouns to proper nouns by carefully reading the conversation history.\n\nExample:\ninput:'少女「私の名前はアリス。あなたの名前は？」\n user「俺はセツナ。柏崎セツナだ。よろしく」\n'output: {'少女':'アリス', 'user':'セツナ'}`,
            "parameters": {
                "type": "object",
                "properties": {
                    "updateNames": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "prior_name": { "type": "string", "description": "Name before update" },
                                "modified_name": { "type": "string", "discription": "Name after update" }
                            }
                        }
                    },
                },
                "required": ["updateNames"],
            },
        }
    },
    //googleカレンダーからイベントを取得する関数
    {
        "type": "function",
        "function": {
            "name": "getCalendarEvents",
            "description": "Function to fetch events within a specified period",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeMin": {
                        "type": "string",
                        "description": "the start time of the period for retrieving calendar events. It is ISOString format. Time zone is should be Tokyo, Japan.",
                    },
                    "timeMax": {
                        "type": "string",
                        "description": "the end time of the period for retrieving calendar events It is ISOString format. Time zone is should be Tokyo, Japan.",
                    },
                },
                "required": ["timeMin", "timeMax"],
            },
        }
    }
];
// export const function_calling_tools: OpenAI.ChatCompletionTool[] = [
//     // セリフから名前を検知して更新する関数
//     {
//         "type": "function",
//         "function": {
//             "name": "updateCharacterName",
//             "description": `Functions that change common nouns to proper nouns by carefully reading the conversation history.\n\nExample:\ninput:'少女「私の名前はアリス。あなたの名前は？」\n user「俺はセツナ。柏崎セツナだ。よろしく」\n'output: {'少女':'アリス', 'user':'セツナ'}`,
//             "parameters": {
//                 "type": "object",
//                 "properties": {
//                     "updateNames": {
//                         "type": "array",
//                         "items": {
//                             "type": "object",
//                             "properties": {
//                                 "prior_name": { "type": "string", "description": "Name before update" },
//                                 "modified_name": { "type": "string", "discription": "Name after update" }
//                             }
//                         }
//                     },
//                 },
//                 "required": ["updateNames"],
//             },
//         }
//     },
//     //googleカレンダーからイベントを取得する関数
//     {
//         "type": "function",
//         "function": {
//             "name": "getCalendarEvents",
//             "description": "Function to fetch events within a specified period",
//             "parameters": {
//                 "type": "object",
//                 "properties": {
//                     "timeMin": {
//                         "type": "string",
//                         "description": "the start time of the period for retrieving calendar events. It is ISOString format. Time zone is should be Tokyo, Japan.",
//                     },
//                     "timeMax": {
//                         "type": "string",
//                         "description": "the end time of the period for retrieving calendar events It is ISOString format. Time zone is should be Tokyo, Japan.",
//                     },
//                 },
//                 "required": ["timeMin", "timeMax"],
//             },
//         }
//     }
// ];