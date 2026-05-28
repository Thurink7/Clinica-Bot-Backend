let readline = require("readline-sync");
let {MongoClient, ObjectId} = require("mongodb");

let username = "admin";
let password = "12345"; // Garanta que a senha do usuário 'admin' seja esta mesma
let cluster = "medbusca.0tjts1q"; // O segredo está aqui! Mude de 'Medup' para este.
let dbname = "Users";
let ColectionName = "Users";

const url ="mongodb://admin:12345@ac-ag1kqf8-shard-00-00.0tjts1q.mongodb.net:27017,ac-ag1kqf8-shard-00-01.0tjts1q.mongodb.net:27017,ac-ag1kqf8-shard-00-02.0tjts1q.mongodb.net:27017/?ssl=true&replicaSet=atlas-12tujq-shard-0&authSource=admin&appName=MedBusca"

const client = new MongoClient(url);

async function main() {

    try {

        await client.connect();
        console.log("Connected to MongoDB ");

        let db = client.db(dbname);
        let collection = db.collection(ColectionName);

    } catch (error   ) {
        console.error(error);
    } finally {
        await client.close();
    }
}
main().catch(console.error);