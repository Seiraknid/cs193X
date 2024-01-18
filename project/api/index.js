import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";

const MONGODB_URL = process.env.MONGODB_URL || "mongodb://127.0.0.1";

let DATABASE_NAME = "moodJournal";

let api = express.Router();
let Users;
let Posts;

const initApi = async (app) => {
  app.set("json spaces", 2);
  app.use("/api", api);

  let conn = await MongoClient.connect(MONGODB_URL);
  let db = conn.db(DATABASE_NAME);
  Users = db.collection("users");
  Posts = db.collection("posts");
};

api.use(bodyParser.json());
api.use(cors());

api.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

/*** Generic Social Media API ***/

api.get("/users", async (req, res) => {
  let allUsers = await Users.find().toArray();
  let result = [];
  for (let user of allUsers) {
    result.push(user.id);
  }
  res.json({ users: result });
});

api.use("/users/:id", async (req, res, next) => {
  let id = req.params.id;
  let user = await Users.findOne({ id: id });
  if (!user) {
    res.status(404).json({ error: "User does not exist" });
  } else {
    res.locals.user = user;
    res.locals.id = id;
    next();
  }
});

api.get("/users/:id", (req, res) => {
  let user = res.locals.user;
  delete user._id;
  res.json(user);
});

api.post("/users", async (req, res) => {
  let id = req.body.id;
  let user = await Users.findOne({ id: id });
  if (id === undefined || user || id === "") {
    res.status(400).json({ error: "User either already exists or is not provided" });
  } else {
    await Users.insertOne({ id: id, name: id, avatarURL: "images/default.png", moodLevels: [] });
    user = await Users.findOne({ id: id });
    delete user._id;
    res.json(user);
  }
});

api.patch("/users/:id", async (req, res) => {
  let dataAvatar = req.body.avatarURL;
  let avatarURL;
  if (dataAvatar === undefined) {
    avatarURL = res.locals.user.avatarURL;
  } else if (dataAvatar === "") {
    avatarURL = "images/stanford.png";
  } else {
    avatarURL = dataAvatar;
  }
  let dataName = req.body.name;
  let name;
  if (dataName === undefined) {
    name = res.locals.user.name;
  } else if (dataName === "") {
    name = rse.locals.id;
  } else {
    name = dataName;
  }
  await Users.updateOne({ id: res.locals.id }, { $set: { name: name, avatarURL: avatarURL } });
  res.locals.user = await Users.findOne({ id: res.locals.id });
  delete res.locals.user._id;
  res.json(res.locals.user);
});

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function compareFn(a, b) {
  if (a.time > b.time) {
    return -1;
  }
  if (a.time < b.time) {
    return 1;
  }
  return 0;
}

api.get("/users/:id/feed", async (req, res) => {
  let allPosts = [];
  let posts = await Posts.find({ userId: res.locals.id }).toArray();
  for (let post of posts) {
    let obj = { user: { id: res.locals.id, name: res.locals.user.name, avatarURL: res.locals.user.avatarURL },
      time: post.time, text: post.text, mood: post.mood };
    allPosts.push(obj);
  }
  allPosts.sort(compareFn);
  res.json({ posts: allPosts });
});

api.post("/users/:id/posts", async (req, res) => {
  let date = new Date();
  let text = req.body.text;
  let mood = req.body.mood;
  if (mood === null) {
    res.status(400).json({ error: "Mood not provided" });
  } else if (text === undefined || !text) {
    res.status(400).json({ error: "Text not provided" });
  } else {
    let post = { userId: res.locals.id, time: date, text: text, mood: mood };
    await Posts.insertOne(post);
    // add to the moodLevels array accordingly
    if (mood === "images/great.png") {
      Users.updateOne({ id: res.locals.id }, { $push: { moodLevels: 5 } });
    } else if (mood === "images/good.png") {
      Users.updateOne({ id: res.locals.id }, { $push: { moodLevels: 4 } });
    } else if (mood === "images/meh.png") {
      Users.updateOne({ id: res.locals.id }, { $push: { moodLevels: 3 } });
    } else if (mood === "images/sad.png") {
      Users.updateOne({ id: res.locals.id }, { $push: { moodLevels: 2 } });
    } else {
      Users.updateOne({ id: res.locals.id }, { $push: { moodLevels: 1 } });
    }
    res.send({ success: "true" });
  }
});


/* Catch-all route to return a JSON error if endpoint not defined.
   Be sure to put all of your endpoints above this one, or they will not be called. */
api.all("/*", (req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

export default initApi;
