import { MongoClient } from "mongodb";
import config from './config.js'

const client = await MongoClient.connect(config.MONGODB_CONNECTION_STRING);
const db = client.db("db");
const collection = db.collection("board");

await collection.deleteMany()
console.log("삭제 성공");