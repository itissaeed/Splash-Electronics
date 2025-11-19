const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// --- Public: Get products with pagination & search ---
const getProducts = async (req, res) => {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.pageNumber) || 1;

    const keyword = req.query.keyword
        ? { name: { $regex: req.query.keyword, $options: 'i' } }
        : {};

    const category = req.query.category
        ? { category: req.query.category }
        : {};

    const count = await Product.countDocuments({ ...keyword, ...category });
    const products = await Product.find({ ...keyword, ...category })
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize) });
};

// --- Public: Get single product by ID ---
const getProductById = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product); // return a single object
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// --- Admin: Get all products (no pagination) ---
const getAllProductsAdmin = async (req, res) => {
    const products = await Product.find({});
    res.json({ products }); // always return { products: [...] } for .map
};

// --- Admin: Create product ---
const createProduct = async (req, res) => {
    const product = new Product({
        name: 'Sample Name',
        price: 0,
        user: req.user._id,
        brand: 'Sample Brand',
        category: 'Sample Category',
        countInStock: 0,
        description: 'Sample Description',
        images: [],
        isFeatured: false,
    });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
};

// --- Admin: Update product ---
const updateProduct = async (req, res) => {
    const { name, price, description, images, brand, category, countInStock, isFeatured } = req.body;

    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = name || product.name;
        product.price = price || product.price;
        product.description = description || product.description;
        product.images = images || product.images;
        product.brand = brand || product.brand;
        product.category = category || product.category;
        product.countInStock = countInStock || product.countInStock;
        product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// --- Admin: Delete product ---
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await product.remove();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// --- Featured products ---
const getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ isFeatured: true }).limit(8);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch featured products' });
    }
};

// --- Image upload / delete (Cloudinary) remain unchanged ---
const uploadProductImage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const uploadFromBuffer = (buffer) =>
            new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'products' },
                    (error, result) => (result ? resolve(result) : reject(error))
                );
                streamifier.createReadStream(buffer).pipe(stream);
            });

        const result = await uploadFromBuffer(req.file.buffer);
        product.images.push({ url: result.secure_url, public_id: result.public_id });
        await product.save();

        res.status(201).json({ message: 'Image uploaded', image: result.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Image upload failed' });
    }
};

const deleteProductImage = async (req, res) => {
    const { public_id } = req.body;
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        await cloudinary.uploader.destroy(public_id);
        product.images = product.images.filter(img => img.public_id !== public_id);
        await product.save();

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete image' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    getAllProductsAdmin,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    deleteProductImage,
    getFeaturedProducts,
};
