const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// @desc    Get all products with pagination and search
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

// @desc    Get product by ID
const getProductsById = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
};

// @desc    Create a new product
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
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
};

// @desc    Update a product
const updateProduct = async (req, res) => {
    const { name, price, description, images, brand, category, countInStock } = req.body;

    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = name || product.name;
        product.price = price || product.price;
        product.description = description || product.description;
        product.images = images || product.images;
        product.brand = brand || product.brand;
        product.category = category || product.category;
        product.countInStock = countInStock || product.countInStock;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
};

// @desc    Delete a product
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await product.remove();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
};

// @desc    Upload product image to Cloudinary
const uploadProductImage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const uploadFromBuffer = (buffer) =>
            new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'products' },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(buffer).pipe(stream);
            });

        const result = await uploadFromBuffer(req.file.buffer);

        // Save URL and public_id in product images array
        product.images.push({ url: result.secure_url, public_id: result.public_id });
        await product.save();

        res.status(201).json({ message: 'Image uploaded', image: result.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Image upload failed' });
    }
};

// @desc    Delete product image from Cloudinary
const deleteProductImage = async (req, res) => {
    const { public_id } = req.body; // send public_id in request
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(public_id);

        // Remove from product.images array
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
    getProductsById,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    deleteProductImage,
};
