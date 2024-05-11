import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import moment from "moment";
import { MongoClient, ObjectId } from "mongodb";
import config from "./config.js";
import { hashSync, compareSync } from "bcrypt";

const client = await MongoClient.connect(config.MONGODB_CONNECTION_STRING);
const db = client.db("db");
const collection = db.collection("board");

const app = express();
app.use(bodyParser.json());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
  })
);

app.get("/select", async (req, res) => {
  res.json(await collection.find().toArray());
});

app.get("/select/:id", async (req, res) => {
  if (!req.params.id) {
    res.status(400).json("error");
  } else {
    let isError = false;
    try {
      new ObjectId(req.params.id);
    } catch (error) {
      isError = true;
      res.status(400).json("error");
    }
    if (!isError) {
      const object = await collection.findOne({
        _id: new ObjectId(req.params.id),
      });
      if (!object) res.status(400).json("error");
      else {
        res.json(object);
      }
    }
  }
});

app.post("/insert", async (req, res) => {
  const insertQuery = await collection.insertOne({
    author: req.body.author,
    password: hashSync(req.body.password, 10),
    title: req.body.title,
    content: req.body.content,
    date: moment().format("YYYY-MM-DD HH:mm:ss"),
    comments: [],
  });
  res.json(insertQuery.insertedId);
});

app.post("/update", async (req, res) => {
  if (!req.body.ObjectId || !req.body.password) res.status(400).json("error");
  else {
    let prev;
    let isError = false;
    try {
      prev = await collection.findOne({
        _id: new ObjectId(req.body.ObjectId),
      });
    } catch (error) {
      res.status(400).json("error");
      isError = true;
    }
    if (!isError) {
      if (!prev) res.status(400).json("error");
      else {
        if (compareSync(req.body.password, prev.password)) {
          await collection.updateOne(
            { _id: prev._id },
            {
              $set: { title: req.body.title, content: req.body.content },
            }
          );
          res.json("updated");
        } else {
          res.status(400).json("password-error");
        }
      }
    }
  }
});

app.post("/delete", async (req, res) => {
  let prev;
  let isError = false;
  try {
    prev = await collection.findOne({
      _id: new ObjectId(req.body.ObjectId),
    });
  } catch (error) {
    isError = true;
    res.status(400).json("error");
  }
  if (!isError) {
    if (!req.body.password) {
      res.json("error");
    } else {
      if (!prev) {
        res.status(400).json("error");
      } else {
        if (compareSync(req.body.password, prev.password)) {
          collection.deleteOne(prev);
          res.json("deleted");
        } else {
          res.status(400).json("password-error");
        }
      }
    }
  }
});

app.post("/comment", async (req, res) => {
  if (!req.body.ObjectId || !req.body.content) res.json("error");
  else {
    let objectId;
    let isError = false;
    try {
      objectId = new ObjectId(req.body.ObjectId);
    } catch (error) {
      isError = true;
      res.json("error");
    }
    if (!isError) {
      const post = await collection.findOne({
        _id: new ObjectId(req.body.ObjectId),
      });
      if (!post) res.json("error");
      else {
        await collection.updateOne(post, {
          $set: {
            comments: post.comments.concat({
              author: req.body.author,
              content: req.body.content,
              date: moment().format("YYYY-MM-DD HH:mm:ss")
            }),
          },
        });
        res.json("commented");
      }
    }
  }
});

app.listen(config.PORT, config.HOST, () => {
  console.log(`${config.PORT}에서 실행 중`);
});
