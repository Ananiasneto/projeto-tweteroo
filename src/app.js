import express, { json } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import Joi from 'joi';

dotenv.config();
const app = express();
app.use(cors());
app.use(json());

const PORT = process.env.PORT || 5000;

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
const userSchema = Joi.object({
    username: Joi.string().required(),
    avatar: Joi.string().required(),
  });
const tweetSchema = Joi.object({
    username: Joi.string().required(),
    tweet: Joi.string().required(),
  });


mongoClient.connect()
  .then(() => {
    console.log("Conectado ao banco de dados");
    db = mongoClient.db(); 
  })
  .catch((err) => console.log(err.message));

app.post("/sign-up", async (req, res) => {
  const user = req.body;
  const { error } = userSchema.validate(user, { abortEarly: false });
  if (error) {
    return res.status(422).send({
      details: error.details.map((detail) => detail.message),
    });
  }
  try {
    await db.collection("users").insertOne(user);
    res.status(201).send("Usuário criado com sucesso");
  } catch (err) {
    console.log("Erro ao inserir usuário:", err.message);
    res.status(500).send("Erro no servidor");
  }
});
app.post("/tweets",async (req,res)=>{
    const tweet = req.body;
  const { error } = tweetSchema.validate(tweet, { abortEarly: false });
  if (error) {
    return res.status(422).send({
      details: error.details.map((detail) => detail.message),
    });
  }
  try {
    const usuarioLogado = await db.collection("users").findOne({ username: tweet.username });

    if (!usuarioLogado) {
      return res.status(401).send("Usuário não autorizado");
    }
    await db.collection("tweets").insertOne(tweet);
    res.status(201).send("Tweet criado com sucesso");
  } catch (err) {
    console.log("Erro ao inserir tweet:", err.message);
    res.status(500).send("Erro no servidor");
  }
});



app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

