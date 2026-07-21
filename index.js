const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");

        const db = client.db("E-Commerce");
        const productsCollection = db.collection("products");
        const userCollection = db.collection("user")  
        
         // ← Correct name

        //  get all user

        app.get("/user", async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

         app.delete("/user/:id", async (req, res) => {
  const id = req.params.id;

  const result = await userCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});



        // Get All Products
        app.get("/products", async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        });

        // Get Single Product
        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // Add Product
        app.post("/products", async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        // Update Product
        app.patch("/products/:id", async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const result = await productsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: product }
            );
            res.send(result);
        });

        // ==================== FIXED DELETE ROUTE ====================
        app.delete("/products/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ 
                        message: "Invalid Product ID format", 
                        deletedCount: 0 
                    });
                }

                const query = { _id: new ObjectId(id) };
                const result = await productsCollection.deleteOne(query);   // ← Fixed here

                if (result.deletedCount === 0) {
                    return res.status(404).json({ 
                        message: "Product not found", 
                        deletedCount: 0 
                    });
                }

                res.status(200).json(result);
            } catch (error) {
                console.error("Delete Error:", error);
                res.status(500).json({ 
                    message: "Server Error", 
                    error: error.message 
                });
            }
        });
        // ===========================================================

        // Home Route
        app.get("/", (req, res) => {
            res.send("🌱 Eco World Server Running...");
        });

        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB Ping Successful");

    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`🚀 Server Running on Port ${port}`);
});