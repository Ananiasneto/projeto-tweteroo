import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
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

app.get("/tweets", async (req, res) => {
  try {
    const arrayTweets = await db.collection("tweets").find().toArray();

    const tweetsUsuario = {};
    
    arrayTweets.forEach((tweet) => {
      if (!tweetsUsuario[tweet.username]) {
        tweetsUsuario[tweet.username] = [];
      }
      tweetsUsuario[tweet.username].push(tweet);
    });

    const tweetsAvatar = await Promise.all(
      Object.keys(tweetsUsuario).map(async (username) => {
        const userTweets = tweetsUsuario[username];
        const ultimoTweet = userTweets[userTweets.length - 1];
       
        const user = await db.collection("users").findOne({ username });

        return {
          id: ultimoTweet._id, 
          username,
          avatar: user.avatar,
          tweet: ultimoTweet.tweet,
        
        };
      })
    );

    tweetsAvatar.sort((a, b) => b.id.getTimestamp() - a.id.getTimestamp());


    res.status(200).send(tweetsAvatar);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar tweets");
  }
});

app.put("/tweets/:id", async (req, res) => {
  const tweet = req.body;
  const tweetId = req.params.id; 

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
    const tweetExistente = await db.collection("tweets").findOne({ _id: new ObjectId(tweetId) });
    if (!tweetExistente) {
      return res.status(404).send("Tweet não encontrado");
    }

    const result = await db.collection("tweets").updateOne(
      { _id: new ObjectId(tweetId) }, 
      { $set: { tweet: tweet.tweet } } 
    );


    if (result.matchedCount === 0) {
      return res.status(404).send("Tweet não encontrado");
    }

    res.status(204).send("Tweet atualizado com sucesso");
  } catch (err) {
    res.status(500).send("Erro no servidor");
  }
});
app.delete("/tweets/:id", async (req, res) => {
  const tweetId = req.params.id;

  try {
    const tweetExistente = await db.collection("tweets").findOne({ _id: new ObjectId(tweetId) });
    if (!tweetExistente) {
      return res.status(404);
    }
    const result = await db.collection("tweets").deleteOne({ _id: new ObjectId(tweetId) });

    if (result.deletedCount === 0) {
      return res.status(404).send("Tweet não encontrado para exclusão");
    }

    res.status(204).send("Tweet excluído com sucesso");
  } catch (err) {
    console.error("Erro ao excluir tweet:", err.message);
    res.status(500).send("Erro no servidor");
  }
});




app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

