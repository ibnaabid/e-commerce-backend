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
  // 🟢 GET: Fetch products with Category Filter & Search query
app.get("/products", async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = {};

    // 1. Category Filtering
    if (category && category.toLowerCase() !== "all") {
      const categoryRegex = new RegExp(`^${category.trim()}$`, "i"); // Case-insensitive exact match
      
      query.$or = [
        { categories: { $in: [categoryRegex] } }, // অ্যারে ফিল্ডের জন্য (যেমন: ["bamboo"])
        { category: categoryRegex }              // সাধারণ স্ট্রিং ফিল্ডের জন্য
      ];
    }

    // 2. Search Query (অপশনাল)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const searchFilter = {
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      };

      if (query.$or) {
        query = { $and: [query, searchFilter] };
      } else {
        query = searchFilter;
      }
    }

    const products = await productsCollection.find(query).toArray();
    res.status(200).send(products);

  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send({ message: "Failed to fetch products", error: err.message });
  }
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