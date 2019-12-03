// import dotenv from "dotenv";
// import { Db, MongoClient } from "mongodb";

// dotenv.config();
// const MONGODB_CONNECTION_STRING = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}${process.env.MONGO_PATH}`;

// const client = new MongoClient(MONGODB_CONNECTION_STRING);

// let _db;
// client.connect(err => {
//   if (err) {
//     console.log("err");
//     console.log(err);
//   } else {
//     const collection = client
//       .db("messaging-app-backend")
//       .collection("messages");

//     collection.insertOne(
//       {
//         author: "emma",
//         recipient: "sad cactus leaf",
//         msg: "hello world"
//       },
//       (err, res) => {
//         if (err) {
//           throw err;
//         }
//         console.log("document isnerted");
//       }
//     );

//     collection.find({}).toArray((err, result) => {
//       console.log("result");
//       console.log(result);
//     });
//     // perform actions on the collection objec
//     client.close();
//   }
// });

// const initDB = () => {
//   const client = new MongoClient(MONGODB_CONNECTION_STRING);
//   client.connect(err => {
//     if (err) { throw err; }
//     else {
//       _db = client.db("messaging-app-backend");
//     }
//   });
// };

// export { getDB, initDB };
