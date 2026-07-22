const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000; // Variable Name

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

// async function run() {
//   try {
    // Connect the client to the server
     client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("E-Commerce");
    const productsCollection = db.collection("products");
    const userCollection = db.collection("user");
    const cartsCollection = db.collection("carts");
    const wishlistCollection = db.collection("favorite");
    const reviewsCollection = db.collection("reviews");

    // ==========================================
    // ⭐ CUSTOMER REVIEWS ROUTES
    // ==========================================
    app.post("/reviews", async (req, res) => {
      try {
        const { productId, userEmail, userName, userImage, rating, comment } = req.body;

        if (!userEmail) {
          return res.status(400).send({ message: "User Email is required" });
        }

        if (!rating || rating < 1 || rating > 5) {
          return res.status(400).send({ message: "Rating must be between 1 and 5" });
        }

        if (!comment || comment.trim() === "") {
          return res.status(400).send({ message: "Comment cannot be empty" });
        }

        const newReview = {
          productId: productId || "general-site-review",
          userEmail,
          userName: userName || "Anonymous User",
          userImage: userImage || "",
          rating: Number(rating),
          comment: comment.trim(),
          createdAt: new Date(),
        };

        const result = await reviewsCollection.insertOne(newReview);
        res.status(201).send({ message: "Review added successfully", result });
      } catch (err) {
        res.status(500).send({ message: "Failed to post review", error: err.message });
      }
    });

    app.get("/reviews", async (req, res) => {
      try {
        const reviews = await reviewsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).send(reviews);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch reviews", error: err.message });
      }
    });

    // ==========================================
    // ⭐ WISHLIST ROUTES
    // ==========================================
    app.post("/wishlist", async (req, res) => {
      try {
        const { productId, name, price, image, userEmail } = req.body;

        if (!userEmail || !productId) {
          return res.status(400).send({ message: "User email and Product ID are required" });
        }

        const existingItem = await wishlistCollection.findOne({ productId, userEmail });

        if (existingItem) {
          await wishlistCollection.deleteOne({ _id: existingItem._id });
          return res.send({ isFavorite: false, message: "Removed from favorites" });
        } else {
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

    app.delete("/wishlist/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID" });
        }

        const result = await wishlistCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to delete wishlist item", error: err.message });
      }
    });

    // ==========================================
    // ⭐ USER ROUTES
    // ==========================================
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ==========================================
    // ⭐ PRODUCTS ROUTES
    // ==========================================
    app.get("/products", async (req, res) => {
      try {
        const { category, search } = req.query;
        let query = {};

        if (category && category.toLowerCase() !== "all") {
          const categoryRegex = new RegExp(`^${category.trim()}$`, "i");
          query.$or = [
            { categories: { $in: [categoryRegex] } },
            { category: categoryRegex },
          ];
        }

        if (search) {
          const searchRegex = new RegExp(search, "i");
          const searchFilter = {
            $or: [{ name: searchRegex }, { description: searchRegex }],
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

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: product }
      );
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            message: "Invalid Product ID format",
            deletedCount: 0,
          });
        }

        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            message: "Product not found",
            deletedCount: 0,
          });
        }

        res.status(200).json(result);
      } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
      }
    });

    // ==========================================
    // ⭐ CART ROUTES
    // ==========================================
    app.post("/cart", async (req, res) => {
      try {
        const item = req.body;

        if (!item?.userEmail) {
          return res.status(400).send({ message: "User email is required to add items" });
        }

        if (!item?.productId) {
          return res.status(400).send({ message: "Product ID is required" });
        }

        const price = Number(item.price) || 0;

        const existingItem = await cartsCollection.findOne({
          productId: item.productId,
          userEmail: item.userEmail,
        });

        if (existingItem) {
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

    app.get("/cart", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email || email === "undefined" || email === "null") {
          return res.send([]);
        }

        const cartItems = await cartsCollection.find({ userEmail: email }).toArray();
        res.send(cartItems);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch cart", error: err.message });
      }
    });

    app.delete("/cart/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Cart ID" });
        }

        const result = await cartsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to delete item", error: err.message });
      }
    });
  // } catch (err) {
  //   console.error("MongoDB Connection Error:", err);
  // }


// run().catch(console.dir);

// Root Route
app.get("/", (req, res) => {
  res.send("🌱 Eco World Server Running...");
});

// App Listen
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;