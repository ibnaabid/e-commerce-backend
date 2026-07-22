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
        
const cartsCollection = db.collection("carts");
const wishlistCollection = db.collection("favorite")
        
         // ← Correct name

        //  alll wishlist 
        // ==========================================
// 💖 WISHLIST / FAVORITE ROUTES
// ==========================================

// 1. Toggle Wishlist (Add or Remove)
app.post("/wishlist", async (req, res) => {
  try {
    const { productId, name, price, image, userEmail } = req.body;

    if (!userEmail || !productId) {
      return res.status(400).send({ message: "User email and Product ID are required" });
    }

    // চেক করা হচ্ছে আগে থেকে উইশলিস্টে আছে কিনা
    const existingItem = await wishlistCollection.findOne({ productId, userEmail });

    if (existingItem) {
      // থাকলে রিমুভ করে দেবে
      await wishlistCollection.deleteOne({ _id: existingItem._id });
      return res.send({ isFavorite: false, message: "Removed from favorites" });
    } else {
      // না থাকলে নতুন যুক্ত করবে
      const newWishlistItem = {
        productId,
        name,
        price,
        image,
        userEmail,
        createdAt: new Date(),
      };
      await wishlistCollection.insertOne(newWishlistItem);
      return res.status(201).send({ isFavorite: true, message: "Added to favorites" });
    }
  } catch (err) {
    res.status(500).send({ message: "Failed to update wishlist", error: err.message });
  }
});

// 2. Check Favorite Status for Single Product
app.get("/wishlist/check", async (req, res) => {
  try {
    const { email, productId } = req.query;

    if (!email || !productId) {
      return res.send({ isFavorite: false });
    }

    const existingItem = await wishlistCollection.findOne({ productId, userEmail: email });
    res.send({ isFavorite: !!existingItem });
  } catch (err) {
    res.status(500).send({ message: "Failed to check status", error: err.message });
  }
});

// 3. Get All Favorite Items by User Email (For Wishlist Page)
app.get("/wishlist", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email || email === "undefined" || email === "null") {
      return res.send([]);
    }

    const wishlistItems = await wishlistCollection.find({ userEmail: email }).toArray();
    res.send(wishlistItems);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch wishlist", error: err.message });
  }
});

// 4. Delete Item from Wishlist by Mongo ID
app.delete("/wishlist/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { ObjectId } = require("mongodb");

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID" });
    }

    const result = await wishlistCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to delete wishlist item", error: err.message });
  }
});

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


        // add to cart btn 

// 🟢 1. Add item to cart
// 1. Add / Update Cart Item
app.post("/cart", async (req, res) => {
  try {
    const item = req.body; // { productId, name, price, image, userEmail, quantity, totalPrice }

    // Validación Check
    if (!item?.userEmail) {
      return res.status(400).send({ message: "User email is required to add items" });
    }

    if (!item?.productId) {
      return res.status(400).send({ message: "Product ID is required" });
    }

    const price = Number(item.price) || 0;

    // চেক করা হচ্ছে আইটেমটি আগে থেকেই এই ইউজারের কার্টে আছে কিনা
    const existingItem = await cartsCollection.findOne({
      productId: item.productId,
      userEmail: item.userEmail,
    });

    if (existingItem) {
      // আগের Quantity এবং New Quantity যোগ করা
      const updatedQuantity = (existingItem.quantity || 1) + 1;
      const updatedTotalPrice = price * updatedQuantity;

      const result = await cartsCollection.updateOne(
        { _id: existingItem._id },
        {
          $set: {
            quantity: updatedQuantity,
            totalPrice: updatedTotalPrice,
            updatedAt: new Date(),
          },
        }
      );
      return res.send(result);
    }

    // নতুন আইটেম সেভ করার ফিল্ডস
    const newItem = {
      productId: item.productId,
      name: item.name,
      price: price,
      quantity: 1,
      totalPrice: price * 1,
      image: item.image || "",
      userEmail: item.userEmail,
      createdAt: new Date(),
    };

    const result = await cartsCollection.insertOne(newItem);
    res.status(201).send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to add to cart", error: err.message });
  }
});

// 2. Get Cart Items by User Email
app.get("/cart", async (req, res) => {
  try {
    const email = req.query.email;

    // ইমেইল না পাঠালে ফাঁকা অ্যারেই (Empty Array) রিটার্ন করবে, এরর মারবে না
    if (!email || email === "undefined" || email === "null") {
      return res.send([]); 
    }

    const cartItems = await cartsCollection.find({ userEmail: email }).toArray();
    res.send(cartItems);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch cart", error: err.message });
  }
});

// 3. Delete Item from Cart
app.delete("/cart/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { ObjectId } = require("mongodb");

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid Cart ID" });
    }

    const result = await cartsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to delete item", error: err.message });
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