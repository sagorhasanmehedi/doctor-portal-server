const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 7000;
var admin = require("firebase-admin");

app.use(cors());
app.use(express.json());
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sovrn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var serviceAccount = require("./doctors-portal-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function verifytoken(req, res, next) {
  if (req.headers.authorization.startsWith("Berar ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedtoken = await admin.auth().verifyIdToken(token);
      req.decodedemail = decodedtoken.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("DoctorPORTAL");
    const Appointmentcollection = database.collection("Appointmentcollection");
    const usercollection = database.collection("Usercollection");

    // post appointment
    app.post("/appointment", async (req, res) => {
      const result = await Appointmentcollection.insertOne(req.body);
      res.send(result);
    });

    // get appointment
    app.get("/appointments", async (req, res) => {
      const date = new Date(req.query.date).toLocaleDateString();

      const result = await Appointmentcollection.find({ date: date }).toArray();
      res.send(result);
    });

    // post user
    app.post("/user", async (req, res) => {
      const result = await usercollection.insertOne(req.body);
      console.log(result);
    });

    // put user
    app.put("/user", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usercollection.updateOne(filter, updateDoc, options);
    });

    // create admin
    app.put("/user/admin", verifytoken, async (req, res) => {
      if (req.decodedemail) {
        const Dresult = await usercollection.findOne({
          email: req.decodedemail,
        });
        if (Dresult.roll === "admin") {
          const filter = { email: req.body.email };
          const updateDoc = {
            $set: { roll: "admin" },
          };
          const result = await usercollection.updateOne(filter, updateDoc);
          res.send(result);

          console.log("new admin create by old admin");
        }
      } else {
        res.status(401).json({ message: "you are nao a valid user" });
      }
    });

    // chaking admin
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await usercollection.findOne(filter);
      let isadmin = false;
      if (result?.roll === "admin") {
        isadmin = true;
      }
      res.send(isadmin);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctors portal server runing");
});
app.listen(port, () => {
  console.log("doctor portal runing in port", port);
});
